import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getState, commitState } from '../db/connection.ts';
import { UserRole, Organization, Farm, FarmPlot } from '../types/organization.ts';
import { logAuditEvent } from './audit.service.ts';

export class OrgService {
  /**
   * List organizations accessible to caller
   */
  static async listOrganizations(caller: { isPlatformOwner: boolean; organizationId: string }): Promise<Organization[]> {
    const state = getState();
    if (caller.isPlatformOwner) {
      return state.organizations.filter(o => !o.is_deleted);
    }
    return state.organizations.filter(o => o.id === caller.organizationId && !o.is_deleted);
  }

  /**
   * Get organization by ID with isolation check
   */
  static async getOrganizationById(id: string, caller: { isPlatformOwner: boolean; organizationId: string }): Promise<Organization> {
    const state = getState();
    const org = state.organizations.find(o => o.id === id && !o.is_deleted);
    if (!org) {
      throw new Error('Organization not found');
    }

    if (!caller.isPlatformOwner && org.id !== caller.organizationId) {
      throw new Error('Access denied: cross-tenant access prohibited');
    }

    return org;
  }

  /**
   * Create a new organization
   */
  static async createOrganization(params: {
    name: string;
    countryCode?: string;
    orgType?: string;
    primaryCurrency?: string;
    contactEmail: string;
    creatorUserId: string;
    creatorEmail: string;
    ipAddress?: string;
  }): Promise<Organization> {
    const state = getState();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + id.substring(0, 4);

    const newOrg: Organization = {
      id,
      organizationId: id,
      name: params.name.trim(),
      slug,
      countryCode: params.countryCode || 'GN',
      orgType: (params.orgType || 'COOPERATIVE') as any,
      primaryCurrency: (params.primaryCurrency || 'GNF') as any,
      timezone: 'Africa/Conakry',
      contactEmail: params.contactEmail.trim().toLowerCase(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    };

    state.organizations.push({
      id: newOrg.id,
      name: newOrg.name,
      slug: newOrg.slug,
      country_code: newOrg.countryCode,
      org_type: newOrg.orgType,
      primary_currency: newOrg.primaryCurrency,
      timezone: newOrg.timezone,
      contact_email: newOrg.contactEmail,
      is_active: newOrg.isActive,
      created_at: now,
      updated_at: now,
      is_deleted: false
    });

    // Add creator as ORG_ADMIN
    state.organization_memberships.push({
      id: crypto.randomUUID(),
      organization_id: id,
      user_id: params.creatorUserId,
      role: 'ORG_ADMIN',
      is_primary: false,
      created_at: now
    });

    commitState(state);

    await logAuditEvent({
      organizationId: id,
      userId: params.creatorUserId,
      userEmail: params.creatorEmail,
      userRole: 'ORG_ADMIN',
      action: 'ORGANIZATION_CREATED',
      targetEntity: 'ORGANIZATION',
      targetEntityId: id,
      ipAddress: params.ipAddress,
      details: { name: newOrg.name, slug }
    });

    return newOrg;
  }

  /**
   * List members of an organization
   */
  static async getMembers(orgId: string, caller: { isPlatformOwner: boolean; organizationId: string }) {
    if (!caller.isPlatformOwner && orgId !== caller.organizationId) {
      throw new Error('Access denied: cross-tenant access prohibited');
    }

    const state = getState();
    const memberships = state.organization_memberships.filter(m => m.organization_id === orgId);

    return memberships.map(m => {
      const user = state.users.find(u => u.id === m.user_id);
      return {
        membershipId: m.id,
        userId: m.user_id,
        email: user?.email || 'unknown',
        fullName: user?.full_name || 'Unknown User',
        role: m.role as UserRole,
        isPrimary: m.is_primary,
        joinedAt: m.created_at
      };
    });
  }

  /**
   * Add a member or assign role in an organization
   */
  static async addMember(
    first: any,
    second?: { email: string; role: UserRole; fullName?: string; password?: string }
  ) {
    let organizationId: string;
    let email: string;
    let role: UserRole;
    let callerUserId: string;
    let callerEmail: string;
    let callerRole: UserRole;
    let callerIsPlatformOwner: boolean;
    let fullName: string | undefined;
    let password = 'DevPass2026!';

    if (second && first?.user) {
      const session = first;
      organizationId = session.organization?.id || session.user?.activeOrganizationId;
      email = second.email;
      role = second.role;
      callerUserId = session.user.id;
      callerEmail = session.user.email;
      callerRole = session.user.role;
      callerIsPlatformOwner = session.user.role === 'PLATFORM_OWNER';
      fullName = second.fullName;
      if (second.password) password = second.password;
    } else {
      organizationId = first.organizationId;
      email = first.email;
      role = first.role;
      callerUserId = first.callerUserId;
      callerEmail = first.callerEmail;
      callerRole = first.callerRole;
      callerIsPlatformOwner = !!first.callerIsPlatformOwner;
      fullName = first.fullName;
      if (first.password) password = first.password;
    }

    if (!callerIsPlatformOwner && callerRole !== 'ORG_ADMIN') {
      throw new Error('Only Organization Administrators can manage memberships');
    }

    const state = getState();
    const cleanEmail = email.trim().toLowerCase();
    let user = state.users.find(u => u.email.toLowerCase() === cleanEmail);
    const now = new Date().toISOString();

    if (!user) {
      // Auto-create user for team member invitations / provisioning
      const userId = crypto.randomUUID();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      user = {
        id: userId,
        email: cleanEmail,
        password_hash: passwordHash,
        full_name: fullName || cleanEmail.split('@')[0],
        preferred_language: 'fr',
        is_active: true,
        is_platform_owner: false,
        created_at: now,
        updated_at: now
      };
      state.users.push(user);
    }

    const existingMembership = state.organization_memberships.find(
      m => m.organization_id === organizationId && m.user_id === user!.id
    );

    if (existingMembership) {
      existingMembership.role = role;
      commitState(state);

      await logAuditEvent({
        organizationId,
        userId: callerUserId,
        userEmail: callerEmail,
        userRole: callerRole,
        action: 'MEMBER_ROLE_UPDATED',
        targetEntity: 'USER',
        targetEntityId: user.id,
        details: { targetEmail: cleanEmail, newRole: role }
      });

      return { updated: true, role };
    }

    const membershipId = crypto.randomUUID();
    state.organization_memberships.push({
      id: membershipId,
      organization_id: organizationId,
      user_id: user.id,
      role,
      is_primary: false,
      created_at: now
    });
    commitState(state);

    await logAuditEvent({
      organizationId,
      userId: callerUserId,
      userEmail: callerEmail,
      userRole: callerRole,
      action: 'MEMBER_ADDED',
      targetEntity: 'USER',
      targetEntityId: user.id,
      details: { targetEmail: cleanEmail, role }
    });

    return { created: true, membershipId, role };
  }

  // ==========================================
  // Farms & Plots with strict Tenant Isolation
  // ==========================================

  static async listFarms(orgId: string, caller: { isPlatformOwner: boolean; organizationId: string }): Promise<Farm[]> {
    if (!caller.isPlatformOwner && orgId !== caller.organizationId) {
      throw new Error('Access denied: cross-tenant access prohibited');
    }

    const state = getState();
    return state.farms
      .filter(f => f.organization_id === orgId && !f.is_deleted)
      .map(f => ({
        id: f.id,
        organizationId: f.organization_id,
        name: f.name,
        code: f.code,
        region: f.region,
        prefecture: f.prefecture,
        totalAreaHectares: f.total_area_ha,
        usableAreaHectares: f.usable_area_ha,
        isActive: f.is_active,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        isDeleted: f.is_deleted
      }));
  }

  static async createFarm(
    first: any,
    second?: any
  ): Promise<Farm> {
    let params: {
      organizationId: string;
      name: string;
      code: string;
      region: string;
      prefecture?: string;
      totalAreaHa: number;
      usableAreaHa: number;
      callerUserId: string;
      callerEmail: string;
      callerRole: UserRole;
      callerIsPlatformOwner: boolean;
    };

    if (second && first?.user) {
      const session = first;
      const data = second;
      params = {
        organizationId: session.organization?.id || session.user?.activeOrganizationId,
        name: data.name,
        code: data.code,
        region: data.region,
        prefecture: data.prefecture,
        totalAreaHa: data.totalAreaHa,
        usableAreaHa: data.usableAreaHa,
        callerUserId: session.user.id,
        callerEmail: session.user.email,
        callerRole: session.user.role,
        callerIsPlatformOwner: session.user.role === 'PLATFORM_OWNER' || !!session.user.isPlatformOwner
      };
    } else {
      params = first;
    }

    if (
      !params.callerIsPlatformOwner &&
      params.callerRole !== 'ORG_ADMIN' &&
      params.callerRole !== 'MANAGER'
    ) {
      throw new Error('SECURITY_ERROR: Permission denied. Insufficient permissions to create farms');
    }

    const state = getState();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const existingCode = state.farms.find(
      f => f.organization_id === params.organizationId && f.code.toUpperCase() === params.code.trim().toUpperCase()
    );
    if (existingCode) {
      throw new Error(`A farm with code '${params.code}' already exists in this organization`);
    }

    const newFarm = {
      id,
      organization_id: params.organizationId,
      name: params.name.trim(),
      code: params.code.trim().toUpperCase(),
      region: params.region.trim(),
      prefecture: params.prefecture?.trim(),
      total_area_ha: Number(params.totalAreaHa) || 0,
      usable_area_ha: Number(params.usableAreaHa) || 0,
      is_active: true,
      created_at: now,
      updated_at: now,
      is_deleted: false
    };

    state.farms.push(newFarm);
    commitState(state);

    await logAuditEvent({
      organizationId: params.organizationId,
      userId: params.callerUserId,
      userEmail: params.callerEmail,
      userRole: params.callerRole,
      action: 'FARM_CREATED',
      targetEntity: 'FARM',
      targetEntityId: id,
      details: { name: newFarm.name, code: newFarm.code }
    });

    return {
      id,
      organizationId: params.organizationId,
      name: newFarm.name,
      code: newFarm.code,
      region: newFarm.region,
      prefecture: newFarm.prefecture,
      totalAreaHectares: newFarm.total_area_ha,
      usableAreaHectares: newFarm.usable_area_ha,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    };
  }

  static async listPlots(farmId: string, caller: { isPlatformOwner: boolean; organizationId: string }): Promise<FarmPlot[]> {
    const state = getState();
    const farm = state.farms.find(f => f.id === farmId && !f.is_deleted);
    if (!farm) {
      throw new Error('Farm not found');
    }

    if (!caller.isPlatformOwner && farm.organization_id !== caller.organizationId) {
      throw new Error('Access denied: cross-tenant access prohibited');
    }

    return state.plots
      .filter(p => p.farm_id === farmId && !p.is_deleted)
      .map(p => ({
        id: p.id,
        organizationId: p.organization_id,
        farmId: p.farm_id,
        name: p.name,
        code: p.code,
        areaHectares: p.area_hectares,
        soilType: p.soil_type,
        irrigationType: p.irrigation_type,
        currentStatus: p.current_status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        isDeleted: p.is_deleted
      }));
  }

  static async createPlot(
    first: any,
    second?: any,
    third?: any
  ): Promise<FarmPlot> {
    let params: {
      farmId: string;
      organizationId: string;
      name: string;
      code: string;
      areaHectares: number;
      soilType?: string;
      irrigationType?: string;
      callerUserId: string;
      callerEmail: string;
      callerRole: UserRole;
      callerIsPlatformOwner: boolean;
    };

    if (third && first?.user) {
      const session = first;
      const farmId = second;
      const data = third;
      params = {
        farmId,
        organizationId: session.organization?.id || session.user?.activeOrganizationId,
        name: data.name,
        code: data.code,
        areaHectares: data.areaHectares,
        soilType: data.soilType,
        irrigationType: data.irrigationType,
        callerUserId: session.user.id,
        callerEmail: session.user.email,
        callerRole: session.user.role,
        callerIsPlatformOwner: session.user.role === 'PLATFORM_OWNER' || !!session.user.isPlatformOwner
      };
    } else {
      params = first;
    }

    if (
      !params.callerIsPlatformOwner &&
      params.callerRole !== 'ORG_ADMIN' &&
      params.callerRole !== 'MANAGER' &&
      params.callerRole !== 'AGRONOMIST'
    ) {
      throw new Error('SECURITY_ERROR: Permission denied. Insufficient permissions to create plots');
    }

    if ((Number(params.areaHectares) || 0) <= 0) {
      throw new Error('Plot area must be greater than zero');
    }

    const state = getState();
    const farm = state.farms.find(f => f.id === params.farmId && !f.is_deleted);
    if (!farm) throw new Error('Farm not found');

    if (!params.callerIsPlatformOwner && farm.organization_id !== params.organizationId) {
      throw new Error('Cross-tenant plot creation prohibited');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newPlot = {
      id,
      organization_id: params.organizationId,
      farm_id: params.farmId,
      name: params.name.trim(),
      code: params.code.trim().toUpperCase(),
      area_hectares: Number(params.areaHectares) || 1,
      soil_type: params.soilType || 'Sablo-limoneux',
      irrigation_type: params.irrigationType || 'RAINFED',
      current_status: 'PLANNED',
      created_at: now,
      updated_at: now,
      is_deleted: false
    };

    state.plots.push(newPlot);
    commitState(state);

    await logAuditEvent({
      organizationId: params.organizationId,
      userId: params.callerUserId,
      userEmail: params.callerEmail,
      userRole: params.callerRole,
      action: 'PLOT_CREATED',
      targetEntity: 'PLOT',
      targetEntityId: id,
      details: { farmId: params.farmId, plotCode: newPlot.code, area: newPlot.area_hectares }
    });

    return {
      id,
      organizationId: params.organizationId,
      farmId: params.farmId,
      name: newPlot.name,
      code: newPlot.code,
      areaHectares: newPlot.area_hectares,
      soilType: newPlot.soil_type,
      irrigationType: newPlot.irrigation_type as any,
      currentStatus: newPlot.current_status as any,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    };
  }
}
