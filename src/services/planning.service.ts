/**
 * FARMING CALENDAR — MASTER PLANNING & BACKWARD SCHEDULING ENGINE (PHASE 4)
 * Grounded agronomic models, backward schedule calculation, yield forecasting, and conflict detection.
 */

import { UUID, ISODateString } from '../types/common.ts';
import {
  AgronomicCropPlanMaster,
  BackwardScheduleResult,
  BackwardAlternativeScenario,
  BackwardScheduleStageStep,
  ProductionForecastCalculation,
  PlanningAlert
} from '../types/planning.ts';
import { UserRole } from '../types/organization.ts';
import { logAuditEvent } from './audit.service.ts';

// Regional Crop Plan Presets for Guinea
const DEFAULT_GUINEA_PLANS: Record<string, Partial<AgronomicCropPlanMaster>> = {
  PEPPER_S17: {
    name: 'Itinéraire Technique Piment S17 — Kindia & Fouta',
    region: 'KINDIA',
    seasonCompatibility: 'YEAR_ROUND',
    standardYieldPerHaTons: 15.0,
    expectedYieldPerHaMinTons: 12.0,
    expectedYieldPerHaMaxTons: 20.0,
    expectedLossRatePct: 6.0,
    soilTypeCompatibility: ['Sablo-limoneux', 'Terres d\'alluvions bien drainées'],
    waterSourceRecommended: 'Goutte-à-goutte ou aspersion régulière',
    localValidationStatus: 'VALIDATED_BY_AGRONOMIST',
    validatedByExpertName: 'Dr. Alpha Bah (IRAG Kindia)',
    stages: [
      {
        id: 'STAGE_LAND_PREP',
        stageType: 'LAND_PREPARATION',
        name: 'Labour, désherbage et confection des billons',
        sequenceOrder: 1,
        recommendedDurationDays: 14,
        minDurationDays: 10,
        maxDurationDays: 20,
        dependencies: [],
        resourceRequirements: [
          { resourceType: 'LABOR', name: 'Ouvriers agricoles pour billonnage', quantity: 8, unit: 'personne-jours', estimatedCostGNF: 800000 },
          { resourceType: 'INPUT', name: 'Fumier décomposé ou compost', quantity: 5000, unit: 'kg', estimatedCostGNF: 2500000 }
        ],
        weatherSensitivity: 'LOW',
        operationalRisks: ['Pluies battantes détruisant les billons', 'Rares engins de labour disponibles'],
        responsibleTeamRole: 'AGRONOMIST'
      },
      {
        id: 'STAGE_NURSERY',
        stageType: 'NURSERY_SOWING',
        name: 'Semis en pépinière et levée',
        sequenceOrder: 2,
        recommendedDurationDays: 30,
        minDurationDays: 25,
        maxDurationDays: 35,
        dependencies: [{ predecessorStageId: 'STAGE_LAND_PREP', type: 'START_TO_START', lagDays: 0 }],
        resourceRequirements: [
          { resourceType: 'INPUT', name: 'Semences certifiées S17', quantity: 250, unit: 'grammes', estimatedCostGNF: 600000 },
          { resourceType: 'EQUIPMENT', name: 'Voile d\'ombrage & pulvérisateur manuel', quantity: 1, unit: 'kit', estimatedCostGNF: 350000 }
        ],
        weatherSensitivity: 'HIGH',
        operationalRisks: ['Fonte des semis', 'Attaque d\'altises ou pucerons'],
        responsibleTeamRole: 'AGRONOMIST'
      },
      {
        id: 'STAGE_TRANSPLANT',
        stageType: 'TRANSPLANTING_PLANTING',
        name: 'Repiquage en plein champ avec tuteurage',
        sequenceOrder: 3,
        recommendedDurationDays: 7,
        minDurationDays: 5,
        maxDurationDays: 10,
        dependencies: [{ predecessorStageId: 'STAGE_NURSERY', type: 'FINISH_TO_START', lagDays: 1 }],
        resourceRequirements: [
          { resourceType: 'LABOR', name: 'Équipe de repiquage', quantity: 12, unit: 'personne-jours', estimatedCostGNF: 1200000 }
        ],
        weatherSensitivity: 'HIGH',
        operationalRisks: ['Stress hydrique au repiquage si pas d\'arrosage immédiat'],
        responsibleTeamRole: 'OPERATIONS_STAFF'
      },
      {
        id: 'STAGE_GROWTH',
        stageType: 'VEGETATIVE_MAINTENANCE',
        name: 'Entretien végétatif, binage & fertirrigation',
        sequenceOrder: 4,
        recommendedDurationDays: 60,
        minDurationDays: 50,
        maxDurationDays: 70,
        dependencies: [{ predecessorStageId: 'STAGE_TRANSPLANT', type: 'FINISH_TO_START', lagDays: 0 }],
        resourceRequirements: [
          { resourceType: 'INPUT', name: 'Engrais soluble NPK & nitrate de potassium', quantity: 300, unit: 'kg', estimatedCostGNF: 3600000 }
        ],
        weatherSensitivity: 'MEDIUM',
        operationalRisks: ['Anthracnose en saison des pluies', 'Attaque de mouches des fruits'],
        responsibleTeamRole: 'AGRONOMIST'
      },
      {
        id: 'STAGE_HARVEST',
        stageType: 'HARVEST_WINDOW',
        name: 'Récoltes échelonnées à maturité optimale',
        sequenceOrder: 5,
        recommendedDurationDays: 30,
        minDurationDays: 20,
        maxDurationDays: 45,
        dependencies: [{ predecessorStageId: 'STAGE_GROWTH', type: 'FINISH_TO_START', lagDays: 0 }],
        resourceRequirements: [
          { resourceType: 'LABOR', name: 'Cueilleurs sélectifs', quantity: 20, unit: 'personne-jours', estimatedCostGNF: 2000000 },
          { resourceType: 'EQUIPMENT', name: 'Caisses aérées récolte', quantity: 150, unit: 'unités', estimatedCostGNF: 1500000 }
        ],
        weatherSensitivity: 'HIGH',
        operationalRisks: ['Pourriture si cueillette par temps pluvieux sans séchage immédiat'],
        responsibleTeamRole: 'OPERATIONS_STAFF'
      }
    ]
  },
  CASSAVA_BONOUA: {
    name: 'Itinéraire Technique Manioc Bonoua (Tubercules & Amidon)',
    region: 'KINDIA',
    seasonCompatibility: 'YEAR_ROUND',
    standardYieldPerHaTons: 25.0,
    expectedYieldPerHaMinTons: 18.0,
    expectedYieldPerHaMaxTons: 35.0,
    expectedLossRatePct: 4.0,
    soilTypeCompatibility: ['Sablo-argileux', 'Profond et meuble'],
    waterSourceRecommended: 'Pluvial avec appoint si saison sèche prolongée',
    localValidationStatus: 'OFFICIAL_RECOMMENDATION',
    validatedByExpertName: 'Centre National de Semences de Guinée',
    stages: [
      {
        id: 'STAGE_CASSAVA_PREP',
        stageType: 'LAND_PREPARATION',
        name: 'Défrichage, labour profond et buttage',
        sequenceOrder: 1,
        recommendedDurationDays: 20,
        minDurationDays: 14,
        maxDurationDays: 25,
        dependencies: [],
        resourceRequirements: [{ resourceType: 'LABOR', name: 'Confection des buttes', quantity: 15, unit: 'j/h', estimatedCostGNF: 1500000 }],
        weatherSensitivity: 'LOW',
        operationalRisks: ['Terre trop compacte'],
        responsibleTeamRole: 'AGRONOMIST'
      },
      {
        id: 'STAGE_CASSAVA_PLANT',
        stageType: 'TRANSPLANTING_PLANTING',
        name: 'Bouturage tiges saines désinfectées',
        sequenceOrder: 2,
        recommendedDurationDays: 14,
        minDurationDays: 10,
        maxDurationDays: 18,
        dependencies: [{ predecessorStageId: 'STAGE_CASSAVA_PREP', type: 'FINISH_TO_START', lagDays: 0 }],
        resourceRequirements: [{ resourceType: 'INPUT', name: 'Boutures certifiées Bonoua', quantity: 10000, unit: 'boutures/ha', estimatedCostGNF: 2000000 }],
        weatherSensitivity: 'MEDIUM',
        operationalRisks: ['Pourriture de boutures en cas d\'engorgement d\'eau'],
        responsibleTeamRole: 'OPERATIONS_STAFF'
      },
      {
        id: 'STAGE_CASSAVA_CYCLE',
        stageType: 'VEGETATIVE_MAINTENANCE',
        name: 'Désherbage précoce et buttage d\'entretien',
        sequenceOrder: 3,
        recommendedDurationDays: 210,
        minDurationDays: 180,
        maxDurationDays: 240,
        dependencies: [{ predecessorStageId: 'STAGE_CASSAVA_PLANT', type: 'FINISH_TO_START', lagDays: 0 }],
        resourceRequirements: [{ resourceType: 'LABOR', name: 'Désherbage 2 passages', quantity: 20, unit: 'j/h', estimatedCostGNF: 2000000 }],
        weatherSensitivity: 'LOW',
        operationalRisks: ['Mosaïque africaine du manioc'],
        responsibleTeamRole: 'AGRONOMIST'
      },
      {
        id: 'STAGE_CASSAVA_HARVEST',
        stageType: 'HARVEST_WINDOW',
        name: 'Arrachage mécanique ou manuel des tubercules',
        sequenceOrder: 4,
        recommendedDurationDays: 30,
        minDurationDays: 20,
        maxDurationDays: 45,
        dependencies: [{ predecessorStageId: 'STAGE_CASSAVA_CYCLE', type: 'FINISH_TO_START', lagDays: 0 }],
        resourceRequirements: [{ resourceType: 'LABOR', name: 'Équipe d\'arrachage', quantity: 25, unit: 'j/h', estimatedCostGNF: 2500000 }],
        weatherSensitivity: 'MEDIUM',
        operationalRisks: ['Tubercules blessés s\'altérant en 48 heures si non transformés'],
        responsibleTeamRole: 'OPERATIONS_STAFF'
      }
    ]
  }
};

