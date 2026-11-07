import { BaseEntity, CurrencyCode, ISODateString, ISODateTimeString, UUID } from './common.ts';

// ==========================================
// 1. NORMAL CALENDAR MODULE
// ==========================================

export type NormalEventType = 
  | 'TASK' 
  | 'DEADLINE' 
  | 'MEETING' 
  | 'MAINTENANCE' 
  | 'INSPECTION' 
  | 'GENERAL_EVENT';

export type EventPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type EventStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SEASONAL' | 'YEARLY';

export interface CalendarAttachment {
  id: string;
  name: string;
  url: string;
  sizeBytes?: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface RecurrenceRuleDetails {
  frequency: RecurrenceFrequency;
  interval: number; // e.g. every 1, 2 weeks
  daysOfWeek?: number[]; // 0 = Sun, 1 = Mon...
  endDate?: ISODateString;
  count?: number; // total occurrences
  exdates?: string[]; // excluded dates (YYYY-MM-DD)
  parentEventId?: UUID;
  isException?: boolean;
  exceptionDate?: string; // original occurrence date being overridden
}

export interface NormalCalendarItem extends BaseEntity {
  title: string;
  description?: string;
  eventType: NormalEventType;
  status: EventStatus;
  priority: EventPriority;
  startDateTime: ISODateTimeString;
  endDateTime: ISODateTimeString;
  allDay: boolean;
  timezone: string; // e.g. "Africa/Conakry"
  assignedToUserId?: UUID;
  assignedUserName?: string;
  assignedUserEmail?: string;
  dueDate?: ISODateTimeString;
  farmId?: UUID;
  farmName?: string;
  plotId?: UUID;
  plotName?: string;
  
  // Link to Agricultural and Commercial records (Robust Relational Keys)
  linkedCampaignId?: string;
  linkedCropCycleId?: UUID;
  linkedMasterOperationId?: UUID;
  linkedOrderId?: UUID;
  linkedShipmentId?: UUID;

  recurrence?: RecurrenceRuleDetails;
  remindersMinutesBefore?: number[]; // e.g. [15, 60, 1440]
  notes?: string;
  attachments?: CalendarAttachment[];
  colorHex?: string;
  tags?: string[];
  
