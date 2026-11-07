import { BaseEntity, CurrencyCode, ISODateString, ISODateTimeString, UUID } from './common.ts';

/**
 * FARMING CALENDAR — OPERATIONS, PROCESSING, INVENTORY & QUALITY TYPES (PHASE 6)
 */

export type StockCategory =
  | 'RAW_AGRICULTURAL_PRODUCE'
  | 'WORK_IN_PROGRESS'
  | 'FINISHED_PRODUCT'
  | 'PROCESSED_GOODS'
  | 'PACKAGING_MATERIAL'
  | 'AGRICULTURAL_INPUT';

export type StockMovementType =
  | 'RECEIVING'       // Reception from farm harvest or external supplier
  | 'ISSUING'         // Consumed for processing or delivery
  | 'TRANSFER'        // Moving between warehouses/hangars
  | 'RESERVATION'     // Allocated against commercial contract
  | 'RELEASE'         // Unreserved supply
  | 'ADJUSTMENT'      // Physical stock reconciliation
  | 'SPOILAGE'        // Post-harvest losses / damage
  | 'STOCK_COUNT';    // Full inventory audit count

export type ProcessingStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type QualityReleaseStatus =
  | 'PENDING_INSPECTION'
  | 'ACCEPTED_GRADE_A'
  | 'ACCEPTED_GRADE_B'
  | 'RELEASED_FOR_SALE'
  | 'REJECTED'
  | 'NON_CONFORMANCE'
  | 'CORRECTIVE_ACTION_REQUIRED';

export interface StockMovementRecord extends BaseEntity {
  inventoryItemId: UUID;
  batchNumber: string;
  movementType: StockMovementType;
  quantity: number;
  unit: string;
  locationSource?: string;
  locationDestination: string;
  movementDate: ISODateTimeString;
  responsibleUserId: UUID;
  responsibleUserName: string;
  referenceDocument?: string; // e.g. "HARV-PIM-2026-001", "ORD-2026-PIM-001", "PRC-2026-001"
  reason: string;
  notes?: string;
}

export interface InventoryItemMaster extends BaseEntity {
  name: string;
  sku: string;
  category: StockCategory;
  cropId?: UUID;
  cropVarietyId?: UUID;
  unit: string;
  quantityOnHand: number;
  quantityAvailable: number;
  quantityReserved: number;
  quantityQuarantined: number;
  warehouseLocation: string;
  minThresholdAlert?: number;
  costPerUnit: number;
  currency: CurrencyCode;
  latestBatchNumber?: string;
  status: 'NORMAL' | 'LOW_STOCK' | 'EXCESS' | 'QUARANTINED';
}

export interface ProcessingRecipeIngredient {
  inputName: string;
  category: StockCategory;
  standardQuantity: number;
  unit: string;
}

export interface ProcessingRecipeMaster extends BaseEntity {
  name: string; // e.g. "Itinéraire Séchage Solaire Piment S17", "Transformation Manioc en Farine Panifiable"
  code: string;
  cropId?: UUID;
  cropVarietyId?: UUID;
  description?: string;
  standardInputQuantity: number;
  standardInputUnit: string;
  expectedOutputQuantity: number;
  expectedOutputUnit: string;
  expectedConversionYieldPct: number; // Output / Input * 100
  estimatedDurationHours: number;
  laborHoursRequired: number;
  stages: string[]; // e.g. ["Réception & Tri", "Lavage & Équeutage", "Séchage Solaire 45°C", "Calibrage & Conditionnement"]
  isLocallyValidated: boolean;
  localValidationSource?: string;
  isActive: boolean;
}

export interface ProcessingBatchMaster extends BaseEntity {
  batchNumber: string; // e.g. "PRC-2026-S17-001"
  recipeId?: UUID;
  recipeName: string;
  campaignId?: UUID;
  campaignName?: string;
  harvestBatchNumber?: string;
  inputRawMaterialName: string;
  inputQuantity: number;
  inputUnit: string;
  outputProductName: string;
  outputQuantity: number;
  outputUnit: string;
  byProductsQuantity?: number;
  lossesQuantity: number;
  actualConversionYieldPct: number;
  expectedConversionYieldPct: number;
  yieldVariancePct: number;
  status: ProcessingStatus;
  startedAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  laborHours: number;
  laborCostGNF: number;
  energyAndUtilitiesCostGNF: number;
  packagingCostGNF: number;
  totalCostGNF: number;
  unitProductionCostGNF: number;
  facilityLocation: string; // e.g. "Station de Séchage et Usinage Friguiagbé"
  responsibleUserId: UUID;
  responsibleUserName: string;
  linkedCalendarEventId?: UUID;
  qualityReleaseStatus: QualityReleaseStatus;
  notes?: string;
}

export interface QualityInspectionRecord extends BaseEntity {
  inspectionNumber: string; // e.g. "QC-2026-PIM-001"
  batchNumber: string;
  productName: string;
  inspectionDate: ISODateTimeString;
  inspectorUserId: UUID;
  inspectorName: string;
  inspectorAccreditation?: string; // e.g. "Auditeur Phytosanitaire Agréé ONPQ"
  sampleSizeTaken: string;
  moisturePct?: number; // Target e.g. < 11% for dried pepper
  maxPermissibleMoisturePct?: number;
  brixLevel?: number; // Target for fresh fruits/watermelon
  defectsRatePct: number;
  maxPermissibleDefectsPct: number;
  foreignMatterPct: number;
  maxPermissibleForeignMatterPct: number;
  chemicalResiduesCompliant: boolean;
  pesticideMRLCompliant: boolean;
  releaseStatus: QualityReleaseStatus;
  nonConformanceReason?: string;
  correctiveActionPlan?: string;
  officialCertificateNumber?: string; // e.g. "CERT-ONPQ-GN-2026-0842"
  notes?: string;
}

export interface BatchRecallTraceResult {
  queryBatchNumber: string;
  farm: {
    id?: UUID;
    name?: string;
    region?: string;
  };
  plot: {
    id?: UUID;
    name?: string;
  };
  campaign: {
    id?: UUID;
    name?: string;
    code?: string;
    crop?: string;
    variety?: string;
  };
  harvest: {
    id?: UUID;
    batchNumber?: string;
    harvestDate?: string;
    quantityHarvested?: number;
    unit?: string;
  };
  processingBatch?: {
    batchNumber: string;
    recipeName: string;
    status: ProcessingStatus;
    conversionYield: number;
    completedAt?: string;
  };
  qualityInspection?: {
    inspectionNumber: string;
    releaseStatus: QualityReleaseStatus;
    inspectorName: string;
    moisturePct?: number;
    certificateNumber?: string;
  };
  stockMovements: Array<{
    movementType: StockMovementType;
    quantity: number;
    unit: string;
    date: string;
    destination: string;
    responsible: string;
  }>;
  customerOrders: Array<{
    orderId: string;
    orderNumber: string;
    buyerName: string;
    deliveryDestination: string;
    status: string;
  }>;
  traceabilityChainValid: boolean;
}