/**
 * Backward Schedule Calculation Options
 */
export interface BackwardScheduleOptions {
  targetDeliveryDate: ISODateString;
  targetQuantityTons?: number;
  totalVolumeTons?: number;
  productKey?: 'PEPPER_S17' | 'CASSAVA_BONOUA' | 'WATERMELON_KAOLACK' | string;
  campaignId?: string;
  cropId?: string;
  customDurations?: {
    deliveryDays?: number;
    transitDays?: number;
    packagingDays?: number;
    qualityDays?: number;
    processingDays?: number;
    harvestDays?: number;
    vegetativeDays?: number;
    plantingDays?: number;
    prepDays?: number;
  };
  processingCapacityTonsPerDay?: number;
  todayOverride?: Date;
}

export class PlanningService {
  /**
   * Calculate backward schedule from desired buyer delivery date
   */
  public static calculateBackwardSchedule(options: BackwardScheduleOptions): BackwardScheduleResult {
    const targetDate = new Date(options.targetDeliveryDate);
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid target delivery date format. Must be YYYY-MM-DD.');
    }

    const today = options.todayOverride || new Date();
    const product = options.productKey || 'PEPPER_S17';

    // Durations resolution
    let dDelivery = options.customDurations?.deliveryDays ?? 1;
    let dTransit = options.customDurations?.transitDays ?? 2;
    let dPackaging = options.customDurations?.packagingDays ?? 3;
    let dQuality = options.customDurations?.qualityDays ?? 3;
    
