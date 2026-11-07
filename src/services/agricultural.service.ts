import { getState, commitState } from '../db/connection.ts';
import { 
  AreaUnit, 
  convertAreaToHa, 
  ProductionCampaignMaster, 
  CampaignOperationRecord, 
  CampaignHarvestRecord,
  CropMaster,
  CropVarietyMaster,
  AgriculturalSeasonMaster,
  AgriculturalMethodMaster,
  SupplierMaster,
  AgriculturalInputMaster,
  AgriculturalEquipmentMaster,
  FieldTeamMaster,
  OperationTypeAgricultural
} from '../types/agricultural.ts';
import { logSecurityAudit } from './audit.service.ts';
import { randomUUID } from 'crypto';

export class AgriculturalService {

  // =========================================================================
  // RBAC & TENANCY HELPERS
  // =========================================================================

  private static checkReadAccess(orgId: string, caller: { isPlatformOwner: boolean; organizationId: string }) {
    if (!caller.isPlatformOwner && orgId !== caller.organizationId) {
      throw new Error('Access denied: cross-tenant access prohibited');
    }
  }

  private static checkWriteAccess(
    orgId: string, 
    caller: { isPlatformOwner: boolean; organizationId: string; role?: string }
  ) {
    if (!caller.isPlatformOwner && orgId !== caller.organizationId) {
      throw new Error('Access denied: cross-tenant access prohibited');
    }
    const role = caller.role;
    if (caller.isPlatformOwner) return;

    const allowedRoles = ['ORG_ADMIN', 'MANAGER', 'AGRONOMIST', 'OPERATIONS_STAFF'];
    if (role && !allowedRoles.includes(role)) {
      throw new Error(`Permission denied: role ${role} has read-only access to agricultural records`);
    }
  }

  // =========================================================================
  // 1. CROPS MASTER CATALOG (Configurable, CRUD)
  // =========================================================================

  static async listCrops(
    orgId: string, 
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<CropMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    return (state.crops || []).filter(c => 
      !c.is_deleted && (c.organization_id === orgId || !c.organization_id || caller.isPlatformOwner)
    ).map(c => ({
      id: c.id,
      organizationId: c.organization_id || orgId,
      name: c.name,
      scientificName: c.scientific_name,
      category: c.category,
      growthCycleDays: c.growth_cycle_days,
      defaultSpacingCm: c.default_spacing_cm,
      waterRequirementMm: c.water_requirement_mm,
      description: c.description,
      isActive: c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      isDeleted: c.is_deleted
    }));
  }

  static async createCrop(
    first: any,
    second?: any,
    third?: any
  ): Promise<CropMaster> {
    let orgId: string;
    let data: {
      name: string;
      scientificName?: string;
      category: any;
      growthCycleDays: number;
      defaultSpacingCm?: string;
      waterRequirementMm?: number;
      description?: string;
    };
    let caller: { isPlatformOwner: boolean; organizationId: string; role?: string; userId?: string; email?: string };

    if (second && first?.user) {
      const session = first;
      orgId = session.organization?.id || session.user?.activeOrganizationId;
      data = second;
      caller = {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organizationId: orgId,
        isPlatformOwner: session.user.role === 'PLATFORM_OWNER'
      };
    } else {
      orgId = first;
      data = second;
      caller = third;
    }

    this.checkWriteAccess(orgId, caller);
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Crop name is required');
    }
    if (data.growthCycleDays <= 0) {
      throw new Error('Growth cycle days must be greater than zero');
    }

    const state = getState();
    const newCrop = {
      id: randomUUID(),
      organization_id: orgId,
      name: data.name.trim(),
      scientific_name: data.scientificName?.trim() || null,
      category: data.category || 'OTHER',
      growth_cycle_days: data.growthCycleDays,
      default_spacing_cm: data.defaultSpacingCm || null,
      water_requirement_mm: data.waterRequirementMm || null,
      description: data.description || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    state.crops.push(newCrop);
    commitState(state);

    await logSecurityAudit({
      organizationId: orgId,
      userId: caller.userId,
      userRole: caller.role,
      action: 'AGRICULTURAL_CROP_CREATED',
      targetEntity: 'CROPS',
      targetEntityId: newCrop.id,
      details: { name: newCrop.name, category: newCrop.category }
    });

    return {
      id: newCrop.id,
      organizationId: orgId,
      name: newCrop.name,
      scientificName: newCrop.scientific_name || undefined,
      category: newCrop.category,
      growthCycleDays: newCrop.growth_cycle_days,
      defaultSpacingCm: newCrop.default_spacing_cm || undefined,
      waterRequirementMm: newCrop.water_requirement_mm ?? undefined,
      description: newCrop.description || undefined,
      isActive: true,
      createdAt: newCrop.created_at,
      updatedAt: newCrop.updated_at,
      isDeleted: false
    };
  }

  // =========================================================================
  // 2. CROP VARIETIES (Configurable, CRUD)
  // =========================================================================

  static async listVarieties(
    orgId: string,
    cropId?: string,
    caller: { isPlatformOwner: boolean; organizationId: string } = { isPlatformOwner: false, organizationId: orgId }
  ): Promise<CropVarietyMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    let vars = (state.crop_varieties || []).filter(v => 
      !v.is_deleted && (v.organization_id === orgId || !v.organization_id || caller.isPlatformOwner)
    );
    if (cropId && cropId !== 'ALL') {
      vars = vars.filter(v => v.crop_id === cropId);
    }

