/**
 * FARMING CALENDAR — CLIENT HTTP API SERVICE
 * Browser-safe REST API client for Commercial and Operations modules.
 * Fully decoupled from Node.js database connections (pg, fs, path).
 */

import { AuthSession, OrganizationPreferences } from '../types/organization.ts';
import {
  BuyerMaster,
  CommercialOrderMaster,
  OrderStatus,
  SupplyDemandBalance,
  SupplyReservationMaster,
  BuyerCommunicationRecord
} from '../types/commercial.ts';
import {
  InventoryItemMaster,
  StockMovementRecord,
  ProcessingRecipeMaster,
  ProcessingBatchMaster,
  QualityInspectionRecord,
  BatchRecallTraceResult
} from '../types/operations.ts';
import {
  ShipmentMaster,
  ShipmentStatus,
  TransportMode,
  ComplianceDocumentRecord,
  DocumentComplianceStatus,
  ShipmentMilestone,
  MilestoneStatus,
  ScenarioSimulationResult
} from '../types/logistics.ts';
import {
  BudgetLineItem,
  CampaignFinancialPerformance,
  ExchangeRateRecord,
  InvestmentAppraisalParams,
  InvestmentAppraisalResult,
  FinancialScenarioComparisonItem
} from '../types/finance.ts';
import {
  DashboardRoleView,
  AlertThresholdConfig,
  DashboardFilterParams,
  DecisionSupportRecommendation,
  ExternalServiceStatus
} from '../types/dashboard.ts';

function getOrgId(session?: AuthSession | null): string {
  return session?.organization?.id || session?.user?.activeOrganizationId || '';
}

function getHeaders(session?: AuthSession | null): HeadersInit {
  const token = session?.token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('farming_calendar_token') : '') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function notifyAuthExpired(message?: string): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('farming_calendar_token');
      sessionStorage.removeItem('farming_calendar_session');
    } catch {}
    window.dispatchEvent(
      new CustomEvent('auth:expired', {
        detail: { message: message || 'Votre session a expiré. Veuillez vous reconnecter.' }
      })
    );
  }
}

export async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);

  if (res.status === 401) {
    notifyAuthExpired('Votre session a expiré ou le jeton est invalide. Veuillez vous reconnecter.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Erreur de communication avec le serveur (${res.status})`);
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Erreur lors de la lecture de la réponse serveur (${res.status})`);
  }

  if (!json.success) {
    if (json.error?.code === 'TOKEN_INVALID' || json.error?.code === 'UNAUTHORIZED' || res.status === 401) {
      notifyAuthExpired(json.error?.message || 'Session expirée. Veuillez vous reconnecter.');
    }
    throw new Error(json.error?.message || 'API request failed');
  }

  return json.data;
}

export class CommercialService {
  public static async getBuyers(
    session: AuthSession,
    filters?: { leadStatus?: string; search?: string }
  ): Promise<BuyerMaster[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.leadStatus) params.set('leadStatus', filters.leadStatus);
    if (filters?.search) params.set('search', filters.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/buyers${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async getBuyerById(session: AuthSession, buyerId: string): Promise<BuyerMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/buyers/${buyerId}`, {
      headers: getHeaders(session)
    });
  }

  public static async createBuyer(session: AuthSession, data: any): Promise<BuyerMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/buyers`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async addBuyerCommunication(
    session: AuthSession,
    buyerId: string,
    data: any
  ): Promise<BuyerMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/buyers/${buyerId}/communications`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async getOrders(session: AuthSession, filters?: any): Promise<CommercialOrderMaster[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.buyerId) params.set('buyerId', filters.buyerId);
    if (filters?.search) params.set('search', filters.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/orders${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async getOrderById(session: AuthSession, orderId: string): Promise<CommercialOrderMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/orders/${orderId}`, {
      headers: getHeaders(session)
    });
  }

  public static async createOrder(session: AuthSession, data: any): Promise<CommercialOrderMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/orders`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async updateOrderStatus(
    session: AuthSession,
    orderId: string,
    status: OrderStatus
  ): Promise<CommercialOrderMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getHeaders(session),
      body: JSON.stringify({ status })
    });
  }

  public static async getSupplyDemandBalance(session: AuthSession): Promise<SupplyDemandBalance[]> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/supply-balance`, {
      headers: getHeaders(session)
    });
  }

  public static async reserveSupply(session: AuthSession, data: any): Promise<SupplyReservationMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/commercial/reservations`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }
}

