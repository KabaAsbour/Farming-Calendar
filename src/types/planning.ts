import { BaseEntity, ISODateString, UUID } from './common.ts';

export type PlanningStageType =
  | 'LAND_PREPARATION'
  | 'INPUT_PROCUREMENT'
  | 'NURSERY_SOWING'
  | 'TRANSPLANTING_PLANTING'
  | 'VEGETATIVE_MAINTENANCE'
  | 'IRRIGATION_FERTIGATION'
  | 'PEST_DISEASE_CONTROL'
  | 'HARVEST_WINDOW'
  | 'POST_HARVEST_SORTING'
  | 'PROCESSING_TRANSFORMATION'
  | 'QUALITY_CERTIFICATION'
  | 'PACKAGING_EXPORT'
  | 'TRANSPORT_LOGISTICS'
  | 'BUYER_DELIVERY';

export interface StageDependency {
  predecessorStageId: string;
  type: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH';
  lagDays: number;
}

export interface ResourceRequirement {
  resourceType: 'LABOR' | 'INPUT' | 'EQUIPMENT';
  name: string;
  quantity: number;
  unit: string;
  estimatedCostGNF: number;
}

export interface AgronomicStageConfig {
  id: string;
  stageType: PlanningStageType;
  name: string;
  sequenceOrder: number;
  recommendedDurationDays: number;
  minDurationDays: number;
  maxDurationDays: number;
  earliestPermissibleDayOffset?: number; // offset from campaign start
  latestPermissibleDayOffset?: number;
  dependencies: StageDependency[];
  resourceRequirements: ResourceRequirement[];
  weatherSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  operationalRisks: string[];
  responsibleTeamRole: string;
  notes?: string;
}

export interface AgronomicCropPlanMaster extends BaseEntity {
  cropId: UUID;
  cropVarietyId?: UUID;
  name: string;
  region: 'KINDIA' | 'MAMOU' | 'DALABA' | 'BOKE' | 'KANKAN' | 'NZEREKORE' | 'GUINEA_GENERAL';
  soilTypeCompatibility: string[];
  waterSourceRecommended: string;
  seasonCompatibility: 'DRY_SEASON' | 'RAINY_SEASON' | 'YEAR_ROUND';
  expectedYieldPerHaMinTons: number;
  expectedYieldPerHaMaxTons: number;
  standardYieldPerHaTons: number;
  expectedLossRatePct: number; // e.g. 8%
  stages: AgronomicStageConfig[];
  localValidationStatus: 'PENDING_VALIDATION' | 'VALIDATED_BY_AGRONOMIST' | 'OFFICIAL_RECOMMENDATION';
  validatedByExpertName?: string;
  version: number;
  isActive: boolean;
}

export interface BackwardScheduleStageStep {
  stageId: string;
  stageName: string;
  stageType: PlanningStageType;
  durationDays: number;
  startDate: ISODateString;
  endDate: ISODateString;
  dependencies: string[];
  isCriticalPath: boolean;
  bufferDays: number;
  assumptions: string;
  riskNotice?: string;
}

export interface BackwardAlternativeScenario {
  id: string;
  title: string;
  description: string;
  adjustedDeliveryDate?: ISODateString;
  adjustedPlantingDate?: ISODateString;
  additionalCapacityRequired?: string;
  alternativeSourcing?: string;
  feasibilityScore: number; // 0 - 100
}

export interface BackwardScheduleResult {
  targetDeliveryDate: ISODateString;
  targetQuantityTons: number;
  productName: string;
  buyerDestination: string;
  calculatedPlantingStart: ISODateString;
  calculatedPreparationStart: ISODateString;
  daysUntilPrepStart: number;
  isFeasible: boolean;
  feasibilitySummary: string;
  totalCycleDays: number;
  criticalPathStages: string[];
  steps: BackwardScheduleStageStep[];
  alternativeScenarios: BackwardAlternativeScenario[];
  assumptions: {
    growthCycleDays: number;
    harvestDurationDays: number;
    processingDailyCapacityTons: number;
    transportTransitDays: number;
    qualityInspectionDays: number;
    exportPackagingDays: number;
  };
}

export interface ProductionForecastCalculation {
  campaignId: UUID;
  campaignName: string;
  areaHa: number;
  baseYieldTonsPerHa: number;
  irrigationFactor: number; // 0.8 to 1.2
  soilFactor: number; // 0.8 to 1.15
  lossRatePct: number; // e.g. 5%
  forecastQuantityTons: number;
  plannedQuantityTons: number;
  actualQuantityTons: number;
  varianceTons: number;
  variancePct: number;
  status: 'SURPLUS' | 'ON_TRACK' | 'DEFICIT_RISK' | 'CRITICAL_SHORTAGE';
}

export interface PlanningAlert {
  id: string;
  organizationId: UUID;
  type: 'OVERDUE_OPERATION' | 'SCHEDULE_CONFLICT' | 'DEFICIT_RISK' | 'DEADLINE_MISMATCH' | 'INPUT_SHORTAGE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  campaignId?: UUID;
  relatedDate?: ISODateString;
  actionRequired: string;
  isResolved: boolean;
}