    return vars.map(v => {
      const parentCrop = state.crops.find(c => c.id === v.crop_id);
      return {
        id: v.id,
        cropId: v.crop_id,
        cropName: parentCrop ? parentCrop.name : undefined,
        organizationId: v.organization_id || orgId,
        name: v.name,
        code: v.code,
        maturityDaysMin: v.maturity_days_min,
        maturityDaysMax: v.maturity_days_max,
        expectedYieldPerHaTons: v.expected_yield_per_ha_tons,
        heatTolerance: v.heat_tolerance,
        diseaseResistances: v.disease_resistances ? v.disease_resistances.split(',').map((s: string) => s.trim()) : [],
        characteristics: v.characteristics,
        isActive: v.is_active,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        isDeleted: v.is_deleted
      };
    });
  }

  static async createVariety(
    first: any,
    second?: any,
    third?: any
  ): Promise<CropVarietyMaster> {
    let orgId: string;
    let data: any;
    let caller: { isPlatformOwner: boolean; organizationId: string; role?: string; userId?: string; email?: string };

    if (second && first?.user) {
      const session = first;
      orgId = session.organization?.id || session.user?.activeOrganizationId;
      data = {
        ...second,
        maturityDaysMin: second.maturityDaysMin || 60,
        maturityDaysMax: second.maturityDaysMax || 120,
        expectedYieldPerHaTons: second.optimalYieldTonsPerHa || second.expectedYieldPerHaTons || 10.0,
        diseaseResistances: second.diseaseResistance || second.diseaseResistances
      };
      caller = {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organizationId: orgId,
        isPlatformOwner: session.user.role === 'PLATFORM_OWNER'
      };
    } else {
      orgId = first;
      data = second;
      caller = third;
    }

    this.checkWriteAccess(orgId, caller);
    const state = getState();
    const parentCrop = state.crops.find(c => c.id === data.cropId && !c.is_deleted);
    if (!parentCrop) {
      throw new Error('Selected crop does not exist');
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Variety name is required');
    }
    const minDays = Number(data.maturityDaysMin) || 60;
    const maxDays = Number(data.maturityDaysMax) || 120;
    if (minDays <= 0 || maxDays < minDays) {
      throw new Error('Invalid maturity days range: max must be greater than or equal to min');
    }

    const newVar = {
      id: randomUUID(),
      crop_id: data.cropId,
      organization_id: orgId,
      name: data.name.trim(),
      code: data.code?.trim() || `VAR-${Date.now().toString().slice(-4)}`,
      maturity_days_min: data.maturityDaysMin,
      maturity_days_max: data.maturityDaysMax,
      expected_yield_per_ha_tons: data.expectedYieldPerHaTons || 0,
      heat_tolerance: data.heatTolerance || 'HIGH',
      disease_resistances: data.diseaseResistances || null,
      characteristics: data.characteristics || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    state.crop_varieties.push(newVar);
    commitState(state);

    return {
      id: newVar.id,
      cropId: newVar.crop_id,
      cropName: parentCrop.name,
      organizationId: orgId,
      name: newVar.name,
      code: newVar.code,
      maturityDaysMin: newVar.maturity_days_min,
      maturityDaysMax: newVar.maturity_days_max,
      expectedYieldPerHaTons: newVar.expected_yield_per_ha_tons,
      heatTolerance: newVar.heat_tolerance,
      characteristics: newVar.characteristics || undefined,
      isActive: true,
      createdAt: newVar.created_at,
      updatedAt: newVar.updated_at,
      isDeleted: false
    };
  }

  // =========================================================================
  // 3. MASTER DATA: SEASONS, METHODS, SUPPLIERS, INPUTS, EQUIPMENT, TEAMS
  // =========================================================================

  static async listSeasons(
    orgId: string,
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<AgriculturalSeasonMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    return (state.agricultural_seasons || []).filter(s => 
      !s.is_deleted && (s.organization_id === orgId || caller.isPlatformOwner)
    ).map(s => ({
      id: s.id,
      organizationId: s.organization_id,
      name: s.name,
      code: s.code,
      startDate: s.start_date,
      endDate: s.end_date,
      status: s.status,
      description: s.description,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      isDeleted: s.is_deleted
    }));
  }

  static async listMethods(
    orgId: string,
    methodType?: 'PLANTING' | 'HARVESTING',
    caller: { isPlatformOwner: boolean; organizationId: string } = { isPlatformOwner: false, organizationId: orgId }
  ): Promise<AgriculturalMethodMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    let methods = (state.agricultural_methods || []).filter(m => !m.is_deleted);
    if (methodType) {
      methods = methods.filter(m => m.method_type === methodType);
    }
    return methods.map(m => ({
      id: m.id,
      organizationId: m.organization_id,
      methodType: m.method_type,
      name: m.name,
      description: m.description,
      equipmentNeeded: m.equipment_needed,
      laborIntensity: m.labor_intensity,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      isDeleted: m.is_deleted
    }));
  }

  static async listSuppliers(
    orgId: string,
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<SupplierMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    return (state.suppliers || []).filter(s => 
      !s.is_deleted && (s.organization_id === orgId || caller.isPlatformOwner)
    ).map(s => ({
      id: s.id,
      organizationId: s.organization_id,
      name: s.name,
      category: s.category,
      contactPerson: s.contact_person,
      email: s.email,
      phone: s.phone,
      address: s.address,
      locality: s.locality,
      rating: s.rating,
      notes: s.notes,
      isActive: s.is_active,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      isDeleted: s.is_deleted
    }));
  }

  static async listInputs(
    orgId: string,
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<AgriculturalInputMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    return (state.agricultural_inputs || []).filter(i => 
      !i.is_deleted && (i.organization_id === orgId || caller.isPlatformOwner)
    ).map(i => {
      const sup = state.suppliers.find(s => s.id === i.supplier_id);
      return {
        id: i.id,
        organizationId: i.organization_id,
        name: i.name,
        category: i.category,
        unit: i.unit,
        defaultDosage: i.default_dosage,
        supplierId: i.supplier_id,
        supplierName: sup ? sup.name : undefined,
        costPerUnit: i.cost_per_unit,
        currency: i.currency,
        stockQuantity: i.stock_quantity,
        safetyPrecautions: i.safety_precautions,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        isDeleted: i.is_deleted
      };
    });
  }

  static async listEquipment(
    orgId: string,
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<AgriculturalEquipmentMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    return (state.agricultural_equipment || []).filter(e => 
      !e.is_deleted && (e.organization_id === orgId || caller.isPlatformOwner)
    ).map(e => ({
      id: e.id,
      organizationId: e.organization_id,
      name: e.name,
      equipmentType: e.equipment_type,
      serialNumber: e.serial_number,
      status: e.status,
      maintenanceSchedule: e.maintenance_schedule,
      notes: e.notes,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      isDeleted: e.is_deleted
    }));
  }

  static async listFieldTeams(
    orgId: string,
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<FieldTeamMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    return (state.field_teams || []).filter(t => 
      !t.is_deleted && (t.organization_id === orgId || caller.isPlatformOwner)
    ).map(t => {
      const leader = state.users.find(u => u.id === t.leader_user_id);
      return {
        id: t.id,
        organizationId: t.organization_id,
        name: t.name,
        leaderUserId: t.leader_user_id,
        leaderName: leader ? leader.full_name : undefined,
        membersCount: t.members_count,
        skills: t.skills ? t.skills.split(',').map((s: string) => s.trim()) : [],
        isActive: t.is_active,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        isDeleted: t.is_deleted
      };
    });
  }

  // =========================================================================
  // 4. PRODUCTION CAMPAIGNS (Core Business Logic & Validations)
  // =========================================================================

  static async listCampaigns(
    orgId: string,
    filters: {
      farmId?: string;
      cropId?: string;
      status?: string;
      searchQuery?: string;
    } = {},
    caller: { isPlatformOwner: boolean; organizationId: string } = { isPlatformOwner: false, organizationId: orgId }
  ): Promise<ProductionCampaignMaster[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();

    let list = (state.production_campaigns || []).filter(c => 
      !c.is_deleted && (c.organization_id === orgId || caller.isPlatformOwner)
    );

    if (filters.farmId && filters.farmId !== 'ALL') {
      list = list.filter(c => c.farm_id === filters.farmId);
    }
    if (filters.cropId && filters.cropId !== 'ALL') {
      list = list.filter(c => c.crop_id === filters.cropId);
    }
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(c => c.status === filters.status);
    }
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.code.toLowerCase().includes(q)
      );
    }

    return list.map(c => this.enrichCampaign(c, state));
  }

  static async getCampaign(
    campaignId: string,
    orgId: string,
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<ProductionCampaignMaster & { operations: CampaignOperationRecord[]; harvests: CampaignHarvestRecord[] }> {
    this.checkReadAccess(orgId, caller);
    const state = getState();
    const c = state.production_campaigns.find(cp => 
      cp.id === campaignId && !cp.is_deleted && (cp.organization_id === orgId || caller.isPlatformOwner)
    );
    if (!c) {
      throw new Error(`Production campaign '${campaignId}' not found`);
    }

    const enriched = this.enrichCampaign(c, state);
    const operations = (state.campaign_operations || [])
      .filter(op => op.campaign_id === campaignId && !op.is_deleted)
      .map(op => this.enrichOperation(op, state));

    const harvests = (state.campaign_harvests || [])
      .filter(h => h.campaign_id === campaignId && !h.is_deleted)
      .map(h => this.enrichHarvest(h, state));

    return {
      ...enriched,
      operations,
      harvests
    };
  }

  static async createCampaign(
    first: any,
    second?: any,
    third?: any
  ): Promise<ProductionCampaignMaster> {
    let orgId: string;
    let data: any;
    let caller: { isPlatformOwner: boolean; organizationId: string; role?: string; userId?: string; email?: string };

    if (second && first?.user) {
      const session = first;
      orgId = session.organization?.id || session.user?.activeOrganizationId;
      const raw = second;
      data = {
        ...raw,
        cropVarietyId: raw.varietyId || raw.cropVarietyId,
        plannedArea: raw.allocatedAreaHa || raw.plannedArea || 1.0,
        areaUnit: raw.areaUnit || 'HECTARE',
        plantingWindowStart: raw.startDate || raw.plantingWindowStart,
        plantingWindowEnd: raw.startDate || raw.plantingWindowEnd,
        expectedHarvestStart: raw.estimatedHarvestDate || raw.expectedHarvestStart,
        expectedHarvestEnd: raw.estimatedHarvestDate || raw.expectedHarvestEnd,
        productionTargetQuantity: raw.productionTargetQuantity || 10.0,
        productionTargetUnit: raw.targetUnit || raw.productionTargetUnit || 'TON'
      };
      caller = {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organizationId: orgId,
        isPlatformOwner: session.user.role === 'PLATFORM_OWNER'
      };
    } else {
      orgId = first;
      data = second;
      caller = third;
    }

    this.checkWriteAccess(orgId, caller);
    const state = getState();

    // 1. Validate farm exists and belongs to organization
    const farm = state.farms.find(f => f.id === data.farmId && !f.is_deleted && f.organization_id === orgId);
    if (!farm) {
      throw new Error('Selected farm does not exist in this organization');
    }

    // 2. Validate crop and crop variety compatibility
    const crop = state.crops.find(c => c.id === data.cropId && !c.is_deleted);
    if (!crop) {
      throw new Error('Selected crop does not exist');
    }
    const variety = state.crop_varieties.find(v => v.id === data.cropVarietyId && !v.is_deleted);
    if (!variety) {
      throw new Error('Selected crop variety does not exist');
    }
    if (variety.crop_id !== crop.id) {
      throw new Error(`Data Integrity Error: Variety '${variety.name}' does not belong to crop '${crop.name}'`);
    }

    // 3. Validate dates
    const plantStart = new Date(data.plantingWindowStart);
    const plantEnd = new Date(data.plantingWindowEnd);
    const harvStart = new Date(data.expectedHarvestStart);
    const harvEnd = new Date(data.expectedHarvestEnd);

    if (isNaN(plantStart.getTime()) || isNaN(plantEnd.getTime()) || isNaN(harvStart.getTime()) || isNaN(harvEnd.getTime())) {
      throw new Error('Invalid date format for planting or harvest windows');
    }
    if (plantStart > plantEnd) {
      throw new Error('Planting window start date must be before or equal to planting window end date');
    }
    if (harvStart > harvEnd) {
      throw new Error('Harvest window start date must be before or equal to harvest window end date');
    }
    if (harvStart < plantStart) {
      throw new Error('Expected harvest window cannot begin before planting window starts');
    }

    // 4. Validate area & conversion
    if (data.plannedArea <= 0) {
      throw new Error('Planned area must be greater than zero');
    }
    const areaUnit = data.areaUnit || 'HA';
    const plannedAreaHa = convertAreaToHa(data.plannedArea, areaUnit);

    // If plot is assigned, validate against plot area
    if (data.plotId) {
      const plot = state.plots.find(p => p.id === data.plotId && !p.is_deleted && p.farm_id === farm.id);
      if (!plot) {
        throw new Error('Selected plot does not exist on this farm');
      }
      if (plannedAreaHa > Number(plot.area_hectares)) {
        throw new Error(`Planned area (${plannedAreaHa} ha) exceeds the total area of parcel '${plot.name}' (${plot.area_hectares} ha)`);
      }
    } else {
      if (plannedAreaHa > Number(farm.usable_area_ha || farm.total_area_ha)) {
        throw new Error(`Planned area (${plannedAreaHa} ha) exceeds farm usable area (${farm.usable_area_ha} ha)`);
      }
    }

    // 5. Validate production target
    if (data.productionTargetQuantity <= 0) {
      throw new Error('Production target quantity must be greater than zero');
    }

    const campaignCode = data.code?.trim() || `CAMP-${crop.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newCampaign = {
      id: randomUUID(),
      organization_id: orgId,
      season_id: data.seasonId || null,
      name: data.name.trim(),
      code: campaignCode,
      farm_id: data.farmId,
      plot_id: data.plotId || null,
      crop_id: data.cropId,
      crop_variety_id: data.cropVarietyId,
      planned_area: data.plannedArea,
      area_unit: areaUnit,
      planned_area_ha: plannedAreaHa,
      planting_window_start: data.plantingWindowStart,
      planting_window_end: data.plantingWindowEnd,
      expected_harvest_start: data.expectedHarvestStart,
      expected_harvest_end: data.expectedHarvestEnd,
      production_target_quantity: data.productionTargetQuantity,
      production_target_unit: data.productionTargetUnit || 'KG',
      manager_user_id: data.managerUserId || null,
      field_team_id: data.fieldTeamId || null,
      status: data.status || 'PLANNING',
      budget_code: data.budgetCode || null,
      budget_allocated: data.budgetAllocated || 0,
      budget_actual_spend: 0,
      budget_currency: data.budgetCurrency || 'GNF',
      planting_method_id: data.plantingMethodId || null,
      harvesting_method_id: data.harvestingMethodId || null,
      notes: data.notes || null,
      created_by_user_id: caller.userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    state.production_campaigns.push(newCampaign);
    commitState(state);

    await logSecurityAudit({
      organizationId: orgId,
      userId: caller.userId,
      userRole: caller.role,
      action: 'AGRICULTURAL_CAMPAIGN_CREATED',
      targetEntity: 'PRODUCTION_CAMPAIGNS',
      targetEntityId: newCampaign.id,
      details: { code: newCampaign.code, name: newCampaign.name, crop: crop.name, variety: variety.name }
    });

    return this.enrichCampaign(newCampaign, state);
  }

  static async updateCampaign(
    campaignId: string,
    orgId: string,
    updates: Partial<ProductionCampaignMaster>,
    caller: { isPlatformOwner: boolean; organizationId: string; role?: string; userId?: string }
  ): Promise<ProductionCampaignMaster> {
    this.checkWriteAccess(orgId, caller);
    const state = getState();
    const campaign = state.production_campaigns.find(c => 
      c.id === campaignId && !c.is_deleted && (c.organization_id === orgId || caller.isPlatformOwner)
    );
    if (!campaign) {
      throw new Error(`Production campaign '${campaignId}' not found`);
    }

    if (updates.name) campaign.name = updates.name.trim();
    if (updates.status) {
      campaign.status = updates.status;
    }
    if (updates.budgetAllocated !== undefined) campaign.budget_allocated = updates.budgetAllocated;
    if (updates.budgetActualSpend !== undefined) campaign.budget_actual_spend = updates.budgetActualSpend;
    if (updates.notes !== undefined) campaign.notes = updates.notes;
    if (updates.managerUserId !== undefined) campaign.manager_user_id = updates.managerUserId;
    if (updates.fieldTeamId !== undefined) campaign.field_team_id = updates.fieldTeamId;

    campaign.updated_at = new Date().toISOString();
    commitState(state);

    return this.enrichCampaign(campaign, state);
  }

  // =========================================================================
  // 5. CAMPAIGN OPERATIONS (9 Operational Records + Calendar Integration)
  // =========================================================================

  static async listOperations(
    orgId: string,
    campaignId?: string,
    filters: {
      operationType?: string;
      status?: string;
    } = {},
    caller: { isPlatformOwner: boolean; organizationId: string } = { isPlatformOwner: false, organizationId: orgId }
  ): Promise<CampaignOperationRecord[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();

    let ops = (state.campaign_operations || []).filter(op => 
      !op.is_deleted && (op.organization_id === orgId || caller.isPlatformOwner)
    );

    if (campaignId && campaignId !== 'ALL') {
      ops = ops.filter(op => op.campaign_id === campaignId);
    }
    if (filters.operationType && filters.operationType !== 'ALL') {
      ops = ops.filter(op => op.operation_type === filters.operationType);
    }
    if (filters.status && filters.status !== 'ALL') {
      ops = ops.filter(op => op.status === filters.status);
    }

    // Sort by planned_date
    ops.sort((a, b) => new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime());

    return ops.map(op => this.enrichOperation(op, state));
  }

  static async createOperation(
    first: any,
    second?: any,
    third?: any
  ): Promise<CampaignOperationRecord> {
    let orgId: string;
    let data: any;
    let caller: { isPlatformOwner: boolean; organizationId: string; role?: string; userId?: string; email?: string };

    if (second && first?.user) {
      const session = first;
      orgId = session.organization?.id || session.user?.activeOrganizationId;
      const raw = second;
      data = {
        ...raw,
        plannedDate: raw.scheduledDate || raw.plannedDate,
        costAmount: raw.plannedCost || raw.costAmount || 0,
        costCurrency: raw.currency || raw.costCurrency || 'GNF'
      };
      caller = {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organizationId: orgId,
        isPlatformOwner: session.user.role === 'PLATFORM_OWNER'
      };
    } else {
      orgId = first;
      data = second;
      caller = third;
    }

    this.checkWriteAccess(orgId, caller);
    const state = getState();

    const campaign = state.production_campaigns.find(c => 
      c.id === data.campaignId && !c.is_deleted && (c.organization_id === orgId || caller.isPlatformOwner)
    );
    if (!campaign) {
      throw new Error('Associated production campaign does not exist');
    }
    if (campaign.status === 'CANCELLED') {
      throw new Error('Cannot add operations to a cancelled campaign');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Operation title is required');
    }
    if (!data.plannedDate) {
      throw new Error('Planned date is required');
    }

    const opId = randomUUID();
    let calEventId: string | null = null;

    // INTEGRATION WITH NORMAL CALENDAR:
    // Automatically generate synchronized Normal Calendar Event so users can open it from calendar!
    if (data.autoSyncCalendar !== false) {
      calEventId = randomUUID();
      const plannedDateObj = new Date(data.plannedDate);
      const isDone = data.status === 'COMPLETED';

      const calItem = {
        id: calEventId,
        organization_id: orgId,
        title: `[Agri] ${data.title.trim()}`,
        description: data.description || `Opération agricole pour ${campaign.name}`,
        event_type: 'TASK',
        status: isDone ? 'COMPLETED' : (data.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING'),
        priority: data.operationType === 'HARVEST' ? 'URGENT' : 'HIGH',
        start_datetime: `${data.plannedDate}T07:00:00Z`,
        end_datetime: `${data.plannedDate}T12:00:00Z`,
        all_day: false,
        timezone: 'Africa/Conakry',
        assigned_to_user_id: data.responsibleUserId || campaign.manager_user_id || null,
        farm_id: campaign.farm_id,
        plot_id: campaign.plot_id,
        linked_campaign_id: campaign.id,
        linked_master_operation_id: opId,
        notes: `Opération agricole (${data.operationType}). Ouvriers: ${data.laborWorkersCount || 'N/A'}`,
        created_by_user_id: caller.userId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        is_exception: false
      };

      state.normal_calendar_events.push(calItem);
    }

    const newOp = {
      id: opId,
      organization_id: orgId,
      campaign_id: data.campaignId,
      operation_type: data.operationType,
      title: data.title.trim(),
      description: data.description || null,
      planned_date: data.plannedDate,
      actual_date: data.actualDate || null,
      status: data.status || 'PLANNED',
      planned_quantity: data.plannedQuantity || null,
      actual_quantity: data.actualQuantity || null,
      quantity_unit: data.quantityUnit || null,
      labor_workers_count: data.laborWorkersCount || null,
      labor_hours: data.laborHours || null,
      cost_amount: data.costAmount || 0,
      cost_currency: data.costCurrency || 'GNF',
      responsible_user_id: data.responsibleUserId || null,
      field_team_id: data.fieldTeamId || null,
      equipment_id: data.equipmentId || null,
      input_id: data.inputId || null,
      input_batch_number: data.inputBatchNumber || null,
      input_quantity_used: data.inputQuantityUsed || null,
      pest_or_disease_name: data.pestOrDiseaseName || null,
      incidence_rate_pct: data.incidenceRatePct || null,
      severity_level: data.severityLevel || null,
      observation_notes: data.observationNotes || null,
      linked_calendar_event_id: calEventId,
      created_by_user_id: caller.userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    state.campaign_operations.push(newOp);

    // Update campaign budget spend if cost recorded
    if (data.costAmount && data.costAmount > 0) {
      campaign.budget_actual_spend = (campaign.budget_actual_spend || 0) + data.costAmount;
    }

    commitState(state);

    await logSecurityAudit({
      organizationId: orgId,
      userId: caller.userId,
      userRole: caller.role,
      action: 'AGRICULTURAL_OPERATION_CREATED',
      targetEntity: 'CAMPAIGN_OPERATIONS',
      targetEntityId: newOp.id,
      details: { campaignId: campaign.id, type: newOp.operation_type, title: newOp.title }
    });

    return this.enrichOperation(newOp, state);
  }

  static async updateOperation(
    operationId: string,
    orgId: string,
    updates: Partial<CampaignOperationRecord>,
    caller: { isPlatformOwner: boolean; organizationId: string; role?: string; userId?: string }
  ): Promise<CampaignOperationRecord> {
    this.checkWriteAccess(orgId, caller);
    const state = getState();
    const op = state.campaign_operations.find(o => 
      o.id === operationId && !o.is_deleted && (o.organization_id === orgId || caller.isPlatformOwner)
    );
    if (!op) {
      throw new Error(`Agricultural operation '${operationId}' not found`);
    }

    if (updates.title) op.title = updates.title.trim();
    if (updates.description !== undefined) op.description = updates.description;
    if (updates.status) op.status = updates.status;
    if (updates.actualDate !== undefined) op.actual_date = updates.actualDate;
    if (updates.actualQuantity !== undefined) op.actual_quantity = updates.actualQuantity;
    if (updates.observationNotes !== undefined) op.observation_notes = updates.observationNotes;
    if (updates.costAmount !== undefined) op.cost_amount = updates.costAmount;

    // Sync status with linked calendar event
    if (op.linked_calendar_event_id) {
      const calEvent = state.normal_calendar_events.find(e => e.id === op.linked_calendar_event_id);
      if (calEvent) {
        if (updates.status === 'COMPLETED') calEvent.status = 'COMPLETED';
        else if (updates.status === 'CANCELLED') calEvent.status = 'CANCELLED';
        else if (updates.status === 'IN_PROGRESS') calEvent.status = 'IN_PROGRESS';
        calEvent.updated_at = new Date().toISOString();
      }
    }

    op.updated_at = new Date().toISOString();
    commitState(state);

    return this.enrichOperation(op, state);
  }

  static async updateOperationStatus(
    first: any,
    second: any,
    third?: any
  ): Promise<CampaignOperationRecord> {
    if (first?.user) {
      const session = first;
      const opId = second;
      const updates = third || {};
      const orgId = session.organization?.id || session.user?.activeOrganizationId;
      const caller = {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organizationId: orgId,
        isPlatformOwner: session.user.role === 'PLATFORM_OWNER'
      };
      return this.updateOperation(opId, orgId, {
        status: updates.status,
        costAmount: updates.actualCost,
        observationNotes: updates.notes
      }, caller);
    } else {
      return this.updateOperation(first, second, third, third?.caller);
    }
  }

  // =========================================================================
  // 6. PARTIAL HARVESTS (Multiple harvest events per campaign preserving history)
  // =========================================================================

  static async listHarvests(
    orgId: string,
    campaignId?: string,
    caller: { isPlatformOwner: boolean; organizationId: string } = { isPlatformOwner: false, organizationId: orgId }
  ): Promise<CampaignHarvestRecord[]> {
    this.checkReadAccess(orgId, caller);
    const state = getState();

    let list = (state.campaign_harvests || []).filter(h => 
      !h.is_deleted && (h.organization_id === orgId || caller.isPlatformOwner)
    );

    if (campaignId && campaignId !== 'ALL') {
      list = list.filter(h => h.campaign_id === campaignId);
    }

    // Sort by harvest_date descending
    list.sort((a, b) => new Date(b.harvest_date).getTime() - new Date(a.harvest_date).getTime());

    return list.map(h => this.enrichHarvest(h, state));
  }

  static async recordHarvest(
    orgId: string,
    data: {
      campaignId: string;
      operationId?: string;
      harvestBatchNumber?: string;
      harvestDate: string;
      quantityHarvested: number;
      quantityUnit?: string;
      qualityGrade?: 'GRADE_A' | 'GRADE_B' | 'COMMERCIAL' | 'REJECTED';
      lossQuantity?: number;
      storageLocation?: string;
      moisturePct?: number;
      brixLevel?: number;
      workersCount?: number;
      supervisorUserId?: string;
      destination?: 'EXPORT' | 'LOCAL_MARKET' | 'PROCESSING' | 'STORAGE';
      notes?: string;
    },
    caller: { isPlatformOwner: boolean; organizationId: string; role?: string; userId?: string }
  ): Promise<CampaignHarvestRecord> {
    this.checkWriteAccess(orgId, caller);
    const state = getState();

    const campaign = state.production_campaigns.find(c => 
      c.id === data.campaignId && !c.is_deleted && (c.organization_id === orgId || caller.isPlatformOwner)
    );
    if (!campaign) {
      throw new Error('Production campaign not found');
    }
    if (data.quantityHarvested < 0) {
      throw new Error('Harvested quantity cannot be negative');
    }
    if ((data.lossQuantity || 0) < 0) {
      throw new Error('Loss quantity cannot be negative');
    }
    if (!data.harvestDate) {
      throw new Error('Harvest date is required');
    }

    const batchNumber = data.harvestBatchNumber?.trim() || 
      `HARV-${campaign.code}-${data.harvestDate.replace(/-/g, '')}-${state.campaign_harvests.length + 1}`;

    const newHarvest = {
      id: randomUUID(),
      organization_id: orgId,
      campaign_id: data.campaignId,
      operation_id: data.operationId || null,
      harvest_batch_number: batchNumber,
      harvest_date: data.harvestDate,
      quantity_harvested: data.quantityHarvested,
      quantity_unit: data.quantityUnit || campaign.production_target_unit || 'KG',
      quality_grade: data.qualityGrade || 'GRADE_A',
      loss_quantity: data.lossQuantity || 0,
      storage_location: data.storageLocation || null,
      moisture_pct: data.moisturePct || null,
      brix_level: data.brixLevel || null,
      workers_count: data.workersCount || 4,
      supervisor_user_id: data.supervisorUserId || caller.userId || null,
      destination: data.destination || 'LOCAL_MARKET',
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    state.campaign_harvests.push(newHarvest);

    // Update campaign status to HARVESTING if currently PLANNING or IN_PROGRESS
    if (campaign.status === 'PLANNING' || campaign.status === 'IN_PROGRESS') {
      campaign.status = 'HARVESTING';
    }

    commitState(state);

    await logSecurityAudit({
      organizationId: orgId,
      userId: caller.userId,
      userRole: caller.role,
      action: 'AGRICULTURAL_HARVEST_RECORDED',
      targetEntity: 'CAMPAIGN_HARVESTS',
      targetEntityId: newHarvest.id,
      details: {
        campaignId: campaign.id,
        batch: newHarvest.harvest_batch_number,
        quantity: newHarvest.quantity_harvested,
        grade: newHarvest.quality_grade
      }
    });

    return this.enrichHarvest(newHarvest, state);
  }

  // =========================================================================
  // ENRICHMENT HELPERS
  // =========================================================================

  private static enrichCampaign(c: any, state: any): ProductionCampaignMaster {
    const crop = state.crops.find((cp: any) => cp.id === c.crop_id);
    const variety = state.crop_varieties.find((v: any) => v.id === c.crop_variety_id);
    const farm = state.farms.find((f: any) => f.id === c.farm_id);
    const plot = state.plots.find((p: any) => p.id === c.plot_id);
    const manager = state.users.find((u: any) => u.id === c.manager_user_id);
    const team = state.field_teams.find((t: any) => t.id === c.field_team_id);
    const season = state.agricultural_seasons.find((s: any) => s.id === c.season_id);

    // Aggregate harvests
    const campaignHarvests = (state.campaign_harvests || []).filter((h: any) => h.campaign_id === c.id && !h.is_deleted);
    const totalHarvested = campaignHarvests.reduce((sum: number, h: any) => sum + Number(h.quantity_harvested || 0), 0);
    const progressPct = c.production_target_quantity > 0 
      ? Math.min(100, Math.round((totalHarvested / c.production_target_quantity) * 100))
      : 0;

    const opCount = (state.campaign_operations || []).filter((o: any) => o.campaign_id === c.id && !o.is_deleted).length;

    return {
      id: c.id,
      organizationId: c.organization_id,
      seasonId: c.season_id,
      seasonName: season ? season.name : undefined,
      name: c.name,
      code: c.code,
      farmId: c.farm_id,
      farmName: farm ? farm.name : undefined,
      plotId: c.plot_id,
      plotName: plot ? plot.name : undefined,
      cropId: c.crop_id,
      cropName: crop ? crop.name : undefined,
      cropVarietyId: c.crop_variety_id,
      cropVarietyName: variety ? variety.name : undefined,
      plannedArea: c.planned_area,
      areaUnit: c.area_unit,
      plannedAreaHa: c.planned_area_ha || c.planned_area,
      plantingWindowStart: c.planting_window_start,
      plantingWindowEnd: c.planting_window_end,
      expectedHarvestStart: c.expected_harvest_start,
      expectedHarvestEnd: c.expected_harvest_end,
      productionTargetQuantity: c.production_target_quantity,
      productionTargetUnit: c.production_target_unit,
      managerUserId: c.manager_user_id,
      managerName: manager ? manager.full_name : undefined,
      fieldTeamId: c.field_team_id,
      fieldTeamName: team ? team.name : undefined,
      status: c.status,
      budgetCode: c.budget_code,
      budgetAllocated: c.budget_allocated,
      budgetActualSpend: c.budget_actual_spend,
      budgetCurrency: c.budget_currency,
      plantingMethodId: c.planting_method_id,
      harvestingMethodId: c.harvesting_method_id,
      notes: c.notes,
      totalHarvestedQuantity: totalHarvested,
      harvestProgressPct: progressPct,
      operationsCount: opCount,
      createdByUserId: c.created_by_user_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      isDeleted: c.is_deleted
    };
  }

  private static enrichOperation(op: any, state: any): CampaignOperationRecord {
    const campaign = state.production_campaigns.find((c: any) => c.id === op.campaign_id);
    const crop = campaign ? state.crops.find((cp: any) => cp.id === campaign.crop_id) : undefined;
    const variety = campaign ? state.crop_varieties.find((v: any) => v.id === campaign.crop_variety_id) : undefined;
    const user = state.users.find((u: any) => u.id === op.responsible_user_id);
    const team = state.field_teams.find((t: any) => t.id === op.field_team_id);
    const equip = state.agricultural_equipment.find((e: any) => e.id === op.equipment_id);
    const inp = state.agricultural_inputs.find((i: any) => i.id === op.input_id);

    return {
      id: op.id,
      organizationId: op.organization_id,
      campaignId: op.campaign_id,
      campaignName: campaign ? campaign.name : undefined,
      cropName: crop ? crop.name : undefined,
      cropVarietyName: variety ? variety.name : undefined,
      operationType: op.operation_type,
      title: op.title,
      description: op.description,
      plannedDate: op.planned_date,
      actualDate: op.actual_date,
      status: op.status,
      plannedQuantity: op.planned_quantity,
      actualQuantity: op.actual_quantity,
      quantityUnit: op.quantity_unit,
      laborWorkersCount: op.labor_workers_count,
      laborHours: op.labor_hours,
      costAmount: op.cost_amount,
      costCurrency: op.cost_currency,
      responsibleUserId: op.responsible_user_id,
      responsibleUserName: user ? user.full_name : undefined,
      fieldTeamId: op.field_team_id,
      fieldTeamName: team ? team.name : undefined,
      equipmentId: op.equipment_id,
      equipmentName: equip ? equip.name : undefined,
      inputId: op.input_id,
      inputName: inp ? inp.name : undefined,
      inputBatchNumber: op.input_batch_number,
      inputQuantityUsed: op.input_quantity_used,
      pestOrDiseaseName: op.pest_or_disease_name,
      incidenceRatePct: op.incidence_rate_pct,
      severityLevel: op.severity_level,
      observationNotes: op.observation_notes,
      linkedCalendarEventId: op.linked_calendar_event_id,
      createdByUserId: op.created_by_user_id,
      createdAt: op.created_at,
      updatedAt: op.updated_at,
      isDeleted: op.is_deleted
    };
  }

  private static enrichHarvest(h: any, state: any): CampaignHarvestRecord {
    const campaign = state.production_campaigns.find((c: any) => c.id === h.campaign_id);
    const supervisor = state.users.find((u: any) => u.id === h.supervisor_user_id);

    return {
      id: h.id,
      organizationId: h.organization_id,
      campaignId: h.campaign_id,
      campaignName: campaign ? campaign.name : undefined,
      operationId: h.operation_id,
      harvestBatchNumber: h.harvest_batch_number,
      harvestDate: h.harvest_date,
      quantityHarvested: h.quantity_harvested,
      quantityUnit: h.quantity_unit,
      qualityGrade: h.quality_grade,
      lossQuantity: h.loss_quantity || 0,
      storageLocation: h.storage_location,
      moisturePct: h.moisture_pct,
      brixLevel: h.brix_level,
      workersCount: h.workers_count,
      supervisorUserId: h.supervisor_user_id,
      supervisorName: supervisor ? supervisor.full_name : undefined,
      destination: h.destination,
      notes: h.notes,
      createdAt: h.created_at,
      updatedAt: h.updated_at,
      isDeleted: h.is_deleted
    };
  }
}
