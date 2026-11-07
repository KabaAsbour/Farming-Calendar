import { BaseEntity, CurrencyCode, ISODateString, ISODateTimeString, UUID } from './common.ts';
import { Incoterm } from './commercial.ts';

/**
 * FARMING CALENDAR — LOGISTICS & EXPORT TRADE TYPES (PHASE 7)
 * Domestic transport, regional CEDEAO trade, and international containerized/air exports.
 */

export type TransportMode =
  | 'MARITIME'
  | 'AIR_FREIGHT'
  | 'ROAD_FREIGHT'
  | 'MULTIMODAL';

export type ShipmentStatus =
  | 'DRAFT_PLANNING'
  | 'STAGED_AT_WAREHOUSE'
  | 'PACKAGING_VERIFIED'
  | 'CUSTOMS_INSPECTION'
  | 'DISPATCHED_IN_TRANSIT'
  | 'PORT_DEPARTURE'
  | 'PORT_ARRIVAL'
  | 'CUSTOMS_CLEARED_DESTINATION'
  | 'DELIVERED'
  | 'DELAYED'
  | 'EXCEPTION_HOLD'
  | 'CANCELLED';

export type TemperatureRegime =
  | 'AMBIENT_DRY'
  | 'VENTILATED_FRESH'
  | 'REFRIGERATED_COLD_CHAIN'
  | 'FROZEN';

export interface TemperatureHandlingSpec {
  regime: TemperatureRegime;
  targetTempC: number;
  minTempC: number;
  maxTempC: number;
  humidityMaxPct?: number;
  ventilationCfm?: number;
  requiresContinuousColdChainLog: boolean;
  preCoolingRequired: boolean;
  notes?: string;
}

export type PalletType =
  | 'EURO_PALLET_1200x800'
  | 'STANDARD_1200x1000'
  | 'BULK_BAG_BIGBAG'
  | 'LOOSE_VENTILATED_CRATE'
  | 'SPECIALIZED_DRUM';

export interface PackagingPalletSpec {
  palletType: PalletType;
  palletCount: number;
  boxesOrBagsPerPallet: number;
  totalPackageCount: number;
  packagingMaterial: string; // e.g. "Cartons télescopiques 5kg avec opercule aéré", "Sacs polypropylène 25kg"
  netWeightKg: number;
  grossWeightKg: number;
  tareWeightKg: number;
  cornerProtectors: boolean;
  strappedAndStretchWrapped: boolean;
}

export interface ShipmentCostBreakdown {
  freightCost: number;
  handlingCost: number;
  customsClearanceCost: number;
  insuranceCost: number;
  packagingCost: number;
  portTerminalHandlingCost: number;
  otherCosts: number;
  totalCost: number;
  currency: CurrencyCode; // e.g. GNF, EUR, USD, XOF
  costPerKg: number;
  isLiveCarrierIntegration: false; // Transparent flag: internal contractual model, not live carrier feed
  rateNotes?: string;
}

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'SKIPPED';

export interface ShipmentMilestone {
  id: string;
  code: string;
  name: string;
  location: string;
  plannedDate: ISODateTimeString;
  actualDate?: ISODateTimeString;
  status: MilestoneStatus;
  delayHours: number;
  responsibleParty: string;
  notes?: string;
}

export type ComplianceDocumentType =
  | 'COMMERCIAL_INVOICE'
  | 'PACKING_LIST'
  | 'PHYTOSANITARY_CERTIFICATE'
  | 'CERTIFICATE_OF_ORIGIN_EUR1'
  | 'CERTIFICATE_OF_ORIGIN_CEDEAO'
  | 'BILL_OF_LADING'
  | 'AIR_WAYBILL'
  | 'ROAD_CONSIGNMENT_NOTE_CMR'
  | 'LABORATORY_ANALYSIS_CERTIFICATE'
  | 'FUMIGATION_CERTIFICATE'
  | 'EXPORT_DECLARATION_CUSTOMS'
  | 'INSURANCE_CERTIFICATE';

