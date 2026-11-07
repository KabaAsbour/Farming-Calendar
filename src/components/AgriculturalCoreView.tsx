import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  Calendar as CalendarIcon,
  Filter,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Layers,
  DollarSign,
  Users,
  MapPin,
  Package,
  Droplets,
  Bug,
  Scissors,
  Truck,
  Warehouse,
  FileText,
  ExternalLink,
  X,
  ArrowUpDown,
  Building2,
  RefreshCw,
  Tractor,
  Award,
  ChevronDown,
  Info
} from 'lucide-react';
import {
  ProductionCampaignMaster,
  CampaignOperationRecord,
  CampaignHarvestRecord,
  CropMaster,
  CropVarietyMaster,
  AgriculturalSeasonMaster,
  AgriculturalMethodMaster,
  SupplierMaster,
  AgriculturalInputMaster,
  AgriculturalEquipmentMaster,
  FieldTeamMaster,
  AreaUnit,
  convertAreaToHa,
  OperationTypeAgricultural,
  CampaignStatus
} from '../types/agricultural.ts';
import { Farm, FarmPlot, AuthSession } from '../types/organization.ts';

interface AgriculturalCoreViewProps {
  session: AuthSession;
  farms: Farm[];
  teamMembers: any[];
  onNavigateToCalendar?: (dateOrEventId?: string) => void;
  initialCampaignId?: string;
  initialOperationId?: string;
  onDataChanged?: () => void;
}

