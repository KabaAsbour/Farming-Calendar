import { BaseEntity, CurrencyCode, ISODateString, ISODateTimeString, UUID } from './common.ts';

/**
 * FARMING CALENDAR — COMMERCIAL MANAGEMENT TYPES (PHASE 5)
 */

export type BuyerType =
  | 'IMPORTER'
  | 'WHOLESALER'
  | 'IMPORTER_WHOLESALER'
  | 'PROCESSOR'
  | 'RETAILER'
  | 'DISTRIBUTOR'
  | 'EXPORTER'
  | 'COOPERATIVE_FEDERATION';

export type BuyerVerificationStatus =
  | 'VERIFIED'
  | 'SELF_REGISTERED'
  | 'UNVERIFIED'
  | 'PENDING_DOCUMENTATION';

export type LeadStatus =
  | 'PROSPECT'
  | 'QUALIFIED'
  | 'NEGOTIATION'
  | 'ACTIVE_CONTRACT'
  | 'ON_HOLD'
  | 'CHURNED';

export type OrderType =
  | 'INQUIRY'
  | 'QUOTATION'
  | 'DRAFT_OFFER'
  | 'ACCEPTED_ORDER'
  | 'CONTRACT';

export type OrderStatus =
  | 'INQUIRY'
  | 'QUOTED'
  | 'NEGOTIATING'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'PROCESSING'
  | 'QUALITY_INSPECTION'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type Incoterm = 'EXW' | 'FOB' | 'CIF' | 'FCA' | 'DAP' | 'CFR' | 'CPT';

export type CommercialUnit = 'KG' | 'TON' | 'BOX_5KG' | 'BAG_50KG' | 'CRATE';

export interface BuyerContactPerson {
  id: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  notes?: string;
}

export interface BuyerCommunicationRecord {
  id: string;
  date: ISODateTimeString;
  type: 'EMAIL' | 'PHONE_CALL' | 'IN_PERSON_MEETING' | 'OFFICIAL_OFFER' | 'CONTRACT_SIGNING';
  authorName: string;
  summary: string;
  nextSteps?: string;
}

export interface BuyerMaster extends BaseEntity {
  name: string; // Legal business name
  companyName?: string; // Compatibility alias
  contactPerson?: string; // Compatibility alias
  email?: string; // Compatibility alias
  phone?: string; // Compatibility alias
  country?: string; // Compatibility alias
  city?: string; // Compatibility alias
  currencyPreference?: string; // Compatibility alias
  registrationNumber?: string; // Tax ID or RCCM
  buyerType: BuyerType;
  countryCode: string; // ISO 2-letter
  market: string; // e.g. "Export Union Européenne", "Marché National Guinéen"
  locality: string; // e.g. "Rotterdam", "Conakry", "Dakar"
  address?: string;
  contacts: BuyerContactPerson[];
  productsOfInterest: string[];
  productSpecifications?: string;
  requiredAnnualQuantityTons?: number;
  targetPrice?: number;
  targetCurrency: CurrencyCode;
  targetUnit: CommercialUnit;
  preferredDeliveryWindow?: string;
  packagingRequirements?: string;
  certificationsRequired: string[];
  communications: BuyerCommunicationRecord[];
  leadStatus: LeadStatus;
  relationshipOwnerId?: UUID;
  relationshipOwnerName?: string;
  sourceOfContact: string; // e.g. "Salon International de l'Agriculture", "Recommandation GIZ"
  verificationStatus: BuyerVerificationStatus;
  notes?: string;
  isDemoRecord: boolean; // Flag to indicate demo records
  isActive: boolean;
}

export interface PaymentMilestone {
  id: string;
  milestoneName: string;
  percentage: number;
  amount: number;
  dueDate: ISODateString;
  isPaid: boolean;
  paidDate?: ISODateString;
}

export interface OrderLineItem {
  id: string;
  cropId?: UUID;
  cropName: string;
  cropVarietyId?: UUID;
  cropVarietyName?: string;
  specifications: string;
  orderedQuantity: number;
  unit: CommercialUnit;
  quantityTons: number; // Normalized to tons for supply calculation
  unitPrice: number;
  totalPrice: number;
  reservedQuantityTons: number;
  allocatedFarmIds: UUID[];
  allocatedCampaignIds: UUID[];
  qualityGrade: 'GRADE_A_PREMIUM' | 'GRADE_B_STANDARD' | 'GRADE_C_PROCESSING';
  packagingType: string;
}

export interface CommercialOrderMaster extends BaseEntity {
  orderNumber: string; // e.g. "ORD-2026-PIM-001"
  buyerId: UUID;
  buyerName: string;
  buyerCountry: string;
  orderType: OrderType;
  status: OrderStatus;
  incoterm: Incoterm;
  deliveryDestination: string;
  deliveryWindowStart: ISODateString;
  deliveryWindowEnd: ISODateString;
  currency: CurrencyCode;
  totalAmount: number;
  requiredDocuments: string[];
  paymentTerms: string;
  paymentMilestones: PaymentMilestone[];
  lines: OrderLineItem[];
  linkedCalendarEventIds?: UUID[];
  assignedManagerId?: UUID;
  assignedManagerName?: string;
  contractSignedDate?: ISODateString;
  notes?: string;
}

export interface SupplyReservationMaster extends BaseEntity {
  orderId: UUID;
  orderLineId: string;
  campaignId: UUID;
  campaignName: string;
  farmId: UUID;
  farmName: string;
  cropName: string;
  reservedQuantityTons: number;
  sourceType: 'HARVESTED_STOCK' | 'FORECAST_HARVEST' | 'PROCESSED_STOCK';
  status: 'ACTIVE' | 'RELEASED' | 'FULFILLED';
  reservationDate: ISODateTimeString;
}

export interface SupplyDemandBalance {
  cropName: string;
  totalBuyerDemandTons: number;
  forecastHarvestTons: number;
  actualHarvestedStockTons: number;
  processedStockTons: number;
  qualityApprovedStockTons: number;
  totalCommittedTons: number;
  unreservedAvailableTons: number;
  netBalanceTons: number;
  balanceStatus: 'SURPLUS' | 'BALANCED' | 'SHORTAGE_WARNING' | 'CRITICAL_DEFICIT';
  activeContributingFarms: string[];
}