export type DocumentComplianceStatus =
  | 'REQUIRED_DRAFT'
  | 'SUBMITTED_FOR_REVIEW'
  | 'APPROVED_VALID'
  | 'REJECTED_NON_COMPLIANT'
  | 'EXPIRED';

export interface ComplianceDocumentRecord {
  id: string;
  shipmentId: UUID;
  documentType: ComplianceDocumentType;
  title: string;
  documentNumber?: string;
  issuingAuthority?: string;
  issueDate?: ISODateString;
  expiryDate?: ISODateString;
  status: DocumentComplianceStatus;
  rejectionReason?: string;
  requiredForMarkets: string[]; // e.g. ['EUROPEAN_UNION', 'CEDEAO', 'DOMESTIC_GUINEA']
  isConfidentialFinancial: boolean; // RBAC gated
  fileReferenceHash?: string;
  fileReferenceName?: string;
  verifiedByUserId?: UUID;
  verifiedByUserName?: string;
  verifiedAt?: ISODateTimeString;
  notes?: string;
}

export interface ShipmentMaster extends BaseEntity {
  shipmentNumber: string; // e.g. "SHP-2026-EXP-001"
  orderId: UUID;
  orderNumber: string;
  buyerId: UUID;
  buyerName: string;
  destinationMarket: 'EUROPEAN_UNION' | 'CEDEAO' | 'DOMESTIC_GUINEA' | 'NORTH_AMERICA' | 'MIDDLE_EAST';
  dispatchLocation: string; // e.g. "Magasin Central Friguiagbé, Kindia"
  destinationPortOrCity: string; // e.g. "Port Autonome de Conakry" or "Marché de Rungis, Paris"
  destinationCountry: string; // ISO 2-letter, e.g. "FR", "SN", "ML", "GN"
  incoterm: Incoterm;
  transportMode: TransportMode;
  carrierName: string; // e.g. "Bolloré Logistics Guinée", "CMA CGM", "Air France Cargo"
  carrierContactPerson?: string;
  carrierContactPhone?: string;
  containerOrVehicleId: string; // e.g. "MSKU 928374-1 (40ft High Cube Reefer)"
  sealNumber?: string;
  linkedBatches: Array<{
    inventoryItemId: UUID;
    batchNumber: string;
    productName: string;
    quantityAllocated: number;
    unit: string;
    qualityReleaseStatus: 'ACCEPTED_GRADE_A' | 'ACCEPTED_GRADE_B' | 'PENDING' | 'REJECTED';
    inspectionNumber?: string;
  }>;
  totalNetWeightKg: number;
  totalGrossWeightKg: number;
  temperatureHandling: TemperatureHandlingSpec;
  packagingPallet: PackagingPalletSpec;
  costs: ShipmentCostBreakdown;
  plannedPickupDate: ISODateTimeString;
  actualPickupDate?: ISODateTimeString;
  estimatedArrivalDate: ISODateTimeString;
  actualArrivalDate?: ISODateTimeString;
  currentStatus: ShipmentStatus;
  totalDelayHours: number;
  isDispatchBlocked: boolean;
  dispatchBlockReason?: string;
  milestones: ShipmentMilestone[];
  documents: ComplianceDocumentRecord[];
  linkedCalendarEventId?: UUID;
  responsibleStaffUserId: UUID;
  responsibleStaffName: string;
  externalLogisticsContact?: string;
  customsBrokerName?: string;
  specialInstructions?: string;
}

export interface ScenarioSimulationResult {
  scenarioName: string;
  delayHoursAdded: number;
  recalculatedArrivalDate: ISODateTimeString;
  originalBuyerDeadline: ISODateTimeString;
  deadlineBreached: boolean;
  shelfLifeLossDays: number;
  productQualityRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'CRITICAL_SPOILAGE';
  estimatedCostImpactGNF: number;
  costImpactReason: string;
  affectedDocuments: string[];
  recommendedMitigationAction: string;
}
