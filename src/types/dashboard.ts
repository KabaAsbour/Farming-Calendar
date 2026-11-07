import { UserRole } from './organization.ts';

export type DashboardRoleView =
  | 'LEADERSHIP'
  | 'FARM_MANAGER'
  | 'AGRONOMIST'
  | 'COMMERCIAL_MANAGER'
  | 'PROCESSING_MANAGER'
  | 'LOGISTICS_MANAGER'
  | 'FINANCE_MANAGER';

export type RecommendationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type RecommendationType = 'RULES_BASED' | 'AI_ADVISORY';

export type DecisionDomain =
  | 'COMMERCIAL'
  | 'FINANCE'
  | 'LOGISTICS'
  | 'OPERATIONS'
  | 'AGRONOMY'
  | 'PROCESSING';

export interface DecisionSupportRecommendation {
  id: string;
  ruleKey: string;
  type: RecommendationType;
  domain: DecisionDomain;
  title: string;
  severity: RecommendationSeverity;
  summary: string;
  underlyingData: Record<string, any>;
  assumptions: string[];
  suggestedNextSteps: string[];
  targetTab: string;
  targetEntityId?: string;
  actionLabel?: string;
}

export interface AlertThresholdConfig {
  costOverrunTolerancePct: number; // default: 5%
  shipmentDelayToleranceHours: number; // default: 24h
  safetyStockBufferPct: number; // default: 15%
  cashDeficitThresholdGNF: number; // default: 0 GNF
  qualityFailureTolerancePct: number; // default: 0%
}

export interface DashboardFilterParams {
  farmId?: string;
  campaignId?: string;
  roleView?: DashboardRoleView;
  startDate?: string;
  endDate?: string;
}

export interface ExternalServiceStatus {
  service: string;
  status: 'CONFIGURED' | 'UNCONFIGURED';
  provider: string;
  message: string;
  requiredEnvVar?: string;
}

// 1. Leadership Dashboard
export interface ExecutiveDashboardData {
  roleView: 'LEADERSHIP';
  campaignPerformance: {
    activeCampaignsCount: number;
    totalCultivatedAreaHa: number;
    expectedHarvestTons: number;
    actualHarvestedTons: number;
    harvestProgressPct: number;
  };
  commercialCommitments: {
    confirmedOrdersCount: number;
    committedVolumeTons: number;
    unfulfilledVolumeTons: number;
    projectedRevenueGNF: number;
  };
  financialSummary: {
    totalPlannedBudgetGNF: number;
    totalActualCostGNF: number;
    projectedMarginGNF: number;
    projectedMarginPct: number;
    costPerHectareAvgGNF: number;
  };
  deliveryReliability: {
    totalShipmentsCount: number;
    onTimeShipmentsCount: number;
    delayedShipmentsCount: number;
    reliabilityScorePct: number;
  };
  topRisks: DecisionSupportRecommendation[];
  externalServices: ExternalServiceStatus[];
}

// 2. Farm Manager Dashboard
export interface FarmManagerDashboardData {
  roleView: 'FARM_MANAGER';
  fieldOperations: {
    totalDueOperations: number;
    overdueCount: number;
    inProgressCount: number;
    completedThisWeek: number;
    overdueList: Array<{
      id: string;
      campaignId: string;
      plotName: string;
      operationName: string;
      plannedDate: string;
      delayDays: number;
      responsible: string;
    }>;
  };
  cropConditions: Array<{
    plotId: string;
    plotName: string;
    cropName: string;
    varietyName: string;
    currentStage: string;
    healthStatus: 'OPTIMAL' | 'VIGILANCE' | 'ALERT';
    areaHa: number;
  }>;
  harvestForecast: {
    nextHarvestDate?: string;
    expectedTonnageNext30Days: number;
    campaignsReadyForHarvest: number;
  };
  laborAllocation: {
    activeFieldTeamsCount: number;
    totalWorkersMobilized: number;
    nextInterventionTeam: string;
  };
  inputShortages: Array<{
    itemId: string;
    itemName: string;
    category: string;
    currentStock: number;
    unit: string;
    minimumRequired: number;
    status: 'SUFFICIENT' | 'LOW' | 'CRITICAL_DEFICIT';
  }>;
  recommendations: DecisionSupportRecommendation[];
  externalServices: ExternalServiceStatus[];
}

// 3. Agronomist Dashboard
export interface AgronomistDashboardData {
  roleView: 'AGRONOMIST';
  cropStages: Array<{
    campaignId: string;
    cropName: string;
    variety: string;
    plotName: string;
    stage: string;
    daysInStage: number;
    totalCycleDays: number;
    cycleProgressPct: number;
  }>;
  fieldObservations: Array<{
    id: string;
    date: string;
    plotName: string;
    crop: string;
    observer: string;
    type: 'PEST_DISEASE' | 'SOIL_MOISTURE' | 'GROWTH_VIGOR' | 'NUTRIENT_DEFICIENCY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    notes: string;
  }>;
  plannedInterventions: Array<{
    id: string;
    campaignId: string;
    plotName: string;
    type: string;
    scheduledDate: string;
    inputProduct: string;
    dosePerHa: string;
  }>;
  yieldForecasts: Array<{
    campaignId: string;
    crop: string;
    plot: string;
    targetYieldTonsPerHa: number;
    currentEstimateTonsPerHa: number;
    variancePct: number;
  }>;
  recommendations: DecisionSupportRecommendation[];
  externalServices: ExternalServiceStatus[];
}

