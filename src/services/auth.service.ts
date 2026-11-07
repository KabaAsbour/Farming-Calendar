import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getState, commitState, isPg, getPgPool } from '../db/connection.ts';
import { UserRole, UserProfile, AuthSession } from '../types/organization.ts';
import { logAuditEvent } from './audit.service.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'farming-calendar-secure-key-2026-phase1-guinea';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
  isPlatformOwner: boolean;
}

export class AuthService {
  /**
   * Hashes a password using bcrypt with 10 salt rounds
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compares a plaintext password against a bcrypt hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a signed JWT session token
   */
  static generateToken(payload: TokenPayload): { token: string; expiresAt: string } {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    return { token, expiresAt };
  }

  /**
   * Verifies and decodes a JWT session token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (err) {
      throw new Error('Invalid or expired authentication token');
    }
  }

  /**
   * Register a new user and create their initial organization
   */
  static async register(params: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
    preferredLanguage?: 'fr' | 'en';
    countryCode?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthSession> {
    const email = params.email.trim().toLowerCase();
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email address format');
    }

    // Password strength check (min 8 chars)
    if (!params.password || params.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!params.fullName || params.fullName.trim().length < 2) {
      throw new Error('Full name is required (minimum 2 characters)');
    }

    if (!params.organizationName || params.organizationName.trim().length < 2) {
      throw new Error('Organization name is required');
    }

    const state = getState();

    // Check email uniqueness
    const existing = state.users.find(u => u.email.toLowerCase() === email);
    if (existing) {
      throw new Error('A user with this email address already exists');
    }

    const userId = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await this.hashPassword(params.password);

    const slug = params.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + orgId.substring(0, 4);

    const newOrg = {
      id: orgId,
      name: params.organizationName.trim(),
      slug,
      country_code: params.countryCode || 'GN',
      org_type: 'COOPERATIVE',
      primary_currency: 'GNF',
      timezone: 'Africa/Conakry',
      contact_email: email,
      is_active: true,
      created_at: now,
      updated_at: now,
      is_deleted: false
    };

    const newUser = {
      id: userId,
      email,
      password_hash: passwordHash,
      full_name: params.fullName.trim(),
      preferred_language: params.preferredLanguage || 'fr',
      is_active: true,
      is_platform_owner: false,
      created_at: now,
      updated_at: now
    };

    const newMembership = {
      id: membershipId,
      organization_id: orgId,
      user_id: userId,
      role: 'ORG_ADMIN' as UserRole,
      is_primary: true,
      created_at: now
    };

    state.organizations.push(newOrg);
    state.users.push(newUser);
    state.organization_memberships.push(newMembership);
    commitState(state);

    // Audit log
    await logAuditEvent({
      organizationId: orgId,
      userId,
      userEmail: email,
      userRole: 'ORG_ADMIN',
      action: 'USER_REGISTERED',
      targetEntity: 'USER',
      targetEntityId: userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: { organizationId: orgId, organizationName: newOrg.name }
    });

    const tokenPayload: TokenPayload = {
      userId,
      email,
      role: 'ORG_ADMIN',
      organizationId: orgId,
      isPlatformOwner: false
    };

    const { token, expiresAt } = this.generateToken(tokenPayload);

    return {
      token,
      expiresAt,
      user: {
        id: userId,
        email,
        fullName: newUser.full_name,
        preferredLanguage: newUser.preferred_language as 'fr' | 'en',
        activeOrganizationId: orgId,
        role: 'ORG_ADMIN',
        isActive: true,
        createdAt: now
      },
      organization: {
        id: newOrg.id,
        organizationId: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        countryCode: newOrg.country_code,
        orgType: newOrg.org_type as any,
        primaryCurrency: newOrg.primary_currency as any,
        timezone: newOrg.timezone,
        contactEmail: newOrg.contact_email,
        isActive: newOrg.is_active,
        createdAt: now,
        updatedAt: now,
        isDeleted: false
      },
      availableOrganizations: [{ id: orgId, name: newOrg.name, role: 'ORG_ADMIN' }]
    };
  }

