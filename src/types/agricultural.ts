import { BaseEntity, CurrencyCode, GeoLocation, ISODateString, ISODateTimeString, UUID } from './common.ts';

/**
 * FARMING CALENDAR — AGRICULTURAL CORE TYPES (PHASE 3)
 */

export type AreaUnit = 'HA' | 'ACRE' | 'M2' | 'TAREA';

export const AREA_CONVERSION_TO_HA: Record<AreaUnit, number> = {
  HA: 1.0,
  ACRE: 0.404686,
  M2: 0.0001,
  TAREA: 0.06288
};

export function convertAreaToHa(value: number, unit: AreaUnit): number {
  const factor = AREA_CONVERSION_TO_HA[unit] || 1.0;
  return Number((value * factor).toFixed(4));
}

export type WaterAccessType = 
  | 'DRIP'
  | 'SPRINKLER'
  | 'BOREWELL'
  | 'RIVER_PUMP'
  | 'CANAL'
  | 'RESERVOIR'
  | 'RAINFED'
  | 'MANUAL';

export interface SoilCharacteristics {
  texture: string; // e.g. "Sablo-limoneux", "Argilo-sableux", "Volcanique"
  pH?: number; // e.g. 6.2
  organicMatterPct?: number; // e.g. 2.8%
  drainage: 'POOR' | 'MODERATE' | 'GOOD' | 'EXCESSIVE';
  salinity?: string;
  notes?: string;
}

export type CropCategory = 
  | 'ROOT_TUBER'
  | 'SOLANACEOUS_VEGETABLE'
  | 'CUCURBIT'
  | 'FRUIT_TREE'
  | 'GRAIN'
  | 'LEGUME'
  | 'CASH_CROP'
  | 'OTHER';

export interface CropMaster extends BaseEntity {
  name: string; // e.g. "Manioc", "Piment", "Pastèque"
  scientificName?: string; // e.g. "Manihot esculenta", "Capsicum spp.", "Citrullus lanatus"
  category: CropCategory;
  growthCycleDays: number; // e.g. 270 (cassava), 120 (pepper), 85 (watermelon)
  defaultSpacingCm?: string; // e.g. "100x100 cm", "50x50 cm"
  waterRequirementMm?: number;
  description?: string;
  isActive: boolean;
}

export interface CropVarietyMaster extends BaseEntity {
  cropId: UUID;
  cropName?: string;
  name: string; // e.g. "Bird's Eye / Pili Pili", "S17 / Habanero amélioré", "Bonoua", "Kaolack", "Crimson Sweet"
  code: string;
  maturityDaysMin: number;
  maturityDaysMax: number;
  expectedYieldPerHaTons: number;
  heatTolerance?: 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  diseaseResistances?: string[];
  characteristics?: string;
  isActive: boolean;
}

export interface AgriculturalSeasonMaster extends BaseEntity {
  name: string; // e.g. "Saison Sèche 2026", "Grande Saison des Pluies 2026"
  code: string;
  startDate: ISODateString;
  endDate: ISODateString;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED';
  description?: string;
}

