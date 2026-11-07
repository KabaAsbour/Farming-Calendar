import { BaseEntity, CurrencyCode, ISODateString, UUID } from './common.ts';
import { UserRole } from './organization.ts';

export type ExpenseNature = 'OPEX' | 'CAPEX';

export type BudgetCategory =
  | 'LAND_PREPARATION_PLANTING'
  | 'SEED_PLANTING_MATERIAL'
  | 'FERTILIZERS_CROP_PROTECTION'
  | 'IRRIGATION_WATER'
  | 'LABOR'
  | 'MACHINERY_MAINTENANCE'
  | 'HARVEST_POST_HARVEST'
  | 'PROCESSING_EQUIPMENT_OPERATING'
  | 'PACKAGING'
  | 'STORAGE'
  | 'TRANSPORT_EXPORT'
  | 'MARKETING_ADMIN_FINANCE'
  | 'LAND_ACQUISITION_INFRASTRUCTURE'
  | 'IRRIGATION_SYSTEM_INVESTMENT'
  | 'TRACTOR_VEHICLE_PURCHASE'
  | 'PROCESSING_UNIT_CONSTRUCTION';

export type BudgetEntityType = 'CAMPAIGN' | 'FARM' | 'PROCESSING_UNIT' | 'COMMERCIAL_ORDER' | 'ORGANIZATION_OVERALL';

export interface BudgetLineItem extends BaseEntity {
  organizationId: UUID;
  entityType: BudgetEntityType;
  entityId: UUID;
  entityName: string;
  fiscalYear: number;
  category: BudgetCategory;
  expenseNature: ExpenseNature;
  title: string;
  currency: CurrencyCode;
  plannedBudget: number;
  committedAmount: number;
  actualExpenditure: number;
  forecastRemaining: number;
  varianceAmount: number;
  variancePercentage: number;
  notes?: string;
}

export interface ExchangeRateRecord {
  id: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  effectiveDate: ISODateString;
  source: string;
  isManualOverride: boolean;
}

export interface CashFlowPeriod {
  periodLabel: string;
  inflowPlanned: number;
  inflowActual: number;
  outflowPlanned: number;
  outflowActual: number;
  netCashFlow: number;
  cumulativeCashBalance: number;
}

export interface CampaignFinancialPerformance {
  campaignId: UUID;
  campaignName: string;
  cropName: string;
  varietyName: string;
  areaHa: number;
  currency: CurrencyCode;
  reportingExchangeRateToGNF: number;

  // Physical Production Breakdown
  grossHarvestTons: number;
  processingLossPct: number;
  processingLossTons: number;
  qualityRejectedPct: number;
  qualityRejectedTons: number;
  saleableOutputTons: number;
  
  // Commercial Channels
  localSalesTons: number;
  localPricePerKg: number;
  localRevenue: number;

  exportSalesTons: number;
  exportPricePerKg: number;
  exportRevenue: number;

  unsoldStockTons: number;
  unsoldStockValuation: number;

  totalRevenue: number;

  // Costs
  totalOpex: number;
  totalCapexAllocated: number;
  totalCost: number;

  // Key Profitability Metrics
  costPerHectare: number;
  costPerKg: number;
  grossMargin: number;
  grossMarginPct: number;
  contributionMargin: number;
  contributionMarginPct: number;
  operatingProfitEbit: number;
  operatingProfitMarginPct: number;

  // Break-even
  breakEvenPricePerKg: number;
  breakEvenQuantityTons: number;
  breakEvenYieldTonsPerHa: number;

  // Working Capital
  workingCapitalRequirement: number; // Peak cumulative cash deficit
  cashFlowSchedule: CashFlowPeriod[];

  costBreakdownByCategory: Array<{
    category: BudgetCategory;
    expenseNature: ExpenseNature;
    amount: number;
    percentageOfTotal: number;
  }>;
}

export interface InvestmentAppraisalParams {
  projectName: string;
  initialInvestmentCapex: number;
  discountRatePct: number;
  inflationRatePct: number;
  financingInterestRatePct: number;
  taxRatePct: number;
  projectLifespanYears: number;
  annualRevenues: number[];
  annualOpexCosts: number[];
  terminalValue?: number;
  assumptionsNotes?: string;
}

export interface InvestmentAppraisalResult {
  projectName: string;
  hasAdequateData: boolean;
  npv: number;
  irrPct: number;
  simplePaybackYears: number;
  discountedPaybackYears: number;
  roiPct: number;
  discountRatePct: number;
  annualCashFlows: Array<{
    year: number;
    grossInflow: number;
    opexOutflow: number;
    taxAndFinancing: number;
    netCashFlow: number;
    discountedCashFlow: number;
    cumulativeDiscountedCashFlow: number;
  }>;
  assumptions: {
    discountRate: string;
    inflationRate: string;
    financingCost: string;
    taxRate: string;
    lifespan: string;
    notes: string;
  };
  limitationsWarnings: string[];
}

export type FinancialScenarioType =
  | 'BASE'
  | 'OPTIMISTIC'
  | 'PESSIMISTIC'
  | 'STRESS_YIELD_SHORTFALL_20'
  | 'STRESS_PRICE_DROP_15'
  | 'STRESS_COST_INFLATION_15'
  | 'STRESS_DELAYED_PAYMENT_60D'
  | 'STRESS_REJECTED_STOCK_15'
  | 'STRESS_LOGISTICS_DELAY';

export interface FinancialScenarioComparisonItem {
  scenarioId: FinancialScenarioType;
  scenarioKey?: string;
  scenarioName: string;
  description: string;
  saleableOutputTons: number;
  averagePricePerKg: number;
  totalRevenue: number;
  totalOpex: number;
  operatingProfitEbit: number;
  operatingProfitMarginPct: number;
  costPerKg: number;
  breakEvenPricePerKg: number;
  workingCapitalPeakDeficit: number;
  npvProjected: number;
  notes: string;
}