export function AgriculturalCoreView({
  session,
  farms,
  teamMembers,
  onNavigateToCalendar,
  initialCampaignId,
  initialOperationId,
  onDataChanged
}: AgriculturalCoreViewProps) {
  const { t } = useTranslation();

  // Active Main Subtab
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'operations' | 'harvests' | 'masterData'>('campaigns');

  // Master Data State
  const [crops, setCrops] = useState<CropMaster[]>([]);
  const [varieties, setVarieties] = useState<CropVarietyMaster[]>([]);
  const [seasons, setSeasons] = useState<AgriculturalSeasonMaster[]>([]);
  const [methods, setMethods] = useState<AgriculturalMethodMaster[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierMaster[]>([]);
  const [inputs, setInputs] = useState<AgriculturalInputMaster[]>([]);
  const [equipment, setEquipment] = useState<AgriculturalEquipmentMaster[]>([]);
  const [teams, setTeams] = useState<FieldTeamMaster[]>([]);

  // Production Campaigns State
  const [campaigns, setCampaigns] = useState<ProductionCampaignMaster[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<ProductionCampaignMaster | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<(ProductionCampaignMaster & { operations: CampaignOperationRecord[]; harvests: CampaignHarvestRecord[] }) | null>(null);

  // Operations State
  const [operations, setOperations] = useState<CampaignOperationRecord[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<CampaignOperationRecord | null>(null);

  // Harvests State
  const [harvests, setHarvests] = useState<CampaignHarvestRecord[]>([]);

  // Filters
  const [filterCropId, setFilterCropId] = useState<string>('ALL');
  const [filterFarmId, setFilterFarmId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterOpType, setFilterOpType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showNewOperationModal, setShowNewOperationModal] = useState(false);
  const [showNewHarvestModal, setShowNewHarvestModal] = useState(false);
  const [showNewCropModal, setShowNewCropModal] = useState(false);
  const [showNewVarietyModal, setShowNewVarietyModal] = useState(false);

  // Forms State: New Campaign
  const [campName, setCampName] = useState('');
  const [campCode, setCampCode] = useState('');
  const [campFarmId, setCampFarmId] = useState('');
  const [campPlotId, setCampPlotId] = useState('');
  const [campCropId, setCampCropId] = useState('');
  const [campVarietyId, setCampVarietyId] = useState('');
  const [campPlannedArea, setCampPlannedArea] = useState('2.5');
  const [campAreaUnit, setCampAreaUnit] = useState<AreaUnit>('HA');
  const [campPlantStart, setCampPlantStart] = useState('2026-10-15');
  const [campPlantEnd, setCampPlantEnd] = useState('2026-10-30');
  const [campHarvestStart, setCampHarvestStart] = useState('2026-12-15');
  const [campHarvestEnd, setCampHarvestEnd] = useState('2027-01-31');
  const [campTargetQty, setCampTargetQty] = useState('15000');
  const [campTargetUnit, setCampTargetUnit] = useState<'KG' | 'TON' | 'BAG' | 'CRATE'>('KG');
  const [campManagerId, setCampManagerId] = useState('');
  const [campTeamId, setCampTeamId] = useState('');
  const [campBudgetAllocated, setCampBudgetAllocated] = useState('25000000');
  const [campNotes, setCampNotes] = useState('');

  // Forms State: New Operation
  const [opCampaignId, setOpCampaignId] = useState('');
  const [opType, setOpType] = useState<OperationTypeAgricultural>('LAND_PREPARATION');
  const [opTitle, setOpTitle] = useState('');
  const [opDescription, setOpDescription] = useState('');
  const [opPlannedDate, setOpPlannedDate] = useState('2026-10-15');
  const [opStatus, setOpStatus] = useState<'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('PLANNED');
  const [opWorkers, setOpWorkers] = useState('4');
  const [opHours, setOpHours] = useState('16');
  const [opCost, setOpCost] = useState('750000');
  const [opResponsibleId, setOpResponsibleId] = useState('');
  const [opInputId, setOpInputId] = useState('');
  const [opInputQty, setOpInputQty] = useState('5');
  const [opEquipmentId, setOpEquipmentId] = useState('');
  const [opPestName, setOpPestName] = useState('');
  const [opIncidencePct, setOpIncidencePct] = useState('0');
  const [opSeverity, setOpSeverity] = useState<'LOW' | 'MODERATE' | 'SEVERE'>('LOW');
  const [opObservationNotes, setOpObservationNotes] = useState('');

  // Forms State: New Harvest
  const [harvCampaignId, setHarvCampaignId] = useState('');
  const [harvDate, setHarvDate] = useState(new Date().toISOString().substring(0, 10));
  const [harvBatch, setHarvBatch] = useState('');
  const [harvQty, setHarvQty] = useState('1200');
  const [harvLoss, setHarvLoss] = useState('50');
  const [harvGrade, setHarvGrade] = useState<'GRADE_A' | 'GRADE_B' | 'COMMERCIAL' | 'REJECTED'>('GRADE_A');
  const [harvLocation, setHarvLocation] = useState('Hangar climatisé Friguiagbé');
  const [harvMoisture, setHarvMoisture] = useState('76.5');
  const [harvBrix, setHarvBrix] = useState('9.4');
  const [harvWorkers, setHarvWorkers] = useState('8');
  const [harvDestination, setHarvDestination] = useState<'EXPORT' | 'LOCAL_MARKET' | 'PROCESSING' | 'STORAGE'>('EXPORT');
  const [harvNotes, setHarvNotes] = useState('');

  // Forms State: New Crop
  const [newCropName, setNewCropName] = useState('');
  const [newCropSciName, setNewCropSciName] = useState('');
  const [newCropCategory, setNewCropCategory] = useState<any>('SOLANACEOUS_VEGETABLE');
  const [newCropCycleDays, setNewCropCycleDays] = useState('110');
  const [newCropSpacing, setNewCropSpacing] = useState('50x50 cm');
  const [newCropWaterMm, setNewCropWaterMm] = useState('550');
  const [newCropDesc, setNewCropDesc] = useState('');

  // Forms State: New Variety
  const [newVarCropId, setNewVarCropId] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarCode, setNewVarCode] = useState('');
  const [newVarMinDays, setNewVarMinDays] = useState('90');
  const [newVarMaxDays, setNewVarMaxDays] = useState('120');
  const [newVarYield, setNewVarYield] = useState('12.5');
  const [newVarResistances, setNewVarResistances] = useState('Anthracnose, CMD');
  const [newVarChars, setNewVarChars] = useState('');

  const canWrite = ['PLATFORM_OWNER', 'ORG_ADMIN', 'MANAGER', 'AGRONOMIST', 'OPERATIONS_STAFF'].includes(session.user.role);

  // Load all master data and campaigns on mount
  useEffect(() => {
    loadAllAgriculturalData();
  }, [session.organization.id]);

  // Handle external navigation (from calendar)
  useEffect(() => {
    if (initialCampaignId) {
      handleOpenCampaign(initialCampaignId);
    }
    if (initialOperationId) {
      setActiveSubTab('operations');
    }
  }, [initialCampaignId, initialOperationId]);

  const loadAllAgriculturalData = async () => {
    setLoading(true);
    try {
      const orgId = session.organization.id;
      const headers = { 
        'Accept': 'application/json',
        Authorization: `Bearer ${session.token}` 
      };

      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          const ct = res.headers.get('content-type') || '';
          if (!res.ok || !ct.includes('application/json')) {
            return { success: false, data: [] };
          }
          return await res.json();
        } catch {
          return { success: false, data: [] };
        }
      };

      const [
        cropsJson,
        varsJson,
        seasonsJson,
        methodsJson,
        suppliersJson,
        inputsJson,
        equipJson,
        teamsJson,
        campaignsJson,
        opsJson,
        harvestsJson
      ] = await Promise.all([
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/crops`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/varieties`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/seasons`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/methods`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/suppliers`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/inputs`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/equipment`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/teams`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/campaigns`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/operations`),
        safeFetch(`/api/v1/organizations/${orgId}/agricultural/harvests`)
      ]);

      if (cropsJson?.success && Array.isArray(cropsJson.data)) setCrops(cropsJson.data);
      if (varsJson?.success && Array.isArray(varsJson.data)) setVarieties(varsJson.data);
      if (seasonsJson?.success && Array.isArray(seasonsJson.data)) setSeasons(seasonsJson.data);
      if (methodsJson?.success && Array.isArray(methodsJson.data)) setMethods(methodsJson.data);
      if (suppliersJson?.success && Array.isArray(suppliersJson.data)) setSuppliers(suppliersJson.data);
      if (inputsJson?.success && Array.isArray(inputsJson.data)) setInputs(inputsJson.data);
      if (equipJson?.success && Array.isArray(equipJson.data)) setEquipment(equipJson.data);
      if (teamsJson?.success && Array.isArray(teamsJson.data)) setTeams(teamsJson.data);
      if (campaignsJson?.success && Array.isArray(campaignsJson.data)) setCampaigns(campaignsJson.data);
      if (opsJson?.success && Array.isArray(opsJson.data)) setOperations(opsJson.data);
      if (harvestsJson?.success && Array.isArray(harvestsJson.data)) setHarvests(harvestsJson.data);

      // Default values for form selectors
      if (cropsJson?.data?.length > 0 && !campCropId) {
        setCampCropId(cropsJson.data[0].id);
      }
      if (farms.length > 0 && !campFarmId) {
        setCampFarmId(farms[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load agricultural core data', err);
      const msg = (err?.message && !err.message.includes('<!doctype') && !err.message.includes('Unexpected token'))
        ? err.message
        : 'Erreur de chargement des données agricoles';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/v1/organizations/${session.organization.id}/agricultural/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      const json = await res.json();
      if (json.success) {
        setSelectedCampaign(json.data);
        setCampaignDetails(json.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Submit New Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const body = {
        name: campName,
        code: campCode || undefined,
        farmId: campFarmId,
        plotId: campPlotId || undefined,
        cropId: campCropId,
        cropVarietyId: campVarietyId,
        plannedArea: parseFloat(campPlannedArea) || 1,
        areaUnit: campAreaUnit,
        plantingWindowStart: campPlantStart,
        plantingWindowEnd: campPlantEnd,
        expectedHarvestStart: campHarvestStart,
        expectedHarvestEnd: campHarvestEnd,
        productionTargetQuantity: parseFloat(campTargetQty) || 1000,
        productionTargetUnit: campTargetUnit,
        managerUserId: campManagerId || undefined,
        fieldTeamId: campTeamId || undefined,
        budgetAllocated: parseFloat(campBudgetAllocated) || 0,
        budgetCurrency: 'GNF',
        notes: campNotes || undefined
      };

      const res = await fetch(`/api/v1/organizations/${session.organization.id}/agricultural/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create campaign');
      }

      setActionMessage({ type: 'success', text: `Campagne '${json.data.name}' créée avec succès !` });
      setShowNewCampaignModal(false);
      setCampName('');
      setCampCode('');
      loadAllAgriculturalData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Submit New Operation
  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const targetCampId = opCampaignId || selectedCampaign?.id || campaigns[0]?.id;
      if (!targetCampId) {
        throw new Error('Please select a production campaign');
      }

      const body = {
        campaignId: targetCampId,
        operationType: opType,
        title: opTitle,
        description: opDescription || undefined,
        plannedDate: opPlannedDate,
        status: opStatus,
        laborWorkersCount: parseInt(opWorkers, 10) || undefined,
        laborHours: parseFloat(opHours) || undefined,
        costAmount: parseFloat(opCost) || 0,
        responsibleUserId: opResponsibleId || undefined,
        inputId: opInputId || undefined,
        inputQuantityUsed: parseFloat(opInputQty) || undefined,
        equipmentId: opEquipmentId || undefined,
        pestOrDiseaseName: opPestName || undefined,
        incidenceRatePct: parseFloat(opIncidencePct) || undefined,
        severityLevel: opSeverity,
        observationNotes: opObservationNotes || undefined,
        autoSyncCalendar: true
      };

      const res = await fetch(`/api/v1/organizations/${session.organization.id}/agricultural/operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create operation');
      }

      setActionMessage({ type: 'success', text: `Opération '${json.data.title}' enregistrée et synchronisée au calendrier !` });
      setShowNewOperationModal(false);
      setOpTitle('');
      setOpDescription('');
      loadAllAgriculturalData();
      if (selectedCampaign) {
        handleOpenCampaign(selectedCampaign.id);
      }
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Submit Partial Harvest Record
  const handleRecordHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const targetCampId = harvCampaignId || selectedCampaign?.id || campaigns[0]?.id;
      if (!targetCampId) {
        throw new Error('Please select a production campaign');
      }

      const body = {
        campaignId: targetCampId,
        harvestBatchNumber: harvBatch || undefined,
        harvestDate: harvDate,
        quantityHarvested: parseFloat(harvQty) || 0,
        lossQuantity: parseFloat(harvLoss) || 0,
        qualityGrade: harvGrade,
        storageLocation: harvLocation || undefined,
        moisturePct: parseFloat(harvMoisture) || undefined,
        brixLevel: parseFloat(harvBrix) || undefined,
        workersCount: parseInt(harvWorkers, 10) || 4,
        destination: harvDestination,
        notes: harvNotes || undefined
      };

      const res = await fetch(`/api/v1/organizations/${session.organization.id}/agricultural/harvests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to record harvest');
      }

      setActionMessage({ type: 'success', text: `Récolte partielle enregistrée (${json.data.quantityHarvested} kg) ! Historique préservé.` });
      setShowNewHarvestModal(false);
      setHarvBatch('');
      loadAllAgriculturalData();
      if (selectedCampaign) {
        handleOpenCampaign(selectedCampaign.id);
      }
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Submit New Crop
  const handleCreateCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/organizations/${session.organization.id}/agricultural/crops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          name: newCropName,
          scientificName: newCropSciName,
          category: newCropCategory,
          growthCycleDays: parseInt(newCropCycleDays, 10) || 90,
          defaultSpacingCm: newCropSpacing,
          waterRequirementMm: parseInt(newCropWaterMm, 10) || 500,
          description: newCropDesc
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Error creating crop');

      setActionMessage({ type: 'success', text: `Culture '${json.data.name}' configurée avec succès !` });
      setShowNewCropModal(false);
      setNewCropName('');
      loadAllAgriculturalData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Submit New Variety
  const handleCreateVariety = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/organizations/${session.organization.id}/agricultural/varieties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          cropId: newVarCropId || crops[0]?.id,
          name: newVarName,
          code: newVarCode,
          maturityDaysMin: parseInt(newVarMinDays, 10) || 90,
          maturityDaysMax: parseInt(newVarMaxDays, 10) || 120,
          expectedYieldPerHaTons: parseFloat(newVarYield) || 10,
          diseaseResistances: newVarResistances,
          characteristics: newVarChars
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Error creating variety');

      setActionMessage({ type: 'success', text: `Variété '${json.data.name}' ajoutée !` });
      setShowNewVarietyModal(false);
      setNewVarName('');
      loadAllAgriculturalData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Varieties filtered for current campaign crop selection
  const filteredVarietiesForCrop = varieties.filter(v => v.cropId === campCropId);

  // Plots filtered for current campaign farm selection
  const selectedFarmObj = farms.find(f => f.id === campFarmId);

  // Filtered campaigns
  const displayCampaigns = campaigns.filter(c => {
    if (filterCropId !== 'ALL' && c.cropId !== filterCropId) return false;
    if (filterFarmId !== 'ALL' && c.farmId !== filterFarmId) return false;
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered operations
  const displayOperations = operations.filter(op => {
    if (filterOpType !== 'ALL' && op.operationType !== filterOpType) return false;
    if (filterStatus !== 'ALL' && op.status !== filterStatus) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return op.title.toLowerCase().includes(q) || (op.description && op.description.toLowerCase().includes(q));
    }
    return true;
  });

  // Aggregated Yield metrics
  const totalHarvestedVolumeKg = harvests.reduce((sum, h) => sum + Number(h.quantityHarvested || 0), 0);
  const totalLossVolumeKg = harvests.reduce((sum, h) => sum + Number(h.lossQuantity || 0), 0);
  const gradeAVolumeKg = harvests.filter(h => h.qualityGrade === 'GRADE_A').reduce((sum, h) => sum + Number(h.quantityHarvested || 0), 0);
  const gradeAPct = totalHarvestedVolumeKg > 0 ? Math.round((gradeAVolumeKg / totalHarvestedVolumeKg) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PHASE 3 : AGRICULTURAL CORE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {session.organization.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <Sprout className="h-6 w-6 text-emerald-400" />
              {t('agricultural.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              {t('agricultural.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadAllAgriculturalData()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 border border-slate-700"
              title="Actualiser"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {canWrite && (
              <>
                <button
                  onClick={() => setShowNewHarvestModal(true)}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Award className="h-3.5 w-3.5" />
                  {t('agricultural.harvests.recordNew')}
                </button>
                <button
                  onClick={() => setShowNewOperationModal(true)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('agricultural.operations.newOperation')}
                </button>
                <button
                  onClick={() => setShowNewCampaignModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  {t('agricultural.campaigns.newCampaign')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Global Key Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Campagnes Actives</span>
            <span className="text-lg font-bold text-emerald-400">{campaigns.filter(c => c.status === 'IN_PROGRESS' || c.status === 'HARVESTING').length}</span>
            <span className="text-[10px] text-slate-500 block">sur {campaigns.length} totales</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Rendement Cumulé</span>
            <span className="text-lg font-bold text-white">{totalHarvestedVolumeKg.toLocaleString()} kg</span>
            <span className="text-[10px] text-amber-400 block">dont {gradeAPct}% Grade A Export</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Opérations Loguées</span>
            <span className="text-lg font-bold text-purple-400">{operations.length}</span>
            <span className="text-[10px] text-slate-500 block">Synchros au calendrier</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Passes de Récolte</span>
            <span className="text-lg font-bold text-amber-400">{harvests.length}</span>
            <span className="text-[10px] text-emerald-500 block">Historique préservé</span>
          </div>
        </div>

        {/* Subtab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-4 border-t border-slate-800/60 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('campaigns')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeSubTab === 'campaigns'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sprout className="h-3.5 w-3.5" />
            1. {t('agricultural.tabs.campaigns')} ({campaigns.length})
          </button>

          <button
            onClick={() => setActiveSubTab('operations')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeSubTab === 'operations'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            2. {t('agricultural.tabs.operations')} ({operations.length})
          </button>

          <button
            onClick={() => setActiveSubTab('harvests')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeSubTab === 'harvests'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            3. {t('agricultural.tabs.harvests')} ({harvests.length})
          </button>

          <button
            onClick={() => setActiveSubTab('masterData')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeSubTab === 'masterData'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            4. {t('agricultural.tabs.masterData')}
          </button>
        </div>
      </div>

      {/* Action Message Alert */}
      {actionMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
          actionMessage.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
            : 'bg-rose-950/70 border-rose-800 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs hover:underline opacity-80">
            Fermer
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 1: PRODUCTION CAMPAIGNS */}
      {/* ========================================================================= */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, code de campagne..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Crop Filter */}
              <select
                value={filterCropId}
                onChange={e => setFilterCropId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="ALL">Toutes les cultures</option>
                {crops.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Farm Filter */}
              <select
                value={filterFarmId}
                onChange={e => setFilterFarmId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="ALL">Toutes les fermes</option>
                {farms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PLANNING">{t('agricultural.campaignStatuses.PLANNING')}</option>
                <option value="IN_PROGRESS">{t('agricultural.campaignStatuses.IN_PROGRESS')}</option>
                <option value="HARVESTING">{t('agricultural.campaignStatuses.HARVESTING')}</option>
                <option value="COMPLETED">{t('agricultural.campaignStatuses.COMPLETED')}</option>
                <option value="CANCELLED">{t('agricultural.campaignStatuses.CANCELLED')}</option>
              </select>
            </div>

            <div className="text-xs font-mono text-slate-400">
              {displayCampaigns.length} campagne(s) affichée(s)
            </div>
          </div>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCampaigns.map(camp => {
              const statusColors: Record<string, string> = {
                PLANNING: 'bg-blue-950 text-blue-300 border-blue-800',
                IN_PROGRESS: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                HARVESTING: 'bg-amber-950 text-amber-300 border-amber-800',
                COMPLETED: 'bg-slate-800 text-slate-300 border-slate-700',
                CANCELLED: 'bg-rose-950 text-rose-300 border-rose-800',
                ON_HOLD: 'bg-purple-950 text-purple-300 border-purple-800'
              };

              return (
                <div
                  key={camp.id}
                  onClick={() => handleOpenCampaign(camp.id)}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all cursor-pointer shadow-lg space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 block mb-0.5 font-semibold">
                        {camp.code}
                      </span>
                      <h3 className="font-semibold text-slate-100 text-sm group-hover:text-emerald-300 transition-colors">
                        {camp.name}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${statusColors[camp.status] || 'bg-slate-800 text-slate-300'}`}>
                      {t(`agricultural.campaignStatuses.${camp.status}`) || camp.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 font-mono">
                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                      <span className="text-[9px] uppercase text-slate-500 block">Culture & Variété</span>
                      <span className="text-slate-200 font-semibold">{camp.cropName || 'Culture'}</span>
                      <span className="text-[10px] text-emerald-400 block truncate">{camp.cropVarietyName || 'N/A'}</span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                      <span className="text-[9px] uppercase text-slate-500 block">Superficie</span>
                      <span className="text-slate-200 font-semibold">{camp.plannedArea} {camp.areaUnit}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{camp.farmName}</span>
                    </div>
                  </div>

                  {/* Harvest Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[10px] text-slate-400">Récolte vs Objectif :</span>
                      <span className="text-emerald-300 font-semibold">
                        {camp.totalHarvestedQuantity?.toLocaleString() || 0} / {camp.productionTargetQuantity.toLocaleString()} {camp.productionTargetUnit} ({camp.harvestProgressPct || 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${camp.harvestProgressPct || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3 text-slate-400" />
                      {camp.plantingWindowStart.substring(5)} au {camp.expectedHarvestEnd.substring(5)}
                    </span>
                    <span className="text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                      Détails <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {displayCampaigns.length === 0 && (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Sprout className="h-10 w-10 text-slate-600 mx-auto" />
              <h4 className="font-semibold text-slate-300">Aucune campagne de production trouvée</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Créez une nouvelle campagne pour lier une variété maraîchère ou vivrière à une parcelle, définir l'objectif de rendement et planifier les opérations de terrain.
              </p>
              {canWrite && (
                <button
                  onClick={() => setShowNewCampaignModal(true)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium inline-flex items-center gap-1.5 shadow"
                >
                  <Plus className="h-4 w-4" />
                  Créer la première campagne
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: OPERATIONAL LOG & TASKS */}
      {/* ========================================================================= */}
      {activeSubTab === 'operations' && (
        <div className="space-y-4">
          {/* Operations Filters */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher une opération culturale..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterOpType}
                onChange={e => setFilterOpType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="ALL">Tous les types d'opérations</option>
                <option value="LAND_PREPARATION">{t('agricultural.operationsTypes.LAND_PREPARATION')}</option>
                <option value="PLANTING">{t('agricultural.operationsTypes.PLANTING')}</option>
                <option value="IRRIGATION">{t('agricultural.operationsTypes.IRRIGATION')}</option>
                <option value="FERTILIZATION">{t('agricultural.operationsTypes.FERTILIZATION')}</option>
                <option value="PEST_DISEASE_MONITORING">{t('agricultural.operationsTypes.PEST_DISEASE_MONITORING')}</option>
                <option value="WEEDING">{t('agricultural.operationsTypes.WEEDING')}</option>
                <option value="MAINTENANCE">{t('agricultural.operationsTypes.MAINTENANCE')}</option>
                <option value="HARVEST">{t('agricultural.operationsTypes.HARVEST')}</option>
                <option value="POST_HARVEST">{t('agricultural.operationsTypes.POST_HARVEST')}</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PLANNED">Planifiée</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminée</option>
                <option value="CANCELLED">Annulée</option>
              </select>
            </div>

            {canWrite && (
              <button
                onClick={() => setShowNewOperationModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow"
              >
                <Plus className="h-3.5 w-3.5" />
                Consigner une Opération
              </button>
            )}
          </div>

          {/* Operations List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Type & Titre</th>
                    <th className="p-3">Campagne</th>
                    <th className="p-3">Date Prévue / Réelle</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Main d'œuvre & Intrants</th>
                    <th className="p-3">Observations</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {displayOperations.map(op => {
                    const typeIcons: Record<string, any> = {
                      LAND_PREPARATION: Tractor,
                      PLANTING: Sprout,
                      IRRIGATION: Droplets,
                      FERTILIZATION: Package,
                      PEST_DISEASE_MONITORING: Bug,
                      WEEDING: Scissors,
                      MAINTENANCE: Scissors,
                      HARVEST: Award,
                      POST_HARVEST: Warehouse
                    };
                    const IconComponent = typeIcons[op.operationType] || Sprout;

                    return (
                      <tr key={op.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-slate-200 block">{op.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {t(`agricultural.operationsTypes.${op.operationType}`) || op.operationType}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {op.campaignName || 'Campagne'}
                        </td>
                        <td className="p-3 font-mono">
                          <span className="text-slate-300 block">{op.plannedDate}</span>
                          {op.actualDate && (
                            <span className="text-[10px] text-emerald-400 block">Réel : {op.actualDate}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            op.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                            op.status === 'IN_PROGRESS' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            op.status === 'CANCELLED' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                            'bg-blue-950 text-blue-300 border-blue-800'
                          }`}>
                            {op.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-300">
                          {op.laborWorkersCount && (
                            <div>{op.laborWorkersCount} ouvriers ({op.laborHours || 0}h)</div>
                          )}
                          {op.inputName && (
                            <div className="text-emerald-400 text-[10px] truncate">{op.inputName} ({op.inputQuantityUsed || 0})</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate">
                          {op.pestOrDiseaseName ? (
                            <span className="text-amber-300">
                              Ravageur: {op.pestOrDiseaseName} ({op.incidenceRatePct || 0}%)
                            </span>
                          ) : (
                            op.observationNotes || op.description || '—'
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onNavigateToCalendar && (
                              <button
                                onClick={() => onNavigateToCalendar(op.plannedDate)}
                                className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[10px] font-mono flex items-center gap-1"
                                title="Voir au calendrier"
                              >
                                <CalendarIcon className="h-3 w-3" />
                                Calendrier
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {displayOperations.length === 0 && (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                Aucune opération culturale ne correspond aux critères de filtre.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: PARTIAL HARVESTS & YIELDS */}
      {/* ========================================================================= */}
      {activeSubTab === 'harvests' && (
        <div className="space-y-4">
          {/* Historical Preservation Notice Banner */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl flex items-start gap-3">
            <Info className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-emerald-200 block">
                Traçabilité & Préservation Historique des Récoltes Partielles
              </span>
              <p>
                Le système enregistre chaque passe de récolte comme un lot historique immuable. Les rendements passés ne sont jamais écrasés lors des cueillettes successives, garantissant une parfaite auditabilité pour l'exportation et les bilans de campagne.
              </p>
            </div>
          </div>

          {/* Harvests Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  Journal Chronologique des Passes de Récolte ({harvests.length} lots)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Volume total cumulé : {totalHarvestedVolumeKg.toLocaleString()} kg
                </span>
              </div>

              {canWrite && (
                <button
                  onClick={() => setShowNewHarvestModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1 shadow"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Enregistrer une Passe
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">N° Lot / Batch</th>
                    <th className="p-3">Date Cueillette</th>
                    <th className="p-3">Campagne</th>
                    <th className="p-3">Quantité Récoltée</th>
                    <th className="p-3">Écart / Rebut</th>
                    <th className="p-3">Qualité / Grade</th>
                    <th className="p-3">Sucre / Humidité</th>
                    <th className="p-3">Stockage & Destination</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {harvests.map(h => (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-amber-400">
                        {h.harvestBatchNumber}
                      </td>
                      <td className="p-3 text-slate-300">
                        {h.harvestDate}
                      </td>
                      <td className="p-3 text-slate-200">
                        {h.campaignName || 'Campagne'}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {h.quantityHarvested.toLocaleString()} {h.quantityUnit}
                      </td>
                      <td className="p-3 text-rose-400">
                        {h.lossQuantity ? `${h.lossQuantity} ${h.quantityUnit}` : '0'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${
                          h.qualityGrade === 'GRADE_A' ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-semibold' :
                          h.qualityGrade === 'GRADE_B' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                          'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {h.qualityGrade}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-300">
                        {h.brixLevel && <span className="text-amber-300 block">{h.brixLevel}° Brix</span>}
                        {h.moisturePct && <span className="text-slate-400 block">{h.moisturePct}% H2O</span>}
                        {!h.brixLevel && !h.moisturePct && '—'}
                      </td>
                      <td className="p-3 text-[11px]">
                        <span className="text-slate-200 block truncate">{h.storageLocation || 'Magasin'}</span>
                        <span className="text-emerald-400 text-[10px] block">{h.destination}</span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate font-sans">
                        {h.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {harvests.length === 0 && (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                Aucune passe de récolte enregistrée pour le moment.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: MASTER DATA & REFERENCES HUB */}
      {/* ========================================================================= */}
      {activeSubTab === 'masterData' && (
        <div className="space-y-6">
          {/* 1. Crops & Varieties Catalog */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-emerald-400" />
                  Référentiel des Cultures & Variétés Agronomiques
                </h3>
                <p className="text-xs text-slate-400">
                  Démonstration active : Manioc (Bonoua, Bocou 1), Piment (Bird's Eye, S17), Pastèque (Kaolack, Crimson Sweet).
                </p>
              </div>

              {canWrite && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewVarietyModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une Variété
                  </button>
                  <button
                    onClick={() => setShowNewCropModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une Culture
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {crops.map(crop => {
                const cropVars = varieties.filter(v => v.cropId === crop.id);
                return (
                  <div key={crop.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{crop.name}</h4>
                        <span className="text-[10px] text-slate-500 italic font-mono">{crop.scientificName || 'Espèce'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {crop.category}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 font-mono text-[11px]">
                      <div>Cycle : <span className="text-slate-200">{crop.growthCycleDays} jours</span></div>
                      <div>Écartement : <span className="text-slate-200">{crop.defaultSpacingCm || 'N/A'}</span></div>
                      <div>Besoin en eau : <span className="text-slate-200">{crop.waterRequirementMm || 600} mm</span></div>
                    </div>

                    {/* Varieties List */}
                    <div className="border-t border-slate-900 pt-2 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">
                        Variétés configurées ({cropVars.length}) :
                      </span>
                      {cropVars.map(v => (
                        <div key={v.id} className="bg-slate-900 p-2 rounded border border-slate-800 text-xs space-y-0.5">
                          <div className="flex items-center justify-between font-semibold text-slate-200">
                            <span>{v.name}</span>
                            <span className="text-[10px] font-mono text-emerald-400">{v.code}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Maturité : {v.maturityDaysMin}-{v.maturityDaysMax}j • Rendement : {v.expectedYieldPerHaTons} t/ha
                          </div>
                          {v.diseaseResistances && (
                            <div className="text-[9px] text-purple-300 truncate font-mono">
                              Résistances : {Array.isArray(v.diseaseResistances) ? v.diseaseResistances.join(', ') : v.diseaseResistances}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Agricultural Seasons & Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seasons */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3 shadow-lg">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-400" />
                Saisons Agricoles & Campagnes Réglementaires
              </h3>
              <div className="space-y-2">
                {seasons.map(s => (
                  <div key={s.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-semibold text-slate-200 block">{s.name}</span>
                      <span className="text-[10px] text-slate-400">{s.startDate} au {s.endDate}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Methods */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3 shadow-lg">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Scissors className="h-4 w-4 text-amber-400" />
                Méthodes Culturales (Semis & Récoltes)
              </h3>
              <div className="space-y-2">
                {methods.map(m => (
                  <div key={m.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{m.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {m.methodType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Inputs, Equipment, Suppliers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Inputs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3 shadow-lg">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-400" />
                Catalogue Intrants ({inputs.length})
              </h3>
              <div className="space-y-2">
                {inputs.map(i => (
                  <div key={i.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-0.5">
                    <div className="font-semibold text-slate-200">{i.name}</div>
                    <div className="text-[10px] text-slate-400">Stock: {i.stockQuantity} {i.unit} • {i.costPerUnit.toLocaleString()} GNF</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3 shadow-lg">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Tractor className="h-4 w-4 text-amber-400" />
                Parc Matériel & Engins ({equipment.length})
              </h3>
              <div className="space-y-2">
                {equipment.map(eq => (
                  <div key={eq.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-0.5">
                    <div className="font-semibold text-slate-200">{eq.name}</div>
                    <div className="text-[10px] text-emerald-400">Statut : {eq.status} ({eq.serialNumber})</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suppliers */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3 shadow-lg">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Truck className="h-4 w-4 text-purple-400" />
                Fournisseurs Agréés ({suppliers.length})
              </h3>
              <div className="space-y-2">
                {suppliers.map(sup => (
                  <div key={sup.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-0.5">
                    <div className="font-semibold text-slate-200">{sup.name}</div>
                    <div className="text-[10px] text-slate-400">{sup.locality} • Tél: {sup.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CAMPAIGN DETAILS DRAWER */}
      {/* ========================================================================= */}
      {campaignDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                  {campaignDetails.code} • {campaignDetails.seasonName || 'Saison'}
                </span>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-emerald-400" />
                  {campaignDetails.name}
                </h2>
              </div>
              <button
                onClick={() => setCampaignDetails(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Culture & Variété</span>
                <span className="font-semibold text-white">{campaignDetails.cropName}</span>
                <span className="text-[11px] text-emerald-400 block">{campaignDetails.cropVarietyName}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Superficie Allouée</span>
                <span className="font-semibold text-white">{campaignDetails.plannedArea} {campaignDetails.areaUnit}</span>
                <span className="text-[11px] text-slate-400 block">{campaignDetails.farmName}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Rendement Réalisé</span>
                <span className="font-semibold text-emerald-400">{campaignDetails.totalHarvestedQuantity?.toLocaleString() || 0} kg</span>
                <span className="text-[10px] text-slate-400 block">sur {campaignDetails.productionTargetQuantity.toLocaleString()} {campaignDetails.productionTargetUnit}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Budget Exécuté</span>
                <span className="font-semibold text-amber-300">{(campaignDetails.budgetActualSpend || 0).toLocaleString()} GNF</span>
                <span className="text-[10px] text-slate-400 block">Alloué : {(campaignDetails.budgetAllocated || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Operations of this campaign */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white text-xs uppercase font-mono">
                  Opérations de Terrain ({campaignDetails.operations?.length || 0})
                </h4>
                {canWrite && (
                  <button
                    onClick={() => {
                      setOpCampaignId(campaignDetails.id);
                      setShowNewOperationModal(true);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-mono flex items-center gap-1 border border-slate-700"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter Opération
                  </button>
                )}
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                {(campaignDetails.operations || []).map(op => (
                  <div key={op.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200 block">{op.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {op.operationType} • {op.plannedDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        op.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {op.status}
                      </span>
                      {onNavigateToCalendar && (
                        <button
                          onClick={() => {
                            setCampaignDetails(null);
                            onNavigateToCalendar(op.plannedDate);
                          }}
                          className="p-1.5 rounded hover:bg-slate-800 text-emerald-400"
                          title="Voir au calendrier"
                        >
                          <CalendarIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Partial Harvests of this campaign */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white text-xs uppercase font-mono">
                  Passes de Récolte Enregistrées ({campaignDetails.harvests?.length || 0})
                </h4>
                {canWrite && (
                  <button
                    onClick={() => {
                      setHarvCampaignId(campaignDetails.id);
                      setShowNewHarvestModal(true);
                    }}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Enregistrer Passe
                  </button>
                )}
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
                {(campaignDetails.harvests || []).map(h => (
                  <div key={h.id} className="p-3 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-bold text-amber-400 block">{h.harvestBatchNumber}</span>
                      <span className="text-[10px] text-slate-400">{h.harvestDate} • {h.storageLocation}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white block">{h.quantityHarvested.toLocaleString()} {h.quantityUnit}</span>
                      <span className="text-[10px] text-emerald-400">{h.qualityGrade}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setCampaignDetails(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW CAMPAIGN */}
      {/* ========================================================================= */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sprout className="h-5 w-5 text-emerald-400" />
                {t('agricultural.campaigns.newCampaign')}
              </h3>
              <button onClick={() => setShowNewCampaignModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nom de la Campagne *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex. Campagne Piment S17 — Friguiagbé 2026"
                    value={campName}
                    onChange={e => setCampName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Code Campagne (optionnel)</label>
                  <input
                    type="text"
                    placeholder="ex. CAMP-PIM-2026-02"
                    value={campCode}
                    onChange={e => setCampCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Exploitation / Ferme *</label>
                  <select
                    required
                    value={campFarmId}
                    onChange={e => {
                      setCampFarmId(e.target.value);
                      setCampPlotId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Sélectionner une ferme</option>
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.usableAreaHectares || f.totalAreaHectares} ha)</option>
                    ))}
                  </select>
                </div>

                {/* Plot Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Parcelle / Bloc (Optionnel)</label>
                  <select
                    value={campPlotId}
                    onChange={e => setCampPlotId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Affectation sur ferme globale</option>
                    {/* Plot options for farm */}
                  </select>
                </div>

                {/* Crop Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Culture *</label>
                  <select
                    required
                    value={campCropId}
                    onChange={e => {
                      setCampCropId(e.target.value);
                      const matching = varieties.filter(v => v.cropId === e.target.value);
                      if (matching.length > 0) setCampVarietyId(matching[0].id);
                      else setCampVarietyId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Sélectionner une culture</option>
                    {crops.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Variety Selector (Dynamically filtered) */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Variété Compatible *</label>
                  <select
                    required
                    value={campVarietyId}
                    onChange={e => setCampVarietyId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Sélectionner une variété</option>
                    {filteredVarietiesForCrop.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>

                {/* Planned Area & Unit */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Superficie Prévue *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      required
                      min="0.01"
                      value={campPlannedArea}
                      onChange={e => setCampPlannedArea(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <select
                      value={campAreaUnit}
                      onChange={e => setCampAreaUnit(e.target.value as AreaUnit)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="HA">HA</option>
                      <option value="ACRE">ACRE</option>
                      <option value="M2">M²</option>
                      <option value="TAREA">TAREA</option>
                    </select>
                  </div>
                </div>

                {/* Target Quantity & Unit */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Objectif de Production *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min="1"
                      value={campTargetQty}
                      onChange={e => setCampTargetQty(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <select
                      value={campTargetUnit}
                      onChange={e => setCampTargetUnit(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-mono"
                    >
                      <option value="KG">KG</option>
                      <option value="TON">TON</option>
                      <option value="BAG">SACS</option>
                      <option value="CRATE">CAGETTES</option>
                    </select>
                  </div>
                </div>

                {/* Planting Window */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fenêtre Semis (Début / Fin) *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={campPlantStart}
                      onChange={e => setCampPlantStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                    <input
                      type="date"
                      required
                      value={campPlantEnd}
                      onChange={e => setCampPlantEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Expected Harvest Window */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fenêtre Récolte (Début / Fin) *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={campHarvestStart}
                      onChange={e => setCampHarvestStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                    <input
                      type="date"
                      required
                      value={campHarvestEnd}
                      onChange={e => setCampHarvestEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Manager */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Responsable de Campagne</label>
                  <select
                    value={campManagerId}
                    onChange={e => setCampManagerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Sélectionner un responsable</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.userId}>{m.fullName} ({m.role})</option>
                    ))}
                  </select>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Budget Alloué (GNF)</label>
                  <input
                    type="number"
                    value={campBudgetAllocated}
                    onChange={e => setCampBudgetAllocated(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
                >
                  Créer la Campagne
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE OPERATION */}
      {/* ========================================================================= */}
      {showNewOperationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" />
                {t('agricultural.operations.newOperation')}
              </h3>
              <button onClick={() => setShowNewOperationModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOperation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Campagne Concernée *</label>
                  <select
                    required
                    value={opCampaignId || selectedCampaign?.id || ''}
                    onChange={e => setOpCampaignId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Sélectionner une campagne</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type d'Opération *</label>
                  <select
                    value={opType}
                    onChange={e => setOpType(e.target.value as OperationTypeAgricultural)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="LAND_PREPARATION">{t('agricultural.operationsTypes.LAND_PREPARATION')}</option>
                    <option value="PLANTING">{t('agricultural.operationsTypes.PLANTING')}</option>
                    <option value="IRRIGATION">{t('agricultural.operationsTypes.IRRIGATION')}</option>
                    <option value="FERTILIZATION">{t('agricultural.operationsTypes.FERTILIZATION')}</option>
                    <option value="PEST_DISEASE_MONITORING">{t('agricultural.operationsTypes.PEST_DISEASE_MONITORING')}</option>
                    <option value="WEEDING">{t('agricultural.operationsTypes.WEEDING')}</option>
                    <option value="MAINTENANCE">{t('agricultural.operationsTypes.MAINTENANCE')}</option>
                    <option value="HARVEST">{t('agricultural.operationsTypes.HARVEST')}</option>
                    <option value="POST_HARVEST">{t('agricultural.operationsTypes.POST_HARVEST')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Statut Initial</label>
                  <select
                    value={opStatus}
                    onChange={e => setOpStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="PLANNED">Planifiée</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="COMPLETED">Terminée</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Titre de l'Opération *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex. Épandage NPK 15-15-15 au stade floraison"
                    value={opTitle}
                    onChange={e => setOpTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date Prévue *</label>
                  <input
                    type="date"
                    required
                    value={opPlannedDate}
                    onChange={e => setOpPlannedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Ouvriers Mobilisés</label>
                  <input
                    type="number"
                    min="0"
                    value={opWorkers}
                    onChange={e => setOpWorkers(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Intrant Utilisé (optionnel)</label>
                  <select
                    value={opInputId}
                    onChange={e => setOpInputId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Aucun intrant</option>
                    {inputs.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Équipement Mobilisé</label>
                  <select
                    value={opEquipmentId}
                    onChange={e => setOpEquipmentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Aucun équipement</option>
                    {equipment.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                    ))}
                  </select>
                </div>

                {/* Pest & disease fields */}
                {opType === 'PEST_DISEASE_MONITORING' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Ravageur / Maladie identifié(e)</label>
                      <input
                        type="text"
                        placeholder="ex. Aleurodes, Thrips, Anthracnose"
                        value={opPestName}
                        onChange={e => setOpPestName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Taux d'Incidence (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={opIncidencePct}
                        onChange={e => setOpIncidencePct(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Observations & Consignes</label>
                  <textarea
                    rows={2}
                    value={opObservationNotes}
                    onChange={e => setOpObservationNotes(e.target.value)}
                    placeholder="Notes de terrain, consignes de dosage..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>Cette opération sera automatiquement synchronisée avec une entrée dans le Calendrier Standard.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewOperationModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
                >
                  Enregistrer l'Opération
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD PARTIAL HARVEST */}
      {/* ========================================================================= */}
      {showNewHarvestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                {t('agricultural.harvests.recordNew')}
              </h3>
              <button onClick={() => setShowNewHarvestModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordHarvest} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Campagne Concernée *</label>
                  <select
                    required
                    value={harvCampaignId || selectedCampaign?.id || ''}
                    onChange={e => setHarvCampaignId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Sélectionner une campagne</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Date de Récolte *</label>
                    <input
                      type="date"
                      required
                      value={harvDate}
                      onChange={e => setHarvDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">N° de Lot / Batch (optionnel)</label>
                    <input
                      type="text"
                      placeholder="Généré automatiquement si vide"
                      value={harvBatch}
                      onChange={e => setHarvBatch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Quantité Récoltée (kg) *</label>
                    <input
                      type="number"
                      step="1"
                      required
                      min="0"
                      value={harvQty}
                      onChange={e => setHarvQty(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Écarts / Rebuts (kg)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={harvLoss}
                      onChange={e => setHarvLoss(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Grade / Qualité</label>
                    <select
                      value={harvGrade}
                      onChange={e => setHarvGrade(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="GRADE_A">Grade A (Export premier choix)</option>
                      <option value="GRADE_B">Grade B (Marché demi-gros)</option>
                      <option value="COMMERCIAL">Commercial (Standard)</option>
                      <option value="REJECTED">Rebut / Non conforme</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Destination</label>
                    <select
                      value={harvDestination}
                      onChange={e => setHarvDestination(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="EXPORT">Export International</option>
                      <option value="LOCAL_MARKET">Marché Local Conakry/Kindia</option>
                      <option value="PROCESSING">Transformation Industrielle</option>
                      <option value="STORAGE">Stockage Hangar</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Lieu de Stockage</label>
                    <input
                      type="text"
                      value={harvLocation}
                      onChange={e => setHarvLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Taux de Sucre (°Brix)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={harvBrix}
                      onChange={e => setHarvBrix(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewHarvestModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow"
                >
                  Enregistrer la Passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW CROP */}
      {/* ========================================================================= */}
      {showNewCropModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sprout className="h-5 w-5 text-emerald-400" />
                {t('agricultural.masterData.newCrop')}
              </h3>
              <button onClick={() => setShowNewCropModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCrop} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nom de la Culture *</label>
                <input
                  type="text"
                  required
                  placeholder="ex. Gombo, Tomate, Aubergine..."
                  value={newCropName}
                  onChange={e => setNewCropName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nom Scientifique</label>
                <input
                  type="text"
                  placeholder="ex. Abelmoschus esculentus"
                  value={newCropSciName}
                  onChange={e => setNewCropSciName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white italic font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Catégorie</label>
                  <select
                    value={newCropCategory}
                    onChange={e => setNewCropCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  >
                    <option value="SOLANACEOUS_VEGETABLE">Maraîchère (Solanacée)</option>
                    <option value="ROOT_TUBER">Tubercule / Racine</option>
                    <option value="CUCURBIT">Cucurbitacée</option>
                    <option value="LEGUME">Légumineuse</option>
                    <option value="CEREAL">Céréale</option>
                    <option value="FRUIT_TREE">Arboriculture</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Durée Cycle (Jours)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={newCropCycleDays}
                    onChange={e => setNewCropCycleDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCropDesc}
                  onChange={e => setNewCropDesc(e.target.value)}
                  placeholder="Conditions climatiques optimales, exigences agronomiques..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCropModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
                >
                  Enregistrer Culture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW VARIETY */}
      {/* ========================================================================= */}
      {showNewVarietyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sprout className="h-5 w-5 text-emerald-400" />
                {t('agricultural.masterData.newVariety')}
              </h3>
              <button onClick={() => setShowNewVarietyModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVariety} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Culture Parente *</label>
                <select
                  required
                  value={newVarCropId || crops[0]?.id || ''}
                  onChange={e => setNewVarCropId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {crops.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nom de la Variété *</label>
                <input
                  type="text"
                  required
                  placeholder="ex. Piment Pili Pili, Habanero..."
                  value={newVarName}
                  onChange={e => setNewVarName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="VAR-PIM-02"
                    value={newVarCode}
                    onChange={e => setNewVarCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Rendement estimé (t/ha)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newVarYield}
                    onChange={e => setNewVarYield(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Maturité Min (Jours)</label>
                  <input
                    type="number"
                    value={newVarMinDays}
                    onChange={e => setNewVarMinDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Maturité Max (Jours)</label>
                  <input
                    type="number"
                    value={newVarMaxDays}
                    onChange={e => setNewVarMaxDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tolérances & Résistances</label>
                <input
                  type="text"
                  placeholder="Anthracnose, Flétrissement bactérien..."
                  value={newVarResistances}
                  onChange={e => setNewVarResistances(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewVarietyModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
                >
                  Enregistrer Variété
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
