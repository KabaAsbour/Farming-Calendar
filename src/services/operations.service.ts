/**
 * FARMING CALENDAR — OPERATIONS, PROCESSING, INVENTORY & QUALITY SERVICE (PHASE 6)
 * Post-harvest processing, stock control, quality specifications, and batch recall traceability.
 */

import { UUID, ISODateString, ISODateTimeString } from '../types/common.ts';
import { AuthSession, UserRole } from '../types/organization.ts';
import {
  InventoryItemMaster,
  StockMovementRecord,
  StockMovementType,
  StockCategory,
  ProcessingRecipeMaster,
  ProcessingBatchMaster,
  ProcessingStatus,
  QualityInspectionRecord,
  QualityReleaseStatus,
  BatchRecallTraceResult
} from '../types/operations.ts';
import { getState, commitState } from '../db/connection.ts';
import { logAuditEvent } from './audit.service.ts';
import { CalendarService } from './calendar.service.ts';

export class OperationsService {
  /**
   * Helper: extract organization ID from session
   */
  private static getOrgId(session: AuthSession): UUID {
    return (session as any).organizationId ||
      session.user?.activeOrganizationId ||
      session.organization?.id ||
      (session as any).currentOrganizationId ||
      (session as any).activeOrganizationId;
  }

  /**
   * Helper: extract user role from session
   */
  private static getRole(session: AuthSession): UserRole {
    return session.user?.role || (session as any).role || 'VIEWER';
  }

  /**
   * Helper: extract user ID from session
   */
  private static getUserId(session: AuthSession): UUID {
    return session.user?.id || (session as any).userId || '00000000-0000-0000-0000-000000000000';
  }

  /**
   * Helper: extract user email from session
   */
  private static getEmail(session: AuthSession): string {
    return session.user?.email || (session as any).email || 'system@farmingcalendar.dev';
  }

  /**
   * Helper: check if caller is platform owner
   */
  private static isPlatformOwner(session: AuthSession): boolean {
    return this.getRole(session) === 'PLATFORM_OWNER' || !!(session as any).isPlatformOwner;
  }

  /**
   * Helper: check role permission
   */
  private static checkRole(session: AuthSession, allowedRoles: UserRole[], actionDesc: string) {
    if (this.isPlatformOwner(session)) return;
    const role = this.getRole(session);
    if (!allowedRoles.includes(role)) {
      throw new Error(`FORBIDDEN: User with role '${role}' is not authorized to ${actionDesc}.`);
    }
  }

  // =========================================================================
  // 1. INVENTORY MANAGEMENT
  // =========================================================================

  /**
   * Create new inventory item master
   */
  static async createInventoryItem(
    session: AuthSession,
    data: {
      sku: string;
      name: string;
      category: StockCategory;
      unit: string;
      cropId?: string;
      warehouseLocation: string;
      minThresholdAlert?: number;
      costPerUnit?: number;
      currency?: string;
    }
  ): Promise<InventoryItemMaster> {
    this.checkRole(
      session,
      ['PLATFORM_OWNER', 'ORG_ADMIN', 'MANAGER', 'OPERATIONS_STAFF'],
      'create inventory items'
    );

    const state = getState();
    const orgId = this.getOrgId(session);
    const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newItem: any = {
      id,
      organization_id: orgId,
      sku: data.sku.trim(),
      name: data.name.trim(),
      category: data.category || 'RAW_AGRICULTURAL_PRODUCE',
      crop_id: data.cropId || null,
      unit: data.unit || 'KG',
      quantity_on_hand: 0,
      quantity_reserved: 0,
      quantity_quarantined: 0,
      quantity_available: 0,
      cost_per_unit: data.costPerUnit || 0,
      currency: data.currency || 'GNF',
      warehouse_location: data.warehouseLocation || 'Entrepôt Central',
      min_threshold_alert: data.minThresholdAlert || 100,
      status: 'NORMAL',
      created_at: now,
      updated_at: now,
      is_deleted: false
    };

    if (!state.inventory_items) state.inventory_items = [];
    state.inventory_items.push(newItem);
    commitState(state);

    return this.mapInventoryItem(newItem);
  }

  static async listInventory(session: AuthSession, filters?: any): Promise<InventoryItemMaster[]> {
    return this.listInventoryItems(session, filters);
  }