    // Processing duration dynamically scaled with quantity if needed
    const capacityPerDay = options.processingCapacityTonsPerDay || (product === 'CASSAVA_BONOUA' ? 5 : 4);
    const targetQty = Number(options.targetQuantityTons || (options as any).totalVolumeTons) || 10;
    const calculatedProcessingDays = Math.ceil(targetQty / capacityPerDay);
    let dProcessing = options.customDurations?.processingDays ?? Math.max(3, calculatedProcessingDays);

    let dHarvest = options.customDurations?.harvestDays ?? (product === 'CASSAVA_BONOUA' ? 25 : 20);
    let dGrowth = options.customDurations?.vegetativeDays ?? (product === 'CASSAVA_BONOUA' ? 210 : product === 'WATERMELON_KAOLACK' ? 65 : 70);
    let dPlanting = options.customDurations?.plantingDays ?? (product === 'CASSAVA_BONOUA' ? 14 : 10);
    let dPrep = options.customDurations?.prepDays ?? 14;

    const subtractDays = (d: Date, days: number): Date => {
      const res = new Date(d);
      res.setDate(res.getDate() - days);
      return res;
    };

    const toISODate = (d: Date): string => d.toISOString().split('T')[0];

    // Compute chain backwards
    const dtDelivery = new Date(targetDate);
    const dtDispatch = subtractDays(dtDelivery, dDelivery);
    const dtPackaging = subtractDays(dtDispatch, dTransit);
    const dtQuality = subtractDays(dtPackaging, dPackaging);
    const dtProcessing = subtractDays(dtQuality, dQuality);
    const dtHarvestEnd = subtractDays(dtProcessing, dProcessing);
    const dtHarvestStart = subtractDays(dtHarvestEnd, dHarvest);
    const dtGrowthStart = subtractDays(dtHarvestStart, dGrowth);
    const dtPlantingStart = subtractDays(dtGrowthStart, dPlanting);
    const dtPrepStart = subtractDays(dtPlantingStart, dPrep);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilPrepStart = Math.ceil((dtPrepStart.getTime() - today.getTime()) / msPerDay);
    const isFeasible = daysUntilPrepStart >= 0;

