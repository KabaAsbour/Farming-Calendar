/**
 * Common shared types and base interfaces for Farming Calendar SaaS
 */

export type UUID = string;

export type ISODateString = string; // e.g. "2026-10-15"
export type ISODateTimeString = string; // e.g. "2026-10-15T08:30:00Z"

export type SupportedLanguage = 'fr' | 'en';

export type CurrencyCode = 'GNF' | 'USD' | 'EUR' | 'XOF';

export interface BaseEntity {
  id: UUID;
  organizationId: UUID;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  createdByUserId?: UUID;
  updatedByUserId?: UUID;
  isDeleted: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: ISODateTimeString;
    requestId?: string;
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  polygonGeoJson?: string;
}
