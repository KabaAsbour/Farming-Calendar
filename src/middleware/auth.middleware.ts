import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth.service.ts';
import { UserRole } from '../types/organization.ts';
import { logAuditEvent } from '../services/audit.service.ts';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// In-memory sliding window rate limiter for auth endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(maxRequests = 30, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again in 1 minute.',
        }
      });
    }

    record.count++;
    next();
  };
}

/**
 * Authentication middleware: verifies JWT Bearer token
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required (Bearer token missing)',
      }
    });
  }

  const token = authHeader.substring(7);
  try {
    const payload = AuthService.verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid, expired, or tampered authentication token',
      }
    });
  }
}

/**
 * Role-Based Access Control: checks if caller has one of the allowed roles
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    // Platform Owner has access, but access is recorded in audit logs
    if (req.user.isPlatformOwner) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Audit log the authorization failure
      await logAuditEvent({
        organizationId: req.user.organizationId,
        userId: req.user.userId,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        targetEntity: 'API_ENDPOINT',
        targetEntityId: req.path,
        ipAddress: req.ip,
        details: { requiredRoles: allowedRoles, currentRole: req.user.role }
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Action requires one of: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
        }
      });
    }

    next();
  };
}

/**
 * Tenant Isolation check: verifies that target organizationId in params matches req.user.organizationId
 */
export function requireTenantIsolation(paramName = 'orgId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const targetOrgId = req.params[paramName] || req.body?.organizationId || req.query?.organizationId;

    if (targetOrgId && targetOrgId !== req.user.organizationId && !req.user.isPlatformOwner) {
      await logAuditEvent({
        organizationId: req.user.organizationId,
        userId: req.user.userId,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'TENANT_ISOLATION_VIOLATION_ATTEMPT',
        targetEntity: 'ORGANIZATION',
        targetEntityId: String(targetOrgId),
        ipAddress: req.ip,
        details: { callerOrgId: req.user.organizationId, targetOrgId }
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ISOLATION_VIOLATION',
          message: 'Access denied: cannot access or modify resources of another organization.',
        }
      });
    }

    next();
  };
}
