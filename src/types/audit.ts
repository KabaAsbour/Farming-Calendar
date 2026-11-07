import { ISODateTimeString, UUID } from './common.ts';

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'SECURITY_LOGIN'
  | 'PERMISSION_DENIED'
  | 'EXPORT_DATA'
  | 'BULK_IMPORT';

export type AuditTargetEntity =
  | 'ORGANIZATION'
  | 'FARM'
  | 'FARM_PLOT'
  | 'CROP_CYCLE'
  | 'MASTER_OPERATION'
  | 'NORMAL_CALENDAR_EVENT'
  | 'BUYER_CONTRACT'
  | 'HARVEST_FORECAST'
  | 'INVENTORY_BATCH'
  | 'EXPORT_SHIPMENT'
  | 'USER_PROFILE';

export interface AuditLogEntry {
  id: UUID;
  organizationId: UUID;
  userId: UUID;
  userEmail: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  action: AuditActionType;
  targetEntity: AuditTargetEntity;
  targetEntityId: UUID;
  changesSummary?: string;
  oldValuesJson?: string;
  newValuesJson?: string;
  timestamp: ISODateTimeString;
}