export interface AgriculturalMethodMaster extends BaseEntity {
  methodType: 'PLANTING' | 'HARVESTING';
  name: string; // e.g. "Semis direct en poquets", "Bouturage sur billons", "Récolte manuelle sélective"
  description?: string;
  equipmentNeeded?: string;
  laborIntensity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SupplierMaster extends BaseEntity {
  name: string;
  category: 'SEEDS' | 'FERTILIZERS' | 'EQUIPMENT' | 'IRRIGATION' | 'SERVICES' | 'GENERAL';
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  locality?: string;
  rating?: number; // 1-5
  notes?: string;
  isActive: boolean;
}

export interface AgriculturalInputMaster extends BaseEntity {
  name: string; // e.g. "NPK 15-15-15", "Bio-pesticide Neem", "Semences Certifiées S17"
  category: 'FERTILIZER' | 'SEED' | 'PESTICIDE' | 'ORGANIC_AMENDMENT' | 'PACKAGING' | 'OTHER';
  unit: 'KG' | 'LITER' | 'BAG_50KG' | 'PACK_100G' | 'ROLL' | 'UNIT';
  defaultDosage?: string; // e.g. "200 kg/ha"
  supplierId?: UUID;
  supplierName?: string;
  costPerUnit: number;
  currency: CurrencyCode;
  stockQuantity: number;
  safetyPrecautions?: string;
}

export interface AgriculturalEquipmentMaster extends BaseEntity {
  name: string; // e.g. "Motopompe Honda 3 pouces", "Pulvérisateur 16L"
  equipmentType: 'TRACTOR' | 'PUMP' | 'SPRAYER' | 'IRRIGATION_KIT' | 'HARVEST_TOOL' | 'TESTER' | 'OTHER';
  serialNumber?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'DECOMMISSIONED';
  maintenanceSchedule?: string;
  notes?: string;
}

export interface FieldTeamMaster extends BaseEntity {
  name: string; // e.g. "Équipe Maraîchage Bloc A"
  leaderUserId?: UUID;
  leaderName?: string;
  membersCount: number;
  skills: string[];
  isActive: boolean;
}

export type CampaignStatus = 
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'HARVESTING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD';

export interface ProductionCampaignMaster extends BaseEntity {
  seasonId?: UUID;
  seasonName?: string;
  name: string; // e.g. "Campagne Piment S17 — Kindia Bloc A1"
  code: string; // e.g. "CAMP-PIM-2026-01"
  farmId: UUID;
  farmName?: string;
  plotId?: UUID;
  plotName?: string;
  cropId: UUID;
  cropName?: string;
  cropVarietyId: UUID;
  cropVarietyName?: string;
  plannedArea: number;
  areaUnit: AreaUnit;
  plannedAreaHa: number;
  plantingWindowStart: ISODateString;
  plantingWindowEnd: ISODateString;
  expectedHarvestStart: ISODateString;
  expectedHarvestEnd: ISODateString;
  productionTargetQuantity: number;
  productionTargetUnit: 'KG' | 'TON' | 'BAG' | 'CRATE';
  managerUserId?: UUID;
  managerName?: string;
  fieldTeamId?: UUID;
  fieldTeamName?: string;
  status: CampaignStatus;
  budgetCode?: string;
  budgetAllocated: number;
  budgetActualSpend?: number;
  budgetCurrency: CurrencyCode;
  plantingMethodId?: UUID;
  plantingMethodName?: string;
  harvestingMethodId?: UUID;
  harvestingMethodName?: string;
  notes?: string;
  // Computed yield accumulation
  totalHarvestedQuantity?: number;
  harvestProgressPct?: number;
  operationsCount?: number;
}

export type OperationTypeAgricultural =
  | 'LAND_PREPARATION'
  | 'PLANTING'
  | 'IRRIGATION'
  | 'FERTILIZATION'
  | 'PEST_DISEASE_MONITORING'
  | 'WEEDING'
  | 'MAINTENANCE'
  | 'HARVEST'
  | 'POST_HARVEST';

export interface CampaignOperationRecord extends BaseEntity {
  campaignId: UUID;
  campaignName?: string;
  cropName?: string;
  cropVarietyName?: string;
  operationType: OperationTypeAgricultural;
  title: string;
  description?: string;
  plannedDate: ISODateString;
  actualDate?: ISODateString;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  plannedQuantity?: number;
  actualQuantity?: number;
  quantityUnit?: string;
  laborWorkersCount?: number;
  laborHours?: number;
  costAmount?: number;
  costCurrency: CurrencyCode;
  responsibleUserId?: UUID;
  responsibleUserName?: string;
  fieldTeamId?: UUID;
  fieldTeamName?: string;
  equipmentId?: UUID;
  equipmentName?: string;
  inputId?: UUID;
  inputName?: string;
  inputBatchNumber?: string;
  inputQuantityUsed?: number;
  pestOrDiseaseName?: string;
  incidenceRatePct?: number;
  severityLevel?: 'LOW' | 'MODERATE' | 'SEVERE';
  observationNotes?: string;
  linkedCalendarEventId?: UUID;
}

export interface CampaignHarvestRecord extends BaseEntity {
  campaignId: UUID;
  campaignName?: string;
  operationId?: UUID;
  harvestBatchNumber: string; // e.g. "HARV-PIM-2026-001"
  harvestDate: ISODateString;
  quantityHarvested: number;
  quantityUnit: string; // e.g. "KG", "TON"
  qualityGrade: 'GRADE_A' | 'GRADE_B' | 'COMMERCIAL' | 'REJECTED';
  lossQuantity: number;
  storageLocation?: string;
  moisturePct?: number;
  brixLevel?: number;
  workersCount: number;
  supervisorUserId?: UUID;
  supervisorName?: string;
  destination: 'EXPORT' | 'LOCAL_MARKET' | 'PROCESSING' | 'STORAGE';
  notes?: string;
}