  /**
   * Authenticate user credentials and return an AuthSession
   */
  static async login(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthSession> {
    if (!params.email || params.email.trim().length === 0) {
      throw new Error('Email address is required');
    }
    if (!params.password || params.password.length === 0) {
      throw new Error('Password is required');
    }

    const email = params.email.trim().toLowerCase();
    const state = getState();

    const user = state.users.find(u => u.email.toLowerCase() === email);
    if (!user || !user.is_active) {
      await logAuditEvent({
        userEmail: email,
        action: 'LOGIN_FAILED',
        targetEntity: 'AUTH',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: { reason: 'User not found or inactive' }
      });
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await this.comparePassword(params.password, user.password_hash);
    if (!isValidPassword) {
      await logAuditEvent({
        userId: user.id,
        userEmail: email,
        action: 'LOGIN_FAILED',
        targetEntity: 'AUTH',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: { reason: 'Password mismatch' }
      });
      throw new Error('Invalid email or password');
    }

    // Find memberships
    const memberships = state.organization_memberships.filter(m => m.user_id === user.id);
    if (memberships.length === 0 && !user.is_platform_owner) {
      throw new Error('User does not belong to any active organization');
    }

    const primaryMembership = memberships.find(m => m.is_primary) || memberships[0];
    const orgId = primaryMembership ? primaryMembership.organization_id : state.organizations[0]?.id;
    const org = state.organizations.find(o => o.id === orgId) || state.organizations[0];
    const role: UserRole = user.is_platform_owner ? 'PLATFORM_OWNER' : primaryMembership.role;

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role,
      organizationId: org.id,
      isPlatformOwner: !!user.is_platform_owner
    };

    const { token, expiresAt } = this.generateToken(tokenPayload);

    const availableOrganizations = memberships.map(m => {
      const o = state.organizations.find(orgItem => orgItem.id === m.organization_id);
      return {
        id: m.organization_id,
        name: o ? o.name : 'Unknown Organization',
        role: m.role as UserRole
      };
    });

    await logAuditEvent({
      organizationId: org.id,
      userId: user.id,
      userEmail: user.email,
      userRole: role,
      action: 'LOGIN_SUCCESS',
      targetEntity: 'AUTH',
      targetEntityId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        preferredLanguage: user.preferred_language,
        activeOrganizationId: org.id,
        role,
        isActive: user.is_active,
        createdAt: user.created_at
      },
      organization: {
        id: org.id,
        organizationId: org.id,
        name: org.name,
        slug: org.slug,
        countryCode: org.country_code,
        orgType: org.org_type,
        primaryCurrency: org.primary_currency,
        timezone: org.timezone,
        contactEmail: org.contact_email,
        isActive: org.is_active,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        isDeleted: org.is_deleted
      },
      availableOrganizations
    };
  }

  /**
   * Switch the active organization context for a multi-org user
   */
  static async switchOrganization(userId: string, targetOrgId: string): Promise<AuthSession> {
    const state = getState();
    const user = state.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const membership = state.organization_memberships.find(
      m => m.user_id === userId && m.organization_id === targetOrgId
    );

    if (!membership && !user.is_platform_owner) {
      throw new Error('User is not a member of the requested organization');
    }

    const org = state.organizations.find(o => o.id === targetOrgId);
    if (!org) throw new Error('Target organization not found');

    const role: UserRole = user.is_platform_owner
      ? 'PLATFORM_OWNER'
      : (membership?.role as UserRole);

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role,
      organizationId: org.id,
      isPlatformOwner: !!user.is_platform_owner
    };

    const { token, expiresAt } = this.generateToken(tokenPayload);

    await logAuditEvent({
      organizationId: org.id,
      userId: user.id,
      userEmail: user.email,
      userRole: role,
      action: 'ORGANIZATION_SWITCHED',
      targetEntity: 'ORGANIZATION',
      targetEntityId: org.id,
      details: { previousOrg: user.activeOrganizationId, targetOrg: org.id }
    });

    const memberships = state.organization_memberships.filter(m => m.user_id === user.id);
    const availableOrganizations = memberships.map(m => {
      const o = state.organizations.find(orgItem => orgItem.id === m.organization_id);
      return {
        id: m.organization_id,
        name: o ? o.name : 'Unknown Organization',
        role: m.role as UserRole
      };
    });

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        preferredLanguage: user.preferred_language,
        activeOrganizationId: org.id,
        role,
        isActive: user.is_active,
        createdAt: user.created_at
      },
      organization: {
        id: org.id,
        organizationId: org.id,
        name: org.name,
        slug: org.slug,
        countryCode: org.country_code,
        orgType: org.org_type,
        primaryCurrency: org.primary_currency,
        timezone: org.timezone,
        contactEmail: org.contact_email,
        isActive: org.is_active,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        isDeleted: org.is_deleted
      },
      availableOrganizations
    };
  }
}