    const totalCycleDays = dPrep + dPlanting + dGrowth + dHarvest + dProcessing + dQuality + dPackaging + dTransit + dDelivery;

    const steps: BackwardScheduleStageStep[] = [
      {
        stageId: 'STAGE_PREP',
        stageName: '1. Préparation du sol & amendements',
        stageType: 'LAND_PREPARATION',
        durationDays: dPrep,
        startDate: toISODate(dtPrepStart),
        endDate: toISODate(dtPlantingStart),
        dependencies: [],
        isCriticalPath: true,
        bufferDays: Math.max(0, daysUntilPrepStart),
        assumptions: 'Labour 30cm, apport fumier 5t/ha, mise en billons',
        riskNotice: daysUntilPrepStart < 0 ? 'DATE DÉPASSÉE : Impossible de respecter le délai sans avancer le semis' : undefined
      },
      {
        stageId: 'STAGE_PLANT',
        stageName: '2. Pépinière & Repiquage / Semis',
        stageType: 'TRANSPLANTING_PLANTING',
        durationDays: dPlanting,
        startDate: toISODate(dtPlantingStart),
        endDate: toISODate(dtGrowthStart),
        dependencies: ['STAGE_PREP'],
        isCriticalPath: true,
        bufferDays: 2,
        assumptions: 'Plants de 30 jours prêts en motte ou boutures saines',
      },
      {
        stageId: 'STAGE_GROWTH',
        stageName: '3. Cycle végétatif & irrigation soutenue',
        stageType: 'VEGETATIVE_MAINTENANCE',
        durationDays: dGrowth,
        startDate: toISODate(dtGrowthStart),
        endDate: toISODate(dtHarvestStart),
        dependencies: ['STAGE_PLANT'],
        isCriticalPath: true,
        bufferDays: 5,
        assumptions: 'Régime hydrique contrôlé, fertilisation fractionnée',
        riskNotice: 'Sensible aux aléas climatiques : prévoir bâche ou filet ombrage'
      },
      {
        stageId: 'STAGE_HARVEST',
        stageName: '4. Fenêtre de récolte sélective',
        stageType: 'HARVEST_WINDOW',
        durationDays: dHarvest,
        startDate: toISODate(dtHarvestStart),
        endDate: toISODate(dtHarvestEnd),
        dependencies: ['STAGE_GROWTH'],
        isCriticalPath: true,
        bufferDays: 3,
        assumptions: 'Cueillette quotidienne le matin à la fraîche',
      },
      {
        stageId: 'STAGE_PROCESS',
        stageName: '5. Séchage, calibrage & transformation',
        stageType: 'PROCESSING_TRANSFORMATION',
        durationDays: dProcessing,
        startDate: toISODate(dtHarvestEnd),
        endDate: toISODate(dtQuality),
        dependencies: ['STAGE_HARVEST'],
        isCriticalPath: true,
        bufferDays: 2,
        assumptions: `Cadence d'usinage de ${capacityPerDay} t/jour`,
      },
      {
        stageId: 'STAGE_QUALITY',
        stageName: '6. Contrôle qualité & certificat phytosanitaire',
        stageType: 'QUALITY_CERTIFICATION',
        durationDays: dQuality,
        startDate: toISODate(dtQuality),
        endDate: toISODate(dtPackaging),
        dependencies: ['STAGE_PROCESS'],
        isCriticalPath: true,
        bufferDays: 2,
        assumptions: 'Contrôle résidus & taux d\'humidité conforme export UE',
      },
      {
        stageId: 'STAGE_PACK',
        stageName: '7. Emballage export & étiquetage traçable',
        stageType: 'PACKAGING_EXPORT',
        durationDays: dPackaging,
        startDate: toISODate(dtPackaging),
        endDate: toISODate(dtDispatch),
        dependencies: ['STAGE_QUALITY'],
        isCriticalPath: true,
        bufferDays: 1,
        assumptions: 'Cartons 5kg ventilés avec code lot et QR code',
      },
      {
        stageId: 'STAGE_LOGISTICS',
        stageName: '8. Acheminement Kindia -> Port / Aéroport',
        stageType: 'TRANSPORT_LOGISTICS',
        durationDays: dTransit,
        startDate: toISODate(dtDispatch),
        endDate: toISODate(dtDelivery),
        dependencies: ['STAGE_PACK'],
        isCriticalPath: true,
        bufferDays: 1,
        assumptions: 'Camion bâché/frigorifique climatisé',
      },
      {
        stageId: 'STAGE_DELIVERY',
        stageName: '9. Livraison & mise à disposition acheteur',
        stageType: 'BUYER_DELIVERY',
        durationDays: dDelivery,
        startDate: toISODate(dtDelivery),
        endDate: toISODate(dtDelivery),
        dependencies: ['STAGE_LOGISTICS'],
        isCriticalPath: true,
        bufferDays: 0,
        assumptions: 'Bordereau de livraison émargé et transfert de propriété',
      }
    ];

