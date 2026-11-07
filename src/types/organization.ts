import { BaseEntity, CurrencyCode, GeoLocation, UUID } from './common.ts';

/**
 * 8 Core Platform Roles specified for Phase 1 Foundation & Security:
 * - PLATFORM_OWNER: System platform administrator (audited global access)
 * - ORG_ADMIN: Organization Administrator (full organization control, no cross-tenant access)
 * - MANAGER: Farm / Operations Manager
 * - AGRONOMIST: Agronomist & Technical Specialist
 * - COMMERCIAL_MANAGER: Buyer Relations & Off-take Sales Manager
 * - FINANCE_MANAGER: Budget & Financial Execution Manager
 * - OPERATIONS_STAFF: Field Operators & Technicians
 * - VIEWER: Read-only stakeholder/auditor
 */
export type UserRole =
  | 'PLATFORM_OWNER'
  | 'ORG_ADMIN'
  | 'MANAGER'
  | 'AGRONOMIST'
  | 'COMMERCIAL_MANAGER'
  | 'FINANCE_MANAGER'
  | 'OPERATIONS_STAFF'
  | 'VIEWER';

export type OrgType = 'ENTERPRISE' | 'COOPERATIVE' | 'FAMILY_FARM' | 'GOV_AGENCY' | 'NGO';

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  countryCode: string; // e.g. "GN" for Guinea, "CI", "SN"
  orgType: OrgType;
  primaryCurrency: CurrencyCode;
  timezone: string; // e.g. "Africa/Conakry"
  taxId?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
}

export interface OrganizationPreferences extends BaseEntity {
  organizationId: UUID;
  preferredLanguage: 'fr' | 'en';
  preferredCurrency: CurrencyCode;
  preferredTimezone: string;
  preferredUnitSystem: 'METRIC' | 'IMPERIAL';
  numberFormatLocale: string;
  dateFormat: string;
  defaultLocale?: 'fr' | 'en';
  primaryCurrency?: CurrencyCode;
  unitSystem?: 'METRIC' | 'IMPERIAL';
  timeZone?: string;
  fiscalYearStartMonth?: number;
}

export interface OrganizationMembership {
  id: UUID;
  organizationId: UUID;
  userId: UUID;
  role: UserRole;
  isPrimary: boolean;
  createdAt: string;
}

export interface Farm extends BaseEntity {
  name: string;
  code: string; // e.g. "FARM-KND-01" (Kindia Farm 1)
  region: string; // e.g. "Basse-Guinée (Kindia)", "Moyenne-Guinée (Labé)"
  prefecture?: string;
  subPrefecture?: string;
  location?: GeoLocation;
  totalAreaHectares: number;
  usableAreaHectares: number;
  managerUserId?: UUID;
  isActive: boolean;
}

export interface FarmPlot extends BaseEntity {
  farmId: UUID;
  name: string;
  code: string;
  areaHectares: number;
  soilType?: string;
  irrigationType: 'RAINFED' | 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'MANUAL';
  currentStatus: 'FALLOW' | 'PLANNED' | 'CULTIVATED' | 'HARVESTING' | 'RESTING';
}

export interface UserProfile {
  id: UUID;
  email: string;
  fullName: string;
  phoneNumber?: string;
  preferredLanguage: 'fr' | 'en';
  activeOrganizationId: UUID;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface UserWithPassword extends UserProfile {
  passwordHash: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: UserProfile;
  organization: Organization;
  availableOrganizations: {
    id: UUID;
    name: string;
    role: UserRole;
  }[];
}