// 4. Commercial Manager Dashboard
export interface CommercialDashboardData {
  roleView: 'COMMERCIAL_MANAGER';
  buyerPipeline: {
    totalBuyersCount: number;
    activeContractsCount: number;
    leadsCount: number;
    buyersByCountry: Record<string, number>;
  };
  quotationsAndOrders: {
    quotationsDraftCount: number;
    ordersConfirmedCount: number;
    unfulfilledOrdersCount: number;
    totalCommittedValueGNF: number;
    averagePricePerKgGNF: number;
  };
  demandVsSupplyBalance: {
    pepperReservedTons: number;
    pepperAvailableTons: number;
    cassavaReservedTons: number;
    cassavaAvailableTons: number;
    shortageRiskTons: number;
  };
  upcomingDeadlines: Array<{
    orderId: string;
    orderNumber: string;
    buyerName: string;
    deliveryDeadline: string;
    volumeTons: number;
    fulfillmentStatus: string;
    daysRemaining: number;
  }>;
  recommendations: DecisionSupportRecommendation[];
}

// 5. Processing Manager Dashboard
export interface ProcessingDashboardData {
  roleView: 'PROCESSING_MANAGER';
  incomingRawMaterial: {
    harvestedProducePendingProcessingTons: number;
    receptionLotsCount: number;
    rawProduceInventoryTons: number;
  };
  productionPlans: {
    activeBatchesCount: number;
    inProgressBatchRunsCount: number;
    plannedBatchesCount: number;
  };
  capacityUtilization: {
    installedDailyCapacityKg: number;
    currentDailyThroughputKg: number;
    utilizationRatePct: number;
    bottleneckStage: string;
  };
  batchYields: Array<{
    batchId: string;
    batchNumber: string;
    productName: string;
    inputKg: number;
    outputKg: number;
    conversionYieldPct: number;
    expectedYieldPct: number;
    variancePct: number;
  }>;
  qualityFailures: Array<{
    inspectionId: string;
    lotOrBatchNumber: string;
    defectType: string;
    rejectedQuantityKg: number;
    rejectionRatePct: number;
    blocksDispatch: boolean;
  }>;
  finishedStockLevels: Array<{
    itemId: string;
    itemName: string;
    packagingUnit: string;
    stockAvailableKg: number;
    stockQuarantinedKg: number;
  }>;
  recommendations: DecisionSupportRecommendation[];
}

// 6. Logistics Manager Dashboard
export interface LogisticsDashboardData {
  roleView: 'LOGISTICS_MANAGER';
  shipmentsInProgress: {
    totalActiveShipments: number;
    dispatchedInTransitCount: number;
    deliveredCount: number;
    delayedCount: number;
  };
  milestoneTracking: Array<{
    shipmentId: string;
    trackingNumber: string;
    currentMilestone: string;
    nextMilestone: string;
    destination: string;
    plannedArrival: string;
    estimatedArrival: string;
    delayHours: number;
    status: string;
  }>;
  documentCompliance: {
    totalDocumentsRequired: number;
    approvedCount: number;
    pendingInspectionCount: number;
    rejectedOrMissingCount: number;
    missingCriticalDocuments: Array<{
      shipmentId: string;
      trackingNumber: string;
      documentType: string;
      destinationMarket: string;
    }>;
  };
  carrierPerformance: Array<{
    carrierName: string;
    totalVoyages: number;
    averageDelayHours: number;
    onTimeRatePct: number;
  }>;
  recommendations: DecisionSupportRecommendation[];
}

// 7. Finance Manager Dashboard
export interface FinanceDashboardData {
  roleView: 'FINANCE_MANAGER';
  budgetExecution: {
    totalPlannedOpexGNF: number;
    totalActualOpexGNF: number;
    opexVarianceGNF: number;
    totalPlannedCapexGNF: number;
    totalActualCapexGNF: number;
    overrunBudgetsCount: number;
  };
  cashFlowSummary: {
    cumulativeCashBalanceGNF: number;
    peakWorkingCapitalDeficitGNF: number;
    projectedNextMonthNetFlowGNF: number;
    cashDeficitProjected: boolean;
  };
  outstandingCommercialReceipts: {
    totalReceivablesGNF: number;
    overdueReceivablesGNF: number;
    pendingInvoicesCount: number;
  };
  unitEconomicsAndMargins: {
    averageCostPerHaGNF: number;
    averageCostPerKgGNF: number;
    overallGrossMarginPct: number;
    overallOperatingMarginPct: number;
  };
  budgetCategoryBreakdown: Array<{
    category: string;
    plannedGNF: number;
    actualGNF: number;
    varianceGNF: number;
    variancePct: number;
  }>;
  recommendations: DecisionSupportRecommendation[];
}

export type AnyDashboardData =
  | ExecutiveDashboardData
  | FarmManagerDashboardData
  | AgronomistDashboardData
  | CommercialDashboardData
  | ProcessingDashboardData
  | LogisticsDashboardData
  | FinanceDashboardData;