    // Build alternative scenarios if impossible
    const alternativeScenarios: BackwardAlternativeScenario[] = [];

    if (!isFeasible) {
      // Scenario 1: Push target delivery date forward by missing days + buffer
      const feasibleDeliveryDate = new Date(targetDate);
      feasibleDeliveryDate.setDate(feasibleDeliveryDate.getDate() + Math.abs(daysUntilPrepStart) + 7);
      alternativeScenarios.push({
        id: 'SCENARIO_POSTPONE_DELIVERY',
        title: 'Reporter la date de livraison contractuelle',
        description: `Négocier un report de la date de livraison au ${toISODate(feasibleDeliveryDate)} pour permettre le cycle biologique complet de la plante.`,
        adjustedDeliveryDate: toISODate(feasibleDeliveryDate),
        feasibilityScore: 95
      });

      // Scenario 2: Double processing capacity
      if (dProcessing > 4) {
        alternativeScenarios.push({
          id: 'SCENARIO_DOUBLE_CAPACITY',
          title: 'Accélérer la cadence de traitement (Double Shift)',
          description: `Augmenter la capacité d'usinage de ${capacityPerDay} t/j à ${capacityPerDay * 2} t/j pour économiser ${Math.floor(dProcessing / 2)} jours sur le post-récolte.`,
          additionalCapacityRequired: `Équipe de nuit + 2 séchoirs solaires additionnels (+${capacityPerDay} t/j)`,
          feasibilityScore: 75
        });
      }

      // Scenario 3: Procure from partner cooperative with ready crop
      alternativeScenarios.push({
        id: 'SCENARIO_SOURCING_PARTNER',
        title: 'Compléter par approvisionnement coopérative partenaire',
        description: 'Sélectionner des lots conformes auprès des producteurs certifiés de Dalaba ou Mamou ayant des récoltes déjà en cours.',
        alternativeSourcing: 'Coopérative Maraîchère du Fouta (Kindia/Mamou)',
        feasibilityScore: 88
      });
    }