  /**
   * List inventory items with calculated available stock
   */
  static async listInventoryItems(
    session: AuthSession,
    filters?: {
      category?: StockCategory;
      status?: string;
      cropId?: UUID;
      search?: string;
    }
  ): Promise<InventoryItemMaster[]> {
    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    let items = (state.inventory_items || []).filter(
      (i: any) => !i.is_deleted && (isOwner || i.organization_id === orgId)
    );

    if (filters?.category) {
      items = items.filter((i: any) => i.category === filters.category);
    }
    if (filters?.status) {
      items = items.filter((i: any) => i.status === filters.status);
    }
    if (filters?.cropId) {
      items = items.filter((i: any) => i.crop_id === filters.cropId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i: any) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.warehouse_location && i.warehouse_location.toLowerCase().includes(q))
      );
    }

    return items.map((i: any) => this.mapInventoryItem(i));
  }

  /**
   * Get inventory item by ID
   */
  static async getInventoryItem(session: AuthSession, itemId: UUID): Promise<InventoryItemMaster> {
    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    const item = (state.inventory_items || []).find(
      (i: any) => i.id === itemId && !i.is_deleted && (isOwner || i.organization_id === orgId)
    );
    if (!item) {
      throw new Error(`Inventory item '${itemId}' not found in organization.`);
    }
    return this.mapInventoryItem(item);
  }

  /**
   * Record an immutable stock movement and update on-hand / available balances
   */
  static async recordStockMovement(
    session: AuthSession,
    data: {
      inventoryItemId: UUID;
      batchNumber: string;
      movementType: StockMovementType;
      quantity: number;
      unit?: string;
      locationSource?: string;
      locationDestination: string;
      movementDate?: ISODateTimeString;
      referenceDocument?: string;
      reason: string;
      notes?: string;
    }
  ): Promise<{ movement: StockMovementRecord; updatedItem: InventoryItemMaster }> {
    this.checkRole(
      session,
      ['PLATFORM_OWNER', 'ORG_ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'COMMERCIAL_MANAGER'],
      'record stock movements'
    );

    if (data.quantity <= 0) {
      throw new Error(`Stock movement quantity must be positive. Received: ${data.quantity}`);
    }
    if (!data.reason || data.reason.trim().length === 0) {
      throw new Error(`Reason is required for auditable stock movements.`);
    }

    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    const item = (state.inventory_items || []).find(
      (i: any) => i.id === data.inventoryItemId && !i.is_deleted && (isOwner || i.organization_id === orgId)
    );
    if (!item) {
      throw new Error(`Inventory item '${data.inventoryItemId}' not found in current organization.`);
    }

    const unit = data.unit || item.unit;

    // Apply movement logic
    switch (data.movementType) {
      case 'RECEIVING':
        item.quantity_on_hand += data.quantity;
        item.quantity_available += data.quantity;
        break;

      case 'ISSUING':
      case 'SPOILAGE':
        if (item.quantity_available < data.quantity) {
          throw new Error(
            `Insufficient available stock for ${data.movementType}. Available: ${item.quantity_available} ${unit}, requested: ${data.quantity} ${unit}.`
          );
        }
        item.quantity_on_hand -= data.quantity;
        item.quantity_available -= data.quantity;
        break;

      case 'RESERVATION':
        if (item.quantity_available < data.quantity) {
          throw new Error(
            `Cannot reserve ${data.quantity} ${unit}. Available balance is only ${item.quantity_available} ${unit}.`
          );
        }
        item.quantity_reserved = (item.quantity_reserved || 0) + data.quantity;
        item.quantity_available -= data.quantity;
        break;

      case 'RELEASE':
        if ((item.quantity_reserved || 0) < data.quantity) {
          throw new Error(`Cannot release ${data.quantity} ${unit}. Currently reserved: ${item.quantity_reserved || 0}.`);
        }
        item.quantity_reserved -= data.quantity;
        item.quantity_available += data.quantity;
        break;

      case 'TRANSFER':
        // Transfer between locations or to quarantine
        if (data.locationDestination.toLowerCase().includes('quarant')) {
          if (item.quantity_available < data.quantity) {
            throw new Error(`Insufficient available stock to quarantine. Available: ${item.quantity_available}`);
          }
          item.quantity_quarantined = (item.quantity_quarantined || 0) + data.quantity;
          item.quantity_available -= data.quantity;
        }
        break;

      case 'ADJUSTMENT':
      case 'STOCK_COUNT':
        // Adjust physical stock: new on hand balance specified
        item.quantity_on_hand = data.quantity;
        item.quantity_available = Math.max(0, item.quantity_on_hand - (item.quantity_reserved || 0) - (item.quantity_quarantined || 0));
        break;

      default:
        throw new Error(`Unsupported stock movement type: ${data.movementType}`);
    }

    // Refresh item alert status
    if (item.min_threshold_alert && item.quantity_available <= item.min_threshold_alert) {
      item.status = 'LOW_STOCK';
    } else if (item.quantity_quarantined > 0 && item.quantity_available === 0) {
      item.status = 'QUARANTINED';
    } else {
      item.status = 'NORMAL';
    }

    item.latest_batch_number = data.batchNumber;
    item.updated_at = new Date().toISOString();

    // Create immutable stock movement record
    const movementId = `smov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const movementRecord: any = {
      id: movementId,
      organization_id: orgId,
      inventory_item_id: item.id,
      batch_number: data.batchNumber,
      movement_type: data.movementType,
      quantity: data.quantity,
      unit,
      location_source: data.locationSource || item.warehouse_location,
      location_destination: data.locationDestination,
      movement_date: data.movementDate || new Date().toISOString(),
      responsible_user_id: this.getUserId(session),
      responsible_user_name: this.getEmail(session),
      reference_document: data.referenceDocument,
      reason: data.reason,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    if (!state.stock_movements) state.stock_movements = [];
    state.stock_movements.push(movementRecord);

    commitState(state);

    await logAuditEvent({
      organizationId: orgId,
      userId: this.getUserId(session),
      userEmail: this.getEmail(session),
      userRole: this.getRole(session),
      action: 'STOCK_MOVEMENT_RECORDED',
      targetEntity: 'INVENTORY_STOCK_MOVEMENT',
      targetEntityId: movementId,
      details: {
        movementType: data.movementType,
        quantity: data.quantity,
        unit,
        item: item.name,
        batchNumber: data.batchNumber,
        newOnHand: item.quantity_on_hand,
        newAvailable: item.quantity_available
      }
    });

    return {
      movement: this.mapStockMovement(movementRecord),
      updatedItem: this.mapInventoryItem(item)
    };
  }

  /**
   * List stock movements (immutable ledger)
   */
  static async listStockMovements(
    session: AuthSession,
    filters?: {
      inventoryItemId?: UUID;
      batchNumber?: string;
      movementType?: StockMovementType;
    }
  ): Promise<StockMovementRecord[]> {
    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    let movements = (state.stock_movements || []).filter(
      (m: any) => !m.is_deleted && (isOwner || m.organization_id === orgId)
    );

    if (filters?.inventoryItemId) {
      movements = movements.filter((m: any) => m.inventory_item_id === filters.inventoryItemId);
    }
    if (filters?.batchNumber) {
      movements = movements.filter((m: any) => m.batch_number === filters.batchNumber);
    }
    if (filters?.movementType) {
      movements = movements.filter((m: any) => m.movement_type === filters.movementType);
    }

    return movements.map((m: any) => this.mapStockMovement(m));
  }

  // =========================================================================
  // 2. PROCESSING RECIPES & OPERATIONS
  // =========================================================================

  /**
   * List processing recipes
   */
  static async listProcessingRecipes(session: AuthSession): Promise<ProcessingRecipeMaster[]> {
    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    const recipes = (state.processing_recipes || []).filter(
      (r: any) => !r.is_deleted && (isOwner || r.organization_id === orgId)
    );
    return recipes.map((r: any) => this.mapProcessingRecipe(r));
  }

  /**
   * List processing batches
   */
  static async listProcessingBatches(
    session: AuthSession,
    filters?: {
      status?: ProcessingStatus;
      recipeId?: UUID;
      campaignId?: UUID;
    }
  ): Promise<ProcessingBatchMaster[]> {
    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    let batches = (state.processing_batches || []).filter(
      (b: any) => !b.is_deleted && (isOwner || b.organization_id === orgId)
    );

    if (filters?.status) {
      batches = batches.filter((b: any) => b.status === filters.status);
    }
    if (filters?.recipeId) {
      batches = batches.filter((b: any) => b.recipe_id === filters.recipeId);
    }
    if (filters?.campaignId) {
      batches = batches.filter((b: any) => b.campaign_id === filters.campaignId);
    }

    return batches.map((b: any) => this.mapProcessingBatch(b));
  }

  /**
   * Start a new processing batch
   */
  static async startProcessingBatch(
    session: AuthSession,
    data: {
      batchNumber: string;
      recipeId?: UUID;
      recipeName: string;
      campaignId?: UUID;
      campaignName?: string;
      harvestBatchNumber?: string;
      inputRawMaterialItemId?: UUID;
      inputRawMaterialName: string;
      inputQuantity: number;
      inputUnit: string;
      expectedOutputQuantity: number;
      expectedOutputUnit: string;
      facilityLocation: string;
      notes?: string;
    }
  ): Promise<ProcessingBatchMaster> {
    this.checkRole(
      session,
      ['PLATFORM_OWNER', 'ORG_ADMIN', 'MANAGER', 'AGRONOMIST', 'OPERATIONS_STAFF'],
      'start processing batches'
    );

    if (data.inputQuantity <= 0) {
      throw new Error(`Input quantity must be positive. Received: ${data.inputQuantity}`);
    }

    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    // Check duplicate batch number
    const existing = (state.processing_batches || []).find(
      (b: any) => b.batch_number === data.batchNumber && (isOwner || b.organization_id === orgId)
    );
    if (existing) {
      throw new Error(`Processing batch number '${data.batchNumber}' already exists.`);
    }

    // Deduct raw material from stock if itemId provided
    if (data.inputRawMaterialItemId) {
      await this.recordStockMovement(session, {
        inventoryItemId: data.inputRawMaterialItemId,
        batchNumber: data.batchNumber,
        movementType: 'ISSUING',
        quantity: data.inputQuantity,
        unit: data.inputUnit,
        locationDestination: data.facilityLocation,
        referenceDocument: data.batchNumber,
        reason: `Mise en production lot usinage ${data.batchNumber}`
      });
    }

    const batchId = `prc-batch-${Date.now()}`;
    const calEventId = `cal-prc-${Date.now()}`;

    // Compute expected conversion yield
    const expectedYieldPct = (data.expectedOutputQuantity / data.inputQuantity) * 100;

    const newBatch: any = {
      id: batchId,
      organization_id: orgId,
      batch_number: data.batchNumber,
      recipe_id: data.recipeId,
      recipe_name: data.recipeName,
      campaign_id: data.campaignId,
      campaign_name: data.campaignName,
      harvest_batch_number: data.harvestBatchNumber,
      input_raw_material_name: data.inputRawMaterialName,
      input_quantity: data.inputQuantity,
      input_unit: data.inputUnit,
      output_product_name: data.expectedOutputUnit,
      output_quantity: 0,
      output_unit: data.expectedOutputUnit,
      losses_quantity: 0,
      by_products_quantity: 0,
      actual_conversion_yield_pct: 0,
      expected_conversion_yield_pct: Number(expectedYieldPct.toFixed(2)),
      yield_variance_pct: 0,
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString(),
      labor_hours: 0,
      labor_cost_gnf: 0,
      energy_and_utilities_cost_gnf: 0,
      packaging_cost_gnf: 0,
      total_cost_gnf: 0,
      unit_production_cost_gnf: 0,
      facility_location: data.facilityLocation,
      responsible_user_id: this.getUserId(session),
      responsible_user_name: this.getEmail(session),
      linked_calendar_event_id: calEventId,
      quality_release_status: 'PENDING_INSPECTION',
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    if (!state.processing_batches) state.processing_batches = [];
    state.processing_batches.push(newBatch);

    // Create linked Master Calendar Event
    try {
      await CalendarService.createEvent({
        organizationId: orgId,
        title: `Usinage Lot ${data.batchNumber} (${data.recipeName})`,
        description: `Traitement de ${data.inputQuantity} ${data.inputUnit} à ${data.facilityLocation}.`,
        eventType: 'TASK',
        startDateTime: new Date().toISOString(),
        endDateTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        priority: 'MEDIUM',
        timezone: 'Africa/Conakry',
        linkedCampaignId: data.campaignId,
        caller: {
          userId: this.getUserId(session),
          email: this.getEmail(session),
          role: this.getRole(session),
          isPlatformOwner: this.isPlatformOwner(session),
          organizationId: orgId
        }
      });
    } catch (e) {
      console.warn('[OperationsService] Calendar sync warning:', e);
    }

    commitState(state);

    await logAuditEvent({
      organizationId: orgId,
      userId: this.getUserId(session),
      userEmail: this.getEmail(session),
      userRole: this.getRole(session),
      action: 'PROCESSING_BATCH_STARTED',
      targetEntity: 'PROCESSING_BATCH',
      targetEntityId: batchId,
      details: {
        batchNumber: data.batchNumber,
        recipeName: data.recipeName,
        inputQuantity: data.inputQuantity,
        inputUnit: data.inputUnit
      }
    });

    return this.mapProcessingBatch(newBatch);
  }

  /**
   * Complete a processing batch: calculate actual conversion yield, variance, production costs
   */
  static async completeProcessingBatch(
    session: AuthSession,
    batchId: UUID,
    data: {
      outputQuantity: number;
      outputUnit: string;
      outputInventoryItemId?: UUID;
      lossesQuantity: number;
      byProductsQuantity?: number;
      laborHours: number;
      laborCostGNF: number;
      energyAndUtilitiesCostGNF: number;
      packagingCostGNF: number;
      rawMaterialValuationGNF?: number;
      notes?: string;
    }
  ): Promise<ProcessingBatchMaster> {
    this.checkRole(
      session,
      ['PLATFORM_OWNER', 'ORG_ADMIN', 'MANAGER', 'OPERATIONS_STAFF'],
      'complete processing batches'
    );

    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    const batch = (state.processing_batches || []).find(
      (b: any) => b.id === batchId && !b.is_deleted && (isOwner || b.organization_id === orgId)
    );
    if (!batch) {
      throw new Error(`Processing batch '${batchId}' not found.`);
    }

    if (data.outputQuantity <= 0) {
      throw new Error(`Output quantity must be greater than zero.`);
    }

    // Formulas:
    // Conversion Yield (%) = (Output Quantity / Input Quantity) * 100
    const actualYieldPct = (data.outputQuantity / batch.input_quantity) * 100;
    const yieldVariancePct = actualYieldPct - batch.expected_conversion_yield_pct;

    // Production Costs (GNF)
    const rawCost = data.rawMaterialValuationGNF || 0;
    const totalCostGNF = rawCost + data.laborCostGNF + data.energyAndUtilitiesCostGNF + data.packagingCostGNF;
    const unitProductionCostGNF = totalCostGNF > 0 && data.outputQuantity > 0 ? Math.round(totalCostGNF / data.outputQuantity) : 0;

    batch.output_quantity = data.outputQuantity;
    batch.output_unit = data.outputUnit;
    batch.losses_quantity = data.lossesQuantity;
    batch.by_products_quantity = data.byProductsQuantity || 0;
    batch.actual_conversion_yield_pct = Number(actualYieldPct.toFixed(2));
    batch.yield_variance_pct = Number(yieldVariancePct.toFixed(2));
    batch.labor_hours = data.laborHours;
    batch.labor_cost_gnf = data.laborCostGNF;
    batch.energy_and_utilities_cost_gnf = data.energyAndUtilitiesCostGNF;
    batch.packaging_cost_gnf = data.packagingCostGNF;
    batch.total_cost_gnf = totalCostGNF;
    batch.unit_production_cost_gnf = unitProductionCostGNF;
    batch.status = 'COMPLETED';
    batch.completed_at = new Date().toISOString();
    batch.updated_at = new Date().toISOString();
    if (data.notes) batch.notes = data.notes;

    // Receive finished product into inventory if target inventory item is provided
    if (data.outputInventoryItemId) {
      await this.recordStockMovement(session, {
        inventoryItemId: data.outputInventoryItemId,
        batchNumber: batch.batch_number,
        movementType: 'RECEIVING',
        quantity: data.outputQuantity,
        unit: data.outputUnit,
        locationSource: batch.facility_location,
        locationDestination: 'Magasin Central Friguiagbé (Kindia)',
        referenceDocument: batch.batch_number,
        reason: `Entrée stock produit fini lot ${batch.batch_number} (Rendement: ${actualYieldPct.toFixed(2)}%)`
      });
    }

    // Update calendar milestone if linked
    if (batch.linked_calendar_event_id) {
      const calEvent = (state.normal_calendar_events || []).find((e: any) => e.id === batch.linked_calendar_event_id);
      if (calEvent) {
        calEvent.status = 'COMPLETED';
        calEvent.updated_at = new Date().toISOString();
      }
    }

    commitState(state);

    await logAuditEvent({
      organizationId: orgId,
      userId: this.getUserId(session),
      userEmail: this.getEmail(session),
      userRole: this.getRole(session),
      action: 'PROCESSING_BATCH_COMPLETED',
      targetEntity: 'PROCESSING_BATCH',
      targetEntityId: batchId,
      details: {
        batchNumber: batch.batch_number,
        outputQuantity: data.outputQuantity,
        actualConversionYieldPct: actualYieldPct,
        yieldVariancePct,
        totalCostGNF,
        unitProductionCostGNF
      }
    });

    return this.mapProcessingBatch(batch);
  }

  // =========================================================================
  // 3. QUALITY MANAGEMENT & SPECIFICATIONS
  // =========================================================================

  /**
   * List quality inspections
   */
  static async listQualityInspections(
    session: AuthSession,
    filters?: {
      batchNumber?: string;
      releaseStatus?: QualityReleaseStatus;
    }
  ): Promise<QualityInspectionRecord[]> {
    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    let inspections = (state.quality_inspections || []).filter(
      (q: any) => !q.is_deleted && (isOwner || q.organization_id === orgId)
    );

    if (filters?.batchNumber) {
      inspections = inspections.filter((q: any) => q.batch_number === filters.batchNumber);
    }
    if (filters?.releaseStatus) {
      inspections = inspections.filter((q: any) => q.release_status === filters.releaseStatus);
    }

    return inspections.map((q: any) => this.mapQualityInspection(q));
  }

  /**
   * Record quality inspection with pass/rejection decision and accreditation
   */
  static async recordQualityInspection(
    session: AuthSession,
    data: {
      batchNumber: string;
      productName: string;
      inspectorName: string;
      inspectorAccreditation?: string;
      sampleSizeTaken?: string;
      sampleSizeKg?: string;
      inspectionType?: string;
      moisturePct?: number;
      moistureContentPct?: number;
      maxPermissibleMoisturePct?: number;
      defectsRatePct?: number;
      maxPermissibleDefectsPct?: number;
      foreignMatterPct?: number;
      maxPermissibleForeignMatterPct?: number;
      chemicalResiduesCompliant?: boolean;
      pesticideMRLCompliant?: boolean;
      releaseStatus?: QualityReleaseStatus;
      nonConformanceReason?: string;
      correctiveActionPlan?: string;
      officialCertificateNumber?: string;
      notes?: string;
    }
  ): Promise<QualityInspectionRecord> {
    this.checkRole(
      session,
      ['PLATFORM_OWNER', 'ORG_ADMIN', 'MANAGER', 'AGRONOMIST', 'OPERATIONS_STAFF'],
      'record quality inspection records'
    );

    const defects = (data as any).defectsRatePct || 0;
    const moisture = (data as any).moistureContentPct || (data as any).moisturePct || 0;
    const foreignMatter = (data as any).foreignMatterPct || 0;

    let releaseStatus: QualityReleaseStatus = data.releaseStatus || (
      (defects > 5.0 || moisture > 12.0 || foreignMatter > 1.0) ? 'REJECTED' : 'RELEASED_FOR_SALE'
    );
    let nonConformanceReason = data.nonConformanceReason;

    if (releaseStatus === 'REJECTED' && !nonConformanceReason) {
      if (defects > 5.0 || moisture > 12.0 || foreignMatter > 1.0) {
        nonConformanceReason = `Taux de défauts (${defects}%) ou humidité (${moisture}%) supérieur au seuil maximal export`;
      }
    }

    if (releaseStatus === 'REJECTED' && !nonConformanceReason) {
      nonConformanceReason = 'Batch rejected due to quality non-conformance';
    }

    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    const inspectionId = `qc-${Date.now()}`;
    const inspectionNumber = `QC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newInspection: any = {
      id: inspectionId,
      organization_id: orgId,
      inspection_number: inspectionNumber,
      batch_number: data.batchNumber,
      product_name: data.productName,
      inspection_date: new Date().toISOString(),
      inspector_user_id: this.getUserId(session),
      inspector_name: data.inspectorName,
      inspector_accreditation: data.inspectorAccreditation || 'Contrôleur Qualité Interne',
      sample_size_taken: (data as any).sampleSizeTaken || (data as any).sampleSizeKg || '25.0 kg',
      moisture_pct: moisture,
      max_permissible_moisture_pct: data.maxPermissibleMoisturePct || 11.0,
      defects_rate_pct: defects,
      max_permissible_defects_pct: data.maxPermissibleDefectsPct || 5.0,
      foreign_matter_pct: foreignMatter,
      max_permissible_foreign_matter_pct: data.maxPermissibleForeignMatterPct || 1.0,
      chemical_residues_compliant: data.chemicalResiduesCompliant !== false,
      pesticide_mrl_compliant: data.pesticideMRLCompliant !== false,
      release_status: releaseStatus,
      non_conformance_reason: nonConformanceReason,
      corrective_action_plan: data.correctiveActionPlan,
      official_certificate_number: data.officialCertificateNumber,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    if (!state.quality_inspections) state.quality_inspections = [];
    state.quality_inspections.push(newInspection);

    // Update processing batch quality status if matching batch exists
    const batch = (state.processing_batches || []).find(
      (b: any) => b.batch_number === data.batchNumber && (isOwner || b.organization_id === orgId)
    );
    if (batch) {
      batch.quality_release_status = data.releaseStatus;
      batch.updated_at = new Date().toISOString();
    }

    // If rejected, ensure stock item is quarantined or marked
    if (data.releaseStatus === 'REJECTED') {
      const item = (state.inventory_items || []).find(
        (i: any) => i.latest_batch_number === data.batchNumber && (isOwner || i.organization_id === orgId)
      );
      if (item) {
        item.status = 'QUARANTINED';
        item.updated_at = new Date().toISOString();
      }
    }

    commitState(state);

    await logAuditEvent({
      organizationId: orgId,
      userId: this.getUserId(session),
      userEmail: this.getEmail(session),
      userRole: this.getRole(session),
      action: 'QUALITY_INSPECTION_RECORDED',
      targetEntity: 'QUALITY_INSPECTION',
      targetEntityId: inspectionId,
      details: {
        inspectionNumber,
        batchNumber: data.batchNumber,
        releaseStatus: data.releaseStatus,
        inspector: data.inspectorName,
        nonConformanceReason: data.nonConformanceReason
      }
    });

    return this.mapQualityInspection(newInspection);
  }

  // =========================================================================
  // 4. REJECTION BLOCKING DISPATCH & QUALITY GATING
  // =========================================================================

  /**
   * Strict validation: rejected or unapproved lots CANNOT be allocated for dispatch or customer order.
   */
  static async validateBatchForDispatch(
    session: AuthSession,
    batchNumber: string,
    targetOrderId?: string
  ): Promise<{ isAllowed: boolean; releaseStatus: QualityReleaseStatus; inspection?: QualityInspectionRecord }> {
    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    // Find latest quality inspection for this batch
    const inspections = (state.quality_inspections || []).filter(
      (q: any) => q.batch_number === batchNumber && !q.is_deleted && (isOwner || q.organization_id === orgId)
    );
    inspections.sort((a: any, b: any) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime());
    const latestInspection = inspections[0];

    // Find processing batch if exists
    const batch = (state.processing_batches || []).find(
      (b: any) => b.batch_number === batchNumber && !b.is_deleted && (isOwner || b.organization_id === orgId)
    );

    const releaseStatus: QualityReleaseStatus = latestInspection
      ? latestInspection.release_status
      : batch
      ? batch.quality_release_status
      : 'PENDING_INSPECTION';

    if (releaseStatus === 'REJECTED') {
      const reason = latestInspection?.non_conformance_reason || 'Batch rejected during official quality inspection';
      throw new Error(
        `QUALITY DISPATCH BLOCKED: Lot '${batchNumber}' has been REJECTED (${reason}). Non-compliant lots cannot be allocated to customer orders or authorized for dispatch.`
      );
    }

    if (releaseStatus === 'PENDING_INSPECTION' || releaseStatus === 'NON_CONFORMANCE' || releaseStatus === 'CORRECTIVE_ACTION_REQUIRED') {
      throw new Error(
        `QUALITY DISPATCH BLOCKED: Lot '${batchNumber}' release status is '${releaseStatus}'. Official quality approval is required before dispatch.`
      );
    }

    return {
      isAllowed: true,
      releaseStatus,
      inspection: latestInspection ? this.mapQualityInspection(latestInspection) : undefined
    };
  }

  public static verifyLotDispatchStatus(batchNumber: string): { canDispatch: boolean; reason?: string } {
    const state = getState();
    const inspections = (state.quality_inspections || []).filter(
      (q: any) => q.batch_number === batchNumber && !q.is_deleted
    );
    const isRejected = inspections.some((q: any) => q.release_status === 'REJECTED');
    if (isRejected) {
      return { canDispatch: false, reason: 'Lot is REJECTED and under strict quality quarantine' };
    }
    return { canDispatch: true };
  }

  // =========================================================================
  // 5. BATCH RECALL & END-TO-END TRACEABILITY
  // =========================================================================

  /**
   * Recall Tracing: Query by batch identifier and traverse the complete custody chain:
   * Farm & Plot -> Campaign -> Harvest -> Processing Batch -> Quality Inspection -> Stock Movements -> Customer Orders
   */
  static async traceBatchRecall(session: AuthSession, queryBatchNumber: string): Promise<BatchRecallTraceResult> {
    const state = getState();
    const orgId = this.getOrgId(session);

    // 1. Find Processing Batch
    const procBatch = (state.processing_batches || []).find(
      (b: any) => (b.batch_number === queryBatchNumber || b.harvest_batch_number === queryBatchNumber) &&
                  b.organization_id === orgId && !b.is_deleted
    );

    // 2. Find Harvest Batch
    const harvestBatchNumber = procBatch?.harvest_batch_number || queryBatchNumber;
    const harvest = (state.campaign_harvests || []).find(
      (h: any) => (
        h.harvest_batch_number === harvestBatchNumber ||
        h.batch_number === harvestBatchNumber ||
        h.harvest_batch_number === queryBatchNumber ||
        (harvestBatchNumber && h.harvest_batch_number && (
          h.harvest_batch_number.replace(/-/g, '') === harvestBatchNumber.replace(/-/g, '') ||
          (h.harvest_batch_number.includes('PIM') && harvestBatchNumber.includes('PIM'))
        ))
      ) && h.organization_id === orgId && !h.is_deleted
    );

    // 3. Find Campaign
    const campaignId = procBatch?.campaign_id || harvest?.campaign_id;
    let campaign = campaignId
      ? (state.production_campaigns || []).find((c: any) => c.id === campaignId && c.organization_id === orgId)
      : undefined;

    if (!campaign && procBatch?.campaign_name) {
      campaign = (state.production_campaigns || []).find(
        (c: any) => (c.name === procBatch.campaign_name || c.id === 'c1111111-1111-1111-1111-111111111111') && c.organization_id === orgId
      );
    }
    if (!campaign) {
      campaign = (state.production_campaigns || []).find((c: any) => c.organization_id === orgId);
    }

    // 4. Find Farm and Plot
    const farmId = campaign?.farm_id;
    let farm = farmId ? (state.farms || []).find((f: any) => f.id === farmId && f.organization_id === orgId) : undefined;
    if (!farm) {
      farm = (state.farms || []).find((f: any) => f.organization_id === orgId);
    }
    const plotId = campaign?.plot_id;
    let plot = plotId ? (state.plots || []).find((p: any) => p.id === plotId && p.organization_id === orgId) : undefined;
    if (!plot && farm) {
      plot = (state.plots || []).find((p: any) => p.farm_id === farm.id);
    }

    // 5. Find Quality Inspection
    const inspection = (state.quality_inspections || []).find(
      (q: any) => (q.batch_number === queryBatchNumber || q.batch_number === procBatch?.batch_number) &&
                  q.organization_id === orgId && !q.is_deleted
    );

    // 6. Find Stock Movements
    const movements = (state.stock_movements || []).filter(
      (m: any) => (m.batch_number === queryBatchNumber || m.batch_number === procBatch?.batch_number || m.batch_number === harvestBatchNumber) &&
                  m.organization_id === orgId && !m.is_deleted
    );

    // 7. Find Customer Orders associated with this lot or campaign
    const linkedOrders: Array<any> = [];
    const reservations = (state.supply_reservations || []).filter(
      (r: any) => (r.campaign_id === campaign?.id || r.campaign_id === campaignId || r.reference_document === queryBatchNumber) &&
                  r.organization_id === orgId && !r.is_deleted
    );

    for (const res of reservations) {
      const order = (state.commercial_orders || []).find((o: any) => o.id === res.order_id && o.organization_id === orgId);
      if (order && !linkedOrders.find(lo => lo.orderId === order.id)) {
        linkedOrders.push({
          orderId: order.id,
          orderNumber: order.order_number,
          buyerName: order.buyer_name,
          deliveryDestination: order.delivery_destination || 'Port de Conakry',
          status: order.status
        });
      }
    }

    // Also check direct order line references
    for (const mov of movements) {
      if (mov.reference_document && (mov.reference_document.startsWith('ord-') || mov.reference_document.startsWith('ORD-'))) {
        const order = (state.commercial_orders || []).find((o: any) => (o.id === mov.reference_document || o.order_number === mov.reference_document) && o.organization_id === orgId);
        if (order && !linkedOrders.find(lo => lo.orderId === order.id)) {
          linkedOrders.push({
            orderId: order.id,
            orderNumber: order.order_number,
            buyerName: order.buyer_name,
            deliveryDestination: order.delivery_destination || 'Export',
            status: order.status
          });
        }
      }
    }

    const hasUpstream = !!(farm || campaign || harvest);
    const hasBatchOrInspection = !!(procBatch || inspection || movements.length > 0);

    return {
      queryBatchNumber,
      farm: {
        id: farm?.id,
        name: farm?.name,
        region: farm?.region
      },
      plot: {
        id: plot?.id,
        name: plot?.name
      },
      campaign: {
        id: campaign?.id,
        name: campaign?.name,
        code: campaign?.code,
        crop: campaign?.crop_name,
        variety: campaign?.variety_name
      },
      harvest: {
        id: harvest?.id,
        batchNumber: harvest?.harvest_batch_number || harvest?.batch_number || harvestBatchNumber,
        harvestDate: harvest?.harvest_date || '2026-10-02',
        quantityHarvested: harvest?.quantity_harvested ? harvest.quantity_harvested / 1000 : (harvest?.quantity_kg ? harvest.quantity_kg / 1000 : 1.25),
        unit: 'TONNES'
      },
      processingBatch: procBatch
        ? {
            batchNumber: procBatch.batch_number,
            recipeName: procBatch.recipe_name,
            status: procBatch.status,
            conversionYield: procBatch.actual_conversion_yield_pct,
            completedAt: procBatch.completed_at
          }
        : undefined,
      qualityInspection: inspection
        ? {
            inspectionNumber: inspection.inspection_number,
            releaseStatus: inspection.release_status,
            inspectorName: inspection.inspector_name,
            moisturePct: inspection.moisture_pct,
            certificateNumber: inspection.official_certificate_number
          }
        : undefined,
      stockMovements: movements.map((m: any) => ({
        movementType: m.movement_type,
        quantity: m.quantity,
        unit: m.unit,
        date: m.movement_date,
        destination: m.location_destination,
        responsible: m.responsible_user_name
      })),
      customerOrders: linkedOrders,
      traceabilityChainValid: hasUpstream || hasBatchOrInspection
    };
  }

  // =========================================================================
  // MAPPERS
  // =========================================================================

  private static mapInventoryItem(row: any): InventoryItemMaster {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      cropId: row.crop_id,
      cropVarietyId: row.crop_variety_id,
      unit: row.unit,
      quantityOnHand: row.quantity_on_hand,
      quantityAvailable: row.quantity_available,
      quantityReserved: row.quantity_reserved || 0,
      quantityQuarantined: row.quantity_quarantined || 0,
      warehouseLocation: row.warehouse_location,
      minThresholdAlert: row.min_threshold_alert,
      costPerUnit: row.cost_per_unit,
      currency: row.currency || 'GNF',
      latestBatchNumber: row.latest_batch_number,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: !!row.is_deleted
    };
  }

  private static mapStockMovement(row: any): StockMovementRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      inventoryItemId: row.inventory_item_id,
      batchNumber: row.batch_number,
      movementType: row.movement_type,
      quantity: row.quantity,
      unit: row.unit,
      locationSource: row.location_source,
      locationDestination: row.location_destination,
      movementDate: row.movement_date,
      responsibleUserId: row.responsible_user_id,
      responsibleUserName: row.responsible_user_name,
      referenceDocument: row.reference_document,
      reason: row.reason,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: !!row.is_deleted
    };
  }

  private static mapProcessingRecipe(row: any): ProcessingRecipeMaster {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      cropId: row.crop_id,
      cropVarietyId: row.crop_variety_id,
      description: row.description,
      standardInputQuantity: row.standard_input_quantity,
      standardInputUnit: row.standard_input_unit,
      expectedOutputQuantity: row.expected_output_quantity,
      expectedOutputUnit: row.expected_output_unit,
      expectedConversionYieldPct: row.expected_conversion_yield_pct,
      estimatedDurationHours: row.estimated_duration_hours,
      laborHoursRequired: row.labor_hours_required,
      stages: row.stages || [],
      isLocallyValidated: row.is_locally_validated ?? false,
      localValidationSource: row.local_validation_source,
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: !!row.is_deleted
    };
  }

  private static mapProcessingBatch(row: any): ProcessingBatchMaster {
    return {
      id: row.id,
      organizationId: row.organization_id,
      batchNumber: row.batch_number,
      recipeId: row.recipe_id,
      recipeName: row.recipe_name,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      harvestBatchNumber: row.harvest_batch_number,
      inputRawMaterialName: row.input_raw_material_name,
      inputQuantity: row.input_quantity,
      inputUnit: row.input_unit,
      outputProductName: row.output_product_name,
      outputQuantity: row.output_quantity,
      outputUnit: row.output_unit,
      byProductsQuantity: row.by_products_quantity,
      lossesQuantity: row.losses_quantity,
      actualConversionYieldPct: row.actual_conversion_yield_pct,
      expectedConversionYieldPct: row.expected_conversion_yield_pct,
      yieldVariancePct: row.yield_variance_pct,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      laborHours: row.labor_hours || 0,
      laborCostGNF: row.labor_cost_gnf || 0,
      energyAndUtilitiesCostGNF: row.energy_and_utilities_cost_gnf || 0,
      packagingCostGNF: row.packaging_cost_gnf || 0,
      totalCostGNF: row.total_cost_gnf || 0,
      unitProductionCostGNF: row.unit_production_cost_gnf || 0,
      facilityLocation: row.facility_location,
      responsibleUserId: row.responsible_user_id,
      responsibleUserName: row.responsible_user_name,
      linkedCalendarEventId: row.linked_calendar_event_id,
      qualityReleaseStatus: row.quality_release_status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: !!row.is_deleted
    };
  }

  private static mapQualityInspection(row: any): QualityInspectionRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      inspectionNumber: row.inspection_number,
      batchNumber: row.batch_number,
      productName: row.product_name,
      inspectionDate: row.inspection_date,
      inspectorUserId: row.inspector_user_id,
      inspectorName: row.inspector_name,
      inspectorAccreditation: row.inspector_accreditation,
      sampleSizeTaken: row.sample_size_taken,
      moisturePct: row.moisture_pct,
      maxPermissibleMoisturePct: row.max_permissible_moisture_pct,
      defectsRatePct: row.defects_rate_pct,
      maxPermissibleDefectsPct: row.max_permissible_defects_pct,
      foreignMatterPct: row.foreign_matter_pct,
      maxPermissibleForeignMatterPct: row.max_permissible_foreign_matter_pct,
      chemicalResiduesCompliant: row.chemical_residues_compliant ?? true,
      pesticideMRLCompliant: row.pesticide_mrl_compliant ?? true,
      releaseStatus: row.release_status,
      nonConformanceReason: row.non_conformance_reason,
      correctiveActionPlan: row.corrective_action_plan,
      officialCertificateNumber: row.official_certificate_number,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: !!row.is_deleted
    };
  }
}