  // Audit metadata
  createdByUserName?: string;
  updatedByUserName?: string;
}

export interface CalendarFilterParams {
  startDate?: string;
  endDate?: string;
  status?: EventStatus | 'ALL';
  eventType?: NormalEventType | 'ALL';
  priority?: EventPriority | 'ALL';
  assignedUserId?: string | 'ALL';
  farmId?: string | 'ALL';
  plotId?: string | 'ALL';
  relatedRecordType?: string | 'ALL';
  searchQuery?: string;
  sortBy?: 'date_asc' | 'date_desc' | 'priority' | 'status' | 'title';
  page?: number;
  limit?: number;
}

// ==========================================
// 2. MASTER AGRICULTURAL & COMMERCIAL CALENDAR MODULE
// ==========================================

export type CropCategory = 
  | 'FRUIT'       // Mango, Pineapple, Banana, Citrus
  | 'VEGETABLE'   // Tomato, Pepper, Onion, Cabbage
  | 'GRAIN'       // Rice (Riz de mangrove, pluvial), Maize, Fonio
  | 'TUBER'       // Cassava (Manioc), Yam
  | 'LEGUME'      // Peanut (Arachide), Beans
  | 'CASH_CROP';  // Cashew, Coffee, Cocoa, Palm oil

export interface CropVariety {
  id: string;
  cropName: string;
  varietyName: string; // e.g. "Kent" (Mango), "Queen Victoria" (Pineapple), "CK 21" (Rice)
  category: CropCategory;
  standardCycleDays: number;
  expectedYieldKgPerHectare: number;
  optimalTemperatureMinC?: number;
  optimalTemperatureMaxC?: number;
  waterRequirementMm?: number;
  guineaHarvestSeasons?: string[]; // e.g. ["Mai-Juillet", "Décembre-Février"]
}

export interface FarmPlot extends BaseEntity {
  farmId: UUID;
  name: string; // e.g. "Parcelle A2 - Kindia Plateau"
  code: string;
  areaHectares: number;
  soilType?: string;
  irrigationType: 'RAINFED' | 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'MANUAL';
  currentStatus: 'FALLOW' | 'PLANNED' | 'CULTIVATED' | 'HARVESTING' | 'RESTING';
}

export type OperationType =
  | 'SOIL_PREPARATION'    // Labourage, Hersage, Billonnage
  | 'NURSERY_SEEDING'     // Pépinière
  | 'TRANSPLANTING'       // Repiquage
  | 'DIRECT_SOWING'       // Semis direct
  | 'FERTILIZATION'       // Épandage engrais organique / NPK
  | 'IRRIGATION'          // Arrosage / Irrigation
  | 'WEEDING'             // Désherbage / Sarclage
  | 'PHYTOSANITARY'       // Traitement phytosanitaire bio/conventionnel
  | 'PRUNING'             // Élagage / Taille
  | 'HARVESTING'          // Récolte
  | 'POST_HARVEST'        // Triage, Lavage, Séchage, Conditionnement
  | 'COVER_CROPPING';     // Engrais vert

export interface MasterCropCycle extends BaseEntity {
  farmId: UUID;
  plotId: UUID;
  cycleCode: string; // e.g. "CC-2026-MG-01"
  cropVarietyId: string;
  campaignYear: number; // e.g. 2026, 2027
  seasonName: string; // e.g. "Saison des Pluies 2026", "Contre-saison 2026/2027"
  startDate: ISODateString;
  estimatedHarvestStartDate: ISODateString;
  estimatedHarvestEndDate: ISODateString;
  actualHarvestEndDate?: ISODateString;
  plannedHectares: number;
  forecastYieldKg: number;
  actualYieldKg?: number;
  budgetEstimatedAmount: number;
  budgetActualAmount?: number;
  currency: CurrencyCode;
  status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'COMPLETED' | 'CANCELLED';
}

export interface MasterOperation extends BaseEntity {
  cropCycleId: UUID;
  plotId: UUID;
  farmId: UUID;
  operationType: OperationType;
  title: string;
  description?: string;
  plannedStartDate: ISODateString;
  plannedEndDate: ISODateString;
  actualStartDate?: ISODateString;
  actualEndDate?: ISODateString;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';
  supervisorUserId?: UUID;
  requiredLaborHours?: number;
  requiredMaterialInputs?: {
    name: string;
    quantity: number;
    unit: string;
    costEstimate: number;
  }[];
  costActual?: number;
  currency: CurrencyCode;
  autoSyncWithNormalCalendar: boolean;
}

// ------------------------------------------
// Commercial & Execution Entities
// ------------------------------------------

export type BuyerType = 'LOCAL_WHOLESALER' | 'EXPORTER' | 'SUPERMARKET' | 'PROCESSOR' | 'INSTITUTION';

export interface BuyerAccount extends BaseEntity {
  companyName: string;
  buyerType: BuyerType;
  contactPerson: string;
  phone: string;
  email?: string;
  destinationCountry: string; // "GN", "FR", "BE", "SN", "AE"
  qualityStandardRequired?: string; // e.g. "GLOBALG.A.P", "Bio/Organic", "Standard"
  paymentTermsDays: number;
}

export interface BuyerDemandContract extends BaseEntity {
  buyerId: UUID;
  contractCode: string;
  cropVarietyId: string;
  demandedQuantityKg: number;
  targetDeliveryStartDate: ISODateString;
  targetDeliveryEndDate: ISODateString;
  unitPriceAgreed: number;
  currency: CurrencyCode;
  fulfillmentStatus: 'NEGOTIATION' | 'COMMITTED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';
  linkedCropCycleIds?: UUID[];
}

export interface HarvestForecast extends BaseEntity {
  cropCycleId: UUID;
  forecastPeriodStart: ISODateString;
  forecastPeriodEnd: ISODateString;
  projectedWeightKg: number;
  qualityGradeA_Kg: number; // Export grade
  qualityGradeB_Kg: number; // Local market
  qualityGradeC_Kg: number; // Processing / Puree
  confidencePercentage: number;
  notes?: string;
}

export interface InventoryItem extends BaseEntity {
  warehouseLocation: string; // e.g. "Entrepôt Froid Aéroport Gbessia, Conakry"
  cropVarietyId: string;
  batchNumber: string;
  harvestDate: ISODateString;
  currentQuantityKg: number;
  unitPriceValue: number;
  currency: CurrencyCode;
  qualityGrade: 'GRADE_A' | 'GRADE_B' | 'GRADE_C';
  shelfLifeExpirationDate?: ISODateString;
}

export interface ExportShipment extends BaseEntity {
  shipmentCode: string; // e.g. "EXP-2026-CKY-04"
  buyerDemandId: UUID;
  transportMode: 'AIR_FREIGHT' | 'MARITIME_CONTAINER' | 'ROAD_OVERLAND';
  departurePoint: string; // e.g. "Port Autonome de Conakry (PAC)"
  destinationPort: string; // e.g. "Port de Marseille-Fos" / "Rungis"
  departureDate: ISODateString;
  arrivalEstimatedDate: ISODateString;
  totalNetWeightKg: number;
  temperatureControlled: boolean;
  status: 'BOOKED' | 'CUSTOMS_CLEARED' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED';
}