    return {
      targetDeliveryDate: options.targetDeliveryDate,
      targetQuantityTons: options.targetQuantityTons ?? options.totalVolumeTons ?? 10,
      productName: product === 'PEPPER_S17' ? 'Piment S17 / Habanero Amélioré' : product === 'CASSAVA_BONOUA' ? 'Manioc Bonoua' : 'Pastèque Kaolack',
      buyerDestination: 'Port Autonome de Conakry / Terminal Export',
      calculatedPlantingStart: toISODate(dtPlantingStart),
      calculatedPreparationStart: toISODate(dtPrepStart),
      daysUntilPrepStart,
      isFeasible,
      feasibilitySummary: isFeasible
        ? `Calendrier réalisable. Il reste ${daysUntilPrepStart} jours de battement avant le lancement de la préparation du sol.`
        : `ATTENTION : Date impossible. Le semis aurait dû démarrer il y a ${Math.abs(daysUntilPrepStart)} jours. Scénarios alternatifs requis.`,
      totalCycleDays,
      criticalPathStages: steps.filter(s => s.isCriticalPath).map(s => s.stageId),
      steps,
      alternativeScenarios,
      assumptions: {
        growthCycleDays: dGrowth,
        harvestDurationDays: dHarvest,
        processingDailyCapacityTons: capacityPerDay,
        transportTransitDays: dTransit,
        qualityInspectionDays: dQuality,
        exportPackagingDays: dPackaging
      }
    };
  }

  /**
   * Calculate Production Yield Forecast with transparent agronomic formula
   * Formula: Area (ha) * BaseYield (t/ha) * IrrigationFactor * SoilFactor * (1 - LossRatePct / 100)
   */
  public static calculateYieldForecast(params: {
    campaignId: UUID;
    campaignName: string;
    areaHa: number;
    baseYieldTonsPerHa: number;
    irrigationFactor?: number;
    soilFactor?: number;
    lossRatePct?: number;
    plannedQuantityTons: number;
    actualQuantityTons?: number;
  }): ProductionForecastCalculation {
    const {
      campaignId,
      campaignName,
      areaHa,
      baseYieldTonsPerHa,
      irrigationFactor = 1.0,
      soilFactor = 1.0,
      lossRatePct = 5.0,
      plannedQuantityTons,
      actualQuantityTons = 0
    } = params;

    // Agronomic production forecast formula
    const grossForecast = areaHa * baseYieldTonsPerHa * irrigationFactor * soilFactor;
    const netForecast = Number((grossForecast * (1 - lossRatePct / 100)).toFixed(2));

    const varianceTons = Number((netForecast - plannedQuantityTons).toFixed(2));
    const variancePct = Number(((varianceTons / plannedQuantityTons) * 100).toFixed(1));

    let status: 'SURPLUS' | 'ON_TRACK' | 'DEFICIT_RISK' | 'CRITICAL_SHORTAGE' = 'ON_TRACK';
    if (variancePct >= 5.0) {
      status = 'SURPLUS';
    } else if (variancePct < -20.0) {
      status = 'CRITICAL_SHORTAGE';
    } else if (variancePct < -5.0) {
      status = 'DEFICIT_RISK';
    }

    return {
      campaignId,
      campaignName,
      areaHa,
      baseYieldTonsPerHa,
      irrigationFactor,
      soilFactor,
      lossRatePct,
      forecastQuantityTons: netForecast,
      plannedQuantityTons,
      actualQuantityTons,
      varianceTons,
      variancePct,
      status
    };
  }

  /**
   * Detect planning conflicts and schedule risks
   */
  public static detectPlanningConflicts(params: {
    campaigns: Array<{
      id: UUID;
      name: string;
      plotId?: UUID;
      startDate: ISODateString;
      endDate: ISODateString;
      targetDeliveryDate?: ISODateString;
      status: string;
    }>;
    operations: Array<{
      id: UUID;
      campaignId: UUID;
      name: string;
      scheduledDate: ISODateString;
      status: string;
    }>;
    today?: ISODateString;
  }): PlanningAlert[] {
    const alerts: PlanningAlert[] = [];
    const todayStr = params.today || new Date().toISOString().split('T')[0];

    // 1. Check plot overlapping usage
    const plotUsageMap: Record<string, Array<{ campaignId: UUID; name: string; start: string; end: string }>> = {};

    for (const c of params.campaigns) {
      if (!c.plotId || c.status === 'COMPLETED' || c.status === 'CANCELLED') continue;
      if (!plotUsageMap[c.plotId]) plotUsageMap[c.plotId] = [];

      for (const existing of plotUsageMap[c.plotId]) {
        // Overlap condition: startA <= endB && endA >= startB
        if (c.startDate <= existing.end && c.endDate >= existing.start) {
          alerts.push({
            id: `CONFLICT_PLOT_${c.id}_${existing.campaignId}`,
            organizationId: 'SYSTEM',
            type: 'SCHEDULE_CONFLICT',
            severity: 'CRITICAL',
            title: `Conflit d'occupation parcelle (${c.plotId})`,
            description: `Les campagnes "${c.name}" et "${existing.name}" se chevauchent sur la même parcelle entre ${c.startDate} et ${existing.end}.`,
            campaignId: c.id,
            actionRequired: 'Reprogrammer l\'une des campagnes ou réaffecter une parcelle libre.',
            isResolved: false
          });
        }
      }
      plotUsageMap[c.plotId].push({ campaignId: c.id, name: c.name, start: c.startDate, end: c.endDate });
    }

    // 2. Check overdue operations
    for (const op of params.operations) {
      if (op.status !== 'COMPLETED' && op.status !== 'CANCELLED' && op.scheduledDate < todayStr) {
        alerts.push({
          id: `OVERDUE_OP_${op.id}`,
          organizationId: 'SYSTEM',
          type: 'OVERDUE_OPERATION',
          severity: 'WARNING',
          title: `Opération en retard : ${op.name}`,
          description: `L'opération prévue le ${op.scheduledDate} n'a pas encore été validée comme terminée.`,
          campaignId: op.campaignId,
          relatedDate: op.scheduledDate,
          actionRequired: 'Mettre à jour le statut ou reprogrammer l\'opération.',
          isResolved: false
        });
      }
    }

    // 3. Check delivery deadline vs harvest end
    for (const c of params.campaigns) {
      if (c.targetDeliveryDate && c.endDate > c.targetDeliveryDate) {
        alerts.push({
          id: `DEADLINE_MISMATCH_${c.id}`,
          organizationId: 'SYSTEM',
          type: 'DEADLINE_MISMATCH',
          severity: 'CRITICAL',
          title: `Risque sur la date de livraison : ${c.name}`,
          description: `La fin des opérations agricoles (${c.endDate}) dépasse la date promise de livraison acheteur (${c.targetDeliveryDate}).`,
          campaignId: c.id,
          relatedDate: c.targetDeliveryDate,
          actionRequired: 'Déclencher le backward planning pour renégocier ou accélérer le post-récolte.',
          isResolved: false
        });
      }
    }

    return alerts;
  }

  /**
   * Retrieve agronomic crop plans with tenant validation
   */
  public static getAgronomicCropPlan(cropKey: string, userOrgId: UUID, requestedOrgId: UUID): Partial<AgronomicCropPlanMaster> {
    if (userOrgId !== requestedOrgId && userOrgId !== 'PLATFORM_SUPER_ADMIN') {
      throw new Error(`SECURITY_ERROR: Cross-tenant access blocked. User organization ${userOrgId} cannot access plans of ${requestedOrgId}`);
    }

    const plan = DEFAULT_GUINEA_PLANS[cropKey];
    if (!plan) {
      throw new Error(`Crop plan not found for crop key ${cropKey}`);
    }
    return plan;
  }

  /**
   * Verify RBAC permission for modifying crop itineraries
   */
  public static assertCanEditItineraries(role: UserRole): void {
    const allowedRoles: UserRole[] = ['ORG_ADMIN', 'AGRONOMIST', 'PLATFORM_OWNER'];
    if (!allowedRoles.includes(role)) {
      throw new Error(`FORBIDDEN: User role "${role}" is not authorized to edit agronomic crop itineraries.`);
    }
  }
}
