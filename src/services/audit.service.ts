import crypto from 'crypto';
import { getState, commitState, isPg, getPgPool } from '../db/connection.ts';
import { UserRole } from '../types/organization.ts';

export interface AuditLogParams {
  organizationId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: UserRole | string | null;
  action: string;
  targetEntity: string;
  targetEntityId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  if (isPg()) {
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (id, organization_id, user_id, user_email, user_role, action, target_entity, target_entity_id, ip_address, user_agent, details_json, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            id,
            params.organizationId || null,
            params.userId || null,
            params.userEmail || null,
            params.userRole || null,
            params.action,
            params.targetEntity,
            params.targetEntityId || null,
            params.ipAddress || null,
            params.userAgent || null,
            JSON.stringify(params.details || {}),
            timestamp
          ]
        );
        return;
      } catch (err) {
        console.error('[AUDIT] Failed to insert into PG audit_logs:', err);
      }
    }
  }

  // Local persistent engine
  const state = getState();
  state.audit_logs.unshift({
    id,
    organization_id: params.organizationId || null,
    user_id: params.userId || null,
    user_email: params.userEmail || null,
    user_role: params.userRole || null,
    action: params.action,
    target_entity: params.targetEntity,
    target_entity_id: params.targetEntityId || null,
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
    details_json: params.details || {},
    created_at: timestamp
  });

  // Limit logs in state to last 1000 items
  if (state.audit_logs.length > 1000) {
    state.audit_logs.pop();
  }
  commitState(state);
}

export const logSecurityAudit = logAuditEvent;

export async function getAuditLogs(organizationId?: string, limit = 50) {
  if (isPg()) {
    const pool = getPgPool();
    if (pool) {
      const query = organizationId
        ? `SELECT * FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2`
        : `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`;
      const values = organizationId ? [organizationId, limit] : [limit];
      const res = await pool.query(query, values);
      return res.rows;
    }
  }

  const state = getState();
  if (organizationId) {
    return state.audit_logs.filter(l => l.organization_id === organizationId).slice(0, limit);
  }
  return state.audit_logs.slice(0, limit);
}