export class OperationsService {
  public static async listInventoryItems(session: AuthSession, filters?: any): Promise<InventoryItemMaster[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.search) params.set('search', filters.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/operations/inventory${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async recordStockMovement(
    session: AuthSession,
    data: any
  ): Promise<{ movement: StockMovementRecord; updatedItem: InventoryItemMaster }> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/operations/inventory/movements`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async listStockMovements(session: AuthSession, filters?: any): Promise<StockMovementRecord[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.batchNumber) params.set('batchNumber', filters.batchNumber);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/operations/movements${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async listProcessingRecipes(session: AuthSession): Promise<ProcessingRecipeMaster[]> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/operations/recipes`, {
      headers: getHeaders(session)
    });
  }

  public static async listProcessingBatches(session: AuthSession, filters?: any): Promise<ProcessingBatchMaster[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.recipeId) params.set('recipeId', filters.recipeId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/operations/batches${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async startProcessingBatch(session: AuthSession, data: any): Promise<ProcessingBatchMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/operations/batches`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async completeProcessingBatch(
    session: AuthSession,
    batchId: string,
    data: any
  ): Promise<ProcessingBatchMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/operations/batches/${batchId}/complete`, {
      method: 'PATCH',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async listQualityInspections(session: AuthSession, filters?: any): Promise<QualityInspectionRecord[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.batchNumber) params.set('batchNumber', filters.batchNumber);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/operations/inspections${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async recordQualityInspection(session: AuthSession, data: any): Promise<QualityInspectionRecord> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/operations/inspections`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async traceBatchRecall(session: AuthSession, batchNumber: string): Promise<BatchRecallTraceResult> {
    const orgId = getOrgId(session);
    return apiFetch(
      `/api/v1/organizations/${orgId}/operations/recall-trace?batchNumber=${encodeURIComponent(batchNumber)}`,
      {
        headers: getHeaders(session)
      }
    );
  }

  public static async validateBatchForDispatch(
    session: AuthSession,
    batchNumber: string
  ): Promise<{ isAllowed: boolean; message: string }> {
    const orgId = getOrgId(session);
    return apiFetch(
      `/api/v1/organizations/${orgId}/operations/check-dispatch?batchNumber=${encodeURIComponent(batchNumber)}`,
      {
        headers: getHeaders(session)
      }
    );
  }
}

export class LogisticsService {
  public static async listShipments(session: AuthSession, filters?: any): Promise<ShipmentMaster[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.destinationMarket) params.set('destinationMarket', filters.destinationMarket);
    if (filters?.transportMode) params.set('transportMode', filters.transportMode);
    if (filters?.currentStatus) params.set('currentStatus', filters.currentStatus);
    if (filters?.orderId) params.set('orderId', filters.orderId);
    if (filters?.search) params.set('search', filters.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/logistics/shipments${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async getShipmentById(session: AuthSession, shipmentId: string): Promise<ShipmentMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/logistics/shipments/${shipmentId}`, {
      headers: getHeaders(session)
    });
  }

  public static async createShipment(session: AuthSession, data: any): Promise<ShipmentMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/logistics/shipments`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async updateShipmentMilestone(
    session: AuthSession,
    shipmentId: string,
    milestoneId: string,
    data: any
  ): Promise<ShipmentMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/logistics/shipments/${shipmentId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async updateDocumentStatus(
    session: AuthSession,
    shipmentId: string,
    documentId: string,
    data: any
  ): Promise<ShipmentMaster> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/logistics/shipments/${shipmentId}/documents/${documentId}`, {
      method: 'PATCH',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async simulateRiskScenario(
    session: AuthSession,
    shipmentId: string,
    scenarioType: string,
    params?: any
  ): Promise<ScenarioSimulationResult> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/logistics/shipments/${shipmentId}/simulate-scenario`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify({ scenarioType, ...params })
    });
  }
}

export class FinanceService {
  public static async listBudgets(
    session: AuthSession,
    filters?: {
      entityType?: string;
      entityId?: string;
      fiscalYear?: number;
      category?: string;
      expenseNature?: string;
      search?: string;
    }
  ): Promise<BudgetLineItem[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.entityType) params.set('entityType', filters.entityType);
    if (filters?.entityId) params.set('entityId', filters.entityId);
    if (filters?.fiscalYear) params.set('fiscalYear', String(filters.fiscalYear));
    if (filters?.category) params.set('category', filters.category);
    if (filters?.expenseNature) params.set('expenseNature', filters.expenseNature);
    if (filters?.search) params.set('search', filters.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/finance/budgets${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async createOrUpdateBudget(session: AuthSession, data: any): Promise<BudgetLineItem> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/finance/budgets`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async deleteBudget(session: AuthSession, budgetId: string): Promise<void> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/finance/budgets/${budgetId}`, {
      method: 'DELETE',
      headers: getHeaders(session)
    });
  }

  public static async getExchangeRates(session: AuthSession): Promise<ExchangeRateRecord[]> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/finance/exchange-rates`, {
      headers: getHeaders(session)
    });
  }

  public static async setExchangeRate(session: AuthSession, data: any): Promise<ExchangeRateRecord> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/finance/exchange-rates`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async calculateCampaignFinancialPerformance(
    session: AuthSession,
    campaignId: string,
    options?: any
  ): Promise<CampaignFinancialPerformance> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (options?.targetCurrency) params.set('targetCurrency', options.targetCurrency);
    if (options?.overrideProcessingLossPct != null) params.set('overrideProcessingLossPct', String(options.overrideProcessingLossPct));
    if (options?.overrideQualityRejectedPct != null) params.set('overrideQualityRejectedPct', String(options.overrideQualityRejectedPct));
    if (options?.overrideExportPricePerKg != null) params.set('overrideExportPricePerKg', String(options.overrideExportPricePerKg));
    if (options?.overrideLocalPricePerKg != null) params.set('overrideLocalPricePerKg', String(options.overrideLocalPricePerKg));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/finance/performance/campaigns/${campaignId}${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async simulateFinancialScenarios(
    session: AuthSession,
    campaignId: string
  ): Promise<FinancialScenarioComparisonItem[]> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/finance/scenarios/campaigns/${campaignId}`, {
      headers: getHeaders(session)
    });
  }

  public static async calculateMultiYearInvestmentAppraisal(
    session: AuthSession,
    data: InvestmentAppraisalParams
  ): Promise<InvestmentAppraisalResult> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/finance/dcf-appraisal`, {
      method: 'POST',
      headers: getHeaders(session),
      body: JSON.stringify(data)
    });
  }

  public static async exportFinancialReport(
    session: AuthSession,
    campaignId: string,
    format: 'CSV' | 'JSON' = 'CSV'
  ): Promise<void> {
    const orgId = getOrgId(session);
    window.location.href = `/api/v1/organizations/${orgId}/finance/export/campaigns/${campaignId}?format=${format}`;
  }
}

export class DashboardService {
  public static async getDashboardData(
    session: AuthSession,
    roleView: DashboardRoleView = 'LEADERSHIP',
    filters?: DashboardFilterParams
  ): Promise<any> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (filters?.farmId) params.set('farmId', filters.farmId);
    if (filters?.campaignId) params.set('campaignId', filters.campaignId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/organizations/${orgId}/dashboards/role/${roleView}${qs}`, {
      headers: getHeaders(session)
    });
  }

  public static async getRecommendations(
    session: AuthSession,
    thresholds?: AlertThresholdConfig,
    filters?: DashboardFilterParams
  ): Promise<DecisionSupportRecommendation[]> {
    const orgId = getOrgId(session);
    const params = new URLSearchParams();
    if (thresholds?.costOverrunTolerancePct !== undefined) {
      params.set('costOverrunTolerancePct', String(thresholds.costOverrunTolerancePct));
    }
    if (thresholds?.shipmentDelayToleranceHours !== undefined) {
      params.set('shipmentDelayToleranceHours', String(thresholds.shipmentDelayToleranceHours));
    }
    if (thresholds?.safetyStockBufferPct !== undefined) {
      params.set('safetyStockBufferPct', String(thresholds.safetyStockBufferPct));
    }
    if (filters?.farmId) params.set('farmId', filters.farmId);
    if (filters?.campaignId) params.set('campaignId', filters.campaignId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<DecisionSupportRecommendation[]>(
      `/api/v1/organizations/${orgId}/dashboards/recommendations${qs}`,
      {
        headers: getHeaders(session)
      }
    );
  }

  public static async getExternalServicesStatus(session: AuthSession): Promise<ExternalServiceStatus[]> {
    const orgId = getOrgId(session);
    return apiFetch<ExternalServiceStatus[]>(
      `/api/v1/organizations/${orgId}/dashboards/external-status`,
      {
        headers: getHeaders(session)
      }
    );
  }

  public static exportDashboardReport(
    session: AuthSession,
    roleView: DashboardRoleView = 'LEADERSHIP',
    format: 'CSV' | 'JSON' = 'CSV'
  ): void {
    const orgId = getOrgId(session);
    window.location.href = `/api/v1/organizations/${orgId}/dashboards/export?roleView=${roleView}&format=${format}`;
  }
}

export class ClientLocalizationService {
  public static async getPreferences(session: AuthSession): Promise<OrganizationPreferences> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/preferences`, {
      headers: getHeaders(session)
    });
  }

  public static async updatePreferences(
    session: AuthSession,
    prefs: Partial<OrganizationPreferences>
  ): Promise<OrganizationPreferences> {
    const orgId = getOrgId(session);
    return apiFetch(`/api/v1/organizations/${orgId}/preferences`, {
      method: 'PUT',
      headers: getHeaders(session),
      body: JSON.stringify(prefs)
    });
  }
}



