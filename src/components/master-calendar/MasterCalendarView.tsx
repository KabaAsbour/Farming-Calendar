import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  Filter,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Truck,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Download,
  Info,
  Maximize2,
  CalendarCheck2,
  Plus
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge, StatusDot } from '../ui/Badge.tsx';
import { Select, Input } from '../ui/Input.tsx';
import { AuthSession, Farm } from '../../types/organization.ts';

interface MasterCalendarViewProps {
  session: AuthSession;
  farms: Farm[];
  onOpenCampaign?: (campaignId: string) => void;
  onOpenNormalCalendar?: () => void;
}

export function MasterCalendarView({
  session,
  farms,
  onOpenCampaign,
  onOpenNormalCalendar
}: MasterCalendarViewProps) {
  const { t } = useTranslation();

  // Active workspace mode
  const [viewMode, setViewMode] = useState<'timeline' | 'backward_planner' | 'stages'>('timeline');

  // Filters
  const [selectedCrop, setSelectedCrop] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [timeHorizon, setTimeHorizon] = useState<'season' | 'year' | 'quarter'>('season');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  // Backward Planning Form State
  const [targetDeliveryDate, setTargetDeliveryDate] = useState<string>('2026-11-20');
  const [targetProduct, setTargetProduct] = useState<'PEPPER_S17' | 'CASSAVA_BONOUA' | 'WATERMELON_KAOLACK'>('PEPPER_S17');
  const [targetQuantityTons, setTargetQuantityTons] = useState<number>(35);
  const [buyerDestination, setBuyerDestination] = useState<string>('Port Autonome de Conakry / Export UE');

  // Production Stages Definition (Agricultural -> Post-Harvest -> Processing -> Quality -> Packaging -> Dispatch -> Buyer Delivery)
  const productionStages = [
    { id: 'LAND_PREPARATION', name: '1. Préparation du Sol & Billonnage', standardDays: 14, icon: '🚜' },
    { id: 'PLANTING', name: '2. Pépinière & Repiquage / Semis', standardDays: 10, icon: '🌱' },
    { id: 'MAINTENANCE', name: '3. Irrigation, Fertilisation & Suivi', standardDays: 60, icon: '💧' },
    { id: 'HARVEST', name: '4. Récoltes Sélectives & Cueillette', standardDays: 30, icon: '🧺' },
    { id: 'POST_HARVEST', name: '5. Tri & Conditionnement Primaire', standardDays: 5, icon: '📦' },
    { id: 'PROCESSING', name: '6. Séchage / Usinage & Valorisation', standardDays: 7, icon: '⚙️' },
    { id: 'QUALITY', name: '7. Contrôle Phytosanitaire & Humidité', standardDays: 3, icon: '🔬' },
    { id: 'PACKAGING', name: '8. Emballage Export & Palettisation', standardDays: 3, icon: '🏷️' },
    { id: 'DISPATCH', name: '9. Logistique & Acheminement Conakry', standardDays: 2, icon: '🚛' },
    { id: 'DELIVERY', name: '10. Réception Acheteur & Bordereau', standardDays: 1, icon: '🤝' },
  ];

  // Dynamic Real Campaigns from Backend
  const [dbCampaigns, setDbCampaigns] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchCampaigns() {
      const orgId = session?.organization?.id || session?.user?.activeOrganizationId;
      if (!orgId) {
        if (isMounted) {
          setDbCampaigns([]);
          setIsLoadingCampaigns(false);
        }
        return;
      }

      setIsLoadingCampaigns(true);
      try {
        const token = session?.token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('farming_calendar_token') : '') || '';
        const headers: Record<string, string> = {
          'Accept': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/v1/organizations/${orgId}/agricultural/campaigns`, {
          headers
        });

        if (!res.ok) {
          if (isMounted) setDbCampaigns([]);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          if (isMounted) setDbCampaigns([]);
          return;
        }

        const json = await res.json();
        if (json.success && Array.isArray(json.data) && isMounted) {
          const mapped = json.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            crop: c.cropName || c.crop_name || 'Culture',
            variety: c.varietyName || c.variety_name || 'Variété standard',
            farm: c.farmName || c.farm_name || 'Exploitation',
            plot: c.plotName || c.plot_code || 'Parcelle',
            areaHa: c.plannedAreaHectares || c.planned_area_hectares || 0,
            targetTons: c.expectedYieldTons || c.expected_yield_tons || 0,
            actualHarvestedTons: c.actualYieldTons || c.actual_yield_tons || 0,
            manager: c.managerName || 'Responsable',
            status: c.status || 'PLANNED',
            budgetGNF: c.budgetGnf || c.planned_budget_gnf || 0,
            actualCostGNF: c.actualCostGnf || c.actual_cost_gnf || 0,
            riskLevel: c.status === 'IN_PROGRESS' ? 'LOW' : 'MEDIUM',
            currentStageIndex: 0,
            stages: (c.operations && c.operations.length > 0)
              ? c.operations.map((op: any) => ({
                  id: op.id,
                  name: op.name,
                  start: op.planned_start_date || op.plannedStartDate || '',
                  end: op.planned_end_date || op.plannedEndDate || '',
                  status: op.status,
                  progress: op.status === 'COMPLETED' ? 100 : op.status === 'IN_PROGRESS' ? 50 : 0
                }))
              : [
                  { id: 'LAND_PREP', name: '1. Préparation du Sol', start: c.planned_start_date || '', end: c.planned_start_date || '', status: 'COMPLETED', progress: 100 },
                  { id: 'HARVEST', name: '2. Fenêtre de Récolte', start: c.planned_harvest_date || '', end: c.planned_end_date || '', status: 'PLANNED', progress: 0 }
                ]
          }));
          setDbCampaigns(mapped);
          if (mapped.length > 0) {
            setSelectedCampaignId(mapped[0].id);
          } else {
            setSelectedCampaignId('');
          }
        }
      } catch (err) {
        console.error('Failed to load campaigns for Master Calendar:', err);
      } finally {
        if (isMounted) setIsLoadingCampaigns(false);
      }
    }
    fetchCampaigns();
    return () => { isMounted = false; };
  }, [session?.token, session?.organization?.id, session?.user?.activeOrganizationId]);

  const masterCampaigns = dbCampaigns;

  const selectedCampaign = useMemo(() => {
    return masterCampaigns.find(c => c.id === selectedCampaignId) || masterCampaigns[0] || null;
  }, [masterCampaigns, selectedCampaignId]);

  // Backward Planning Calculation Engine
  const backwardSchedule = useMemo(() => {
    const targetDate = new Date(targetDeliveryDate);
    if (isNaN(targetDate.getTime())) return null;

    // Days per stage depending on selected crop
    const durationDays = targetProduct === 'PEPPER_S17'
      ? { delivery: 1, dispatch: 2, packaging: 3, quality: 3, processing: 8, harvest: 28, growth: 70, planting: 10, landPrep: 14 }
      : targetProduct === 'CASSAVA_BONOUA'
      ? { delivery: 2, dispatch: 3, packaging: 4, quality: 2, processing: 14, harvest: 35, growth: 200, planting: 14, landPrep: 20 }
      : { delivery: 1, dispatch: 2, packaging: 2, quality: 2, processing: 4, harvest: 18, growth: 65, planting: 7, landPrep: 12 };

    const calculateBack = (current: Date, days: number) => {
      const d = new Date(current);
      d.setDate(d.getDate() - days);
      return d;
    };

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const dDelivery = new Date(targetDate);
    const dDispatch = calculateBack(dDelivery, durationDays.delivery);
    const dPackaging = calculateBack(dDispatch, durationDays.dispatch);
    const dQuality = calculateBack(dPackaging, durationDays.packaging);
    const dProcessing = calculateBack(dQuality, durationDays.quality);
    const dHarvestEnd = calculateBack(dProcessing, durationDays.processing);
    const dHarvestStart = calculateBack(dHarvestEnd, durationDays.harvest);
    const dPlantingEnd = calculateBack(dHarvestStart, durationDays.growth);
    const dPlantingStart = calculateBack(dPlantingEnd, durationDays.planting);
    const dLandPrepStart = calculateBack(dPlantingStart, durationDays.landPrep);

    const today = new Date();
    const daysUntilStart = Math.ceil((dLandPrepStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isFeasible = daysUntilStart >= 0;

    return {
      targetDeliveryDate,
      daysUntilStart,
      isFeasible,
      bufferDays: Math.max(0, daysUntilStart),
      steps: [
        { name: '1. Préparation du terrain & amendements', start: formatDate(dLandPrepStart), end: formatDate(dPlantingStart), duration: durationDays.landPrep + ' jours', buffer: '3j marge' },
        { name: '2. Pépinière & Repiquage en terre', start: formatDate(dPlantingStart), end: formatDate(dPlantingEnd), duration: durationDays.planting + ' jours', buffer: '2j marge' },
        { name: '3. Cycle végétatif, irrigation & floraison', start: formatDate(dPlantingEnd), end: formatDate(dHarvestStart), duration: durationDays.growth + ' jours', buffer: '5j marge météo' },
        { name: '4. Fenêtre de cueillette & récolte', start: formatDate(dHarvestStart), end: formatDate(dHarvestEnd), duration: durationDays.harvest + ' jours', buffer: 'Sélection stricte' },
        { name: '5. Usinage, séchage & calibrage', start: formatDate(dHarvestEnd), end: formatDate(dQuality), duration: durationDays.processing + ' jours', buffer: 'Capacité 5t/j' },
        { name: '6. Contrôle qualité & agrément export', start: formatDate(dQuality), end: formatDate(dPackaging), duration: durationDays.quality + ' jours', buffer: 'Labo Conakry' },
        { name: '7. Palettisation & emballage agréé', start: formatDate(dPackaging), end: formatDate(dDispatch), duration: durationDays.packaging + ' jours', buffer: 'Cartons 5kg' },
        { name: '8. Départ convoi Kindia -> Conakry', start: formatDate(dDispatch), end: formatDate(dDelivery), duration: durationDays.dispatch + ' jours', buffer: 'Camion frigorifique' },
        { name: '9. Mise à quai / Réception Acheteur', start: formatDate(dDelivery), end: formatDate(dDelivery), duration: '1 jour', buffer: 'Transfert de risque' },
      ]
    };
  }, [targetDeliveryDate, targetProduct]);

  return (
    <div className="space-y-6">
      {/* Top Header & Executive Control Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
              CENTRE DE CONTRÔLE OPÉRATIONNEL
            </span>
            <Badge variant="forest" size="xs">
              Vision Stratégique & Backward Planning
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
            Notre Calendrier Maître (Master Production & Trade Calendar)
          </h1>
          <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5 max-w-3xl">
            Synchronisation de bout en bout de la production agricole avec les exigences commerciales : de la préparation des parcelles à la mise à disposition acheteur.
          </p>
        </div>

        {/* View Switcher Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F0F4EE] dark:bg-[#1B2B23] rounded-lg border border-[#E1E7E0] dark:border-[#283D33] self-start lg:self-auto">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'timeline'
                ? 'bg-white dark:bg-[#14201A] text-[#173F35] dark:text-[#77A96B] shadow-xs'
                : 'text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Timeline Gantt</span>
          </button>
          <button
            onClick={() => setViewMode('backward_planner')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'backward_planner'
                ? 'bg-white dark:bg-[#14201A] text-[#173F35] dark:text-[#77A96B] shadow-xs'
                : 'text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Planification Inversée</span>
          </button>
          <button
            onClick={() => setViewMode('stages')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'stages'
                ? 'bg-white dark:bg-[#14201A] text-[#173F35] dark:text-[#77A96B] shadow-xs'
                : 'text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>10 Étapes Clés</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: TIMELINE GANTT DE PRODUCTION */}
      {viewMode === 'timeline' && (
        masterCampaigns.length === 0 ? (
          <div className="bg-white dark:bg-[#14201A] rounded-2xl border border-[#E1E7E0] dark:border-[#24352C] p-10 text-center shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F0F4EE] dark:bg-[#1B2B23] border border-[#CDD6CC] dark:border-[#283D33] flex items-center justify-center text-[#2F7D4A] mb-4">
              <CalendarIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#202924] dark:text-[#EEF4F0] mb-2 font-sans">
              Aucune campagne de production active
            </h3>
            <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] max-w-lg mx-auto mb-6 leading-relaxed">
              Le Calendrier Maître synchronise l'échéancier des récoltes, les étapes de transformation et la logistique export dès que vous créez une campagne dans le module Cœur Agricole.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => onOpenCampaign?.('')}
              >
                Créer une Campagne
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Sparkles className="w-4 h-4 text-amber-500" />}
                onClick={() => setViewMode('backward_planner')}
              >
                Tester la Planification Inversée
              </Button>
            </div>
          </div>
        ) : selectedCampaign ? (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-[#14201A] p-4 rounded-xl border border-[#E1E7E0] dark:border-[#24352C] shadow-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#66736B] dark:text-[#9EB0A5] mb-1">
                Campagne Active
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full text-xs bg-[#F7F8F4] dark:bg-[#18261F] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg px-2.5 py-1.5 text-[#202924] dark:text-[#EEF4F0] focus:ring-1 focus:ring-[#2F7D4A]"
              >
                {masterCampaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#66736B] dark:text-[#9EB0A5] mb-1">
                Horizon Temporel
              </label>
              <select
                value={timeHorizon}
                onChange={(e: any) => setTimeHorizon(e.target.value)}
                className="w-full text-xs bg-[#F7F8F4] dark:bg-[#18261F] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg px-2.5 py-1.5 text-[#202924] dark:text-[#EEF4F0] focus:ring-1 focus:ring-[#2F7D4A]"
              >
                <option value="season">Saison Complète (6 mois)</option>
                <option value="quarter">Trimestre Opérationnel (Q2-Q3)</option>
                <option value="year">Année Agricole 2026</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#66736B] dark:text-[#9EB0A5] mb-1">
                Exploitation / Parcelle
              </label>
              <div className="text-xs text-[#202924] dark:text-[#EEF4F0] font-medium py-1.5 px-2 bg-[#F0F4EE] dark:bg-[#1B2B23] rounded-lg border border-[#E1E7E0] dark:border-[#283D33] truncate">
                {selectedCampaign.plot}
              </div>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                icon={<CalendarIcon className="w-3.5 h-3.5" />}
                onClick={onOpenNormalCalendar}
              >
                Ouvrir Calendrier Normal
              </Button>
            </div>
          </div>

          {/* Campaign Overview Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] uppercase font-mono">Culture & Variété</span>
              <div className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0] mt-0.5 truncate">{selectedCampaign.variety}</div>
              <div className="text-[10px] text-[#8A988F] truncate">{selectedCampaign.crop}</div>
            </div>

            <div className="p-3 bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] uppercase font-mono">Superficie Allouée</span>
              <div className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0] mt-0.5 font-mono">{selectedCampaign.areaHa.toFixed(1)} ha</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">100% cultivée</div>
            </div>

            <div className="p-3 bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] uppercase font-mono">Objectif Récolte</span>
              <div className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0] mt-0.5 font-mono">{selectedCampaign.targetTons.toFixed(1)} T</div>
              <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5]">Rdt: 15.0 T/ha</div>
            </div>

            <div className="p-3 bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] uppercase font-mono">Récolté Réel à Date</span>
              <div className="font-bold text-xs text-[#2F7D4A] dark:text-[#77A96B] mt-0.5 font-mono">{selectedCampaign.actualHarvestedTons.toFixed(1)} T</div>
              <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono">
                {Math.round((selectedCampaign.actualHarvestedTons / selectedCampaign.targetTons) * 100)}% réalisé
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] uppercase font-mono">Budget Engagé</span>
              <div className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0] mt-0.5 font-mono">
                {(selectedCampaign.actualCostGNF / 1000000).toFixed(1)}M GNF
              </div>
              <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono">
                / {(selectedCampaign.budgetGNF / 1000000).toFixed(0)}M GNF
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] uppercase font-mono">Statut du Risque</span>
              <div className="mt-1">
                <Badge variant={selectedCampaign.riskLevel === 'LOW' ? 'success' : 'warning'} size="xs">
                  {selectedCampaign.riskLevel === 'LOW' ? 'Maîtrisé' : 'Attention Vigilance'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Interactive Gantt Timeline Panel */}
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-[#E1E7E0] dark:border-[#24352C] bg-[#F7F8F4] dark:bg-[#18261F] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#202924] dark:text-[#EEF4F0] uppercase tracking-wider font-mono">
                  Échéancier Linéaire des Opérations & Chaîne de Valeur
                </h3>
                <p className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                  Planifié vs Réel • Dépendances amont-aval • Jalons critiques
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#66736B] dark:text-[#9EB0A5]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded bg-emerald-600 inline-block" />
                  <span className="text-[11px]">Terminé</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded bg-[#77A96B] inline-block animate-pulse" />
                  <span className="text-[11px]">En cours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded bg-[#CDD6CC] dark:bg-[#283D33] inline-block" />
                  <span className="text-[11px]">Planifié</span>
                </div>
              </div>
            </div>

            {/* Stages Timeline List */}
            <div className="divide-y divide-[#E1E7E0] dark:divide-[#24352C] text-xs">
              {selectedCampaign.stages.map((stage: any, idx: number) => (
                <div
                  key={stage.id}
                  className="p-3.5 hover:bg-[#F7F8F4]/80 dark:hover:bg-[#18261F]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 md:w-1/3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-[#F0F4EE] dark:bg-[#1B2B23] border border-[#E1E7E0] dark:border-[#283D33] text-[#202924] dark:text-[#EEF4F0]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-[#202924] dark:text-[#EEF4F0]">
                        {stage.name}
                      </div>
                      <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono">
                        {stage.start} &rarr; {stage.end}
                      </div>
                    </div>
                  </div>

                  {/* Gantt Bar Progression Visual */}
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8A988F] mb-1">
                      <span>Progression</span>
                      <span>{stage.progress}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#E1E7E0] dark:bg-[#24352C] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stage.status === 'COMPLETED'
                            ? 'bg-[#2F7D4A]'
                            : stage.status === 'IN_PROGRESS'
                            ? 'bg-[#77A96B]'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${stage.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-end gap-2 md:w-36">
                    <Badge
                      variant={
                        stage.status === 'COMPLETED'
                          ? 'success'
                          : stage.status === 'IN_PROGRESS'
                          ? 'forest'
                          : 'neutral'
                      }
                      size="xs"
                    >
                      {stage.status === 'COMPLETED'
                        ? 'Validé'
                        : stage.status === 'IN_PROGRESS'
                        ? 'En cours'
                        : 'À venir'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        ) : null
      )}

      {/* VIEW 2: BACKWARD PLANNING ENGINE (COMMERCIAL TO FIELD) */}
      {viewMode === 'backward_planner' && (
        <div className="space-y-6">
          <Card padding="md" className="border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#202924] dark:text-[#EEF4F0]">
                  Générateur de Rétro-Planning Commercial (Backward Planning Engine)
                </h3>
                <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-1 leading-relaxed">
                  Définissez votre date limite d'arrivée chez l'acheteur ou au port d'exportation. Le moteur calcule à rebours le calendrier cultural nécessaire, les fenêtres critiques de semis, de récolte et les marges de sécurité.
                </p>
              </div>
            </div>

            {/* Backward Planning Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-4 border-t border-amber-200/40 dark:border-amber-900/30">
              <div>
                <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1.5">
                  Date Limite Livraison Acheteur
                </label>
                <input
                  type="date"
                  value={targetDeliveryDate}
                  onChange={(e) => setTargetDeliveryDate(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg px-3 py-2 text-[#202924] dark:text-[#EEF4F0] font-mono focus:ring-2 focus:ring-[#2F7D4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1.5">
                  Spéculation Agricole
                </label>
                <select
                  value={targetProduct}
                  onChange={(e: any) => setTargetProduct(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg px-3 py-2 text-[#202924] dark:text-[#EEF4F0]"
                >
                  <option value="PEPPER_S17">Piment S17 (Cycle 120j)</option>
                  <option value="CASSAVA_BONOUA">Manioc Bonoua (Cycle 270j)</option>
                  <option value="WATERMELON_KAOLACK">Pastèque Kaolack (Cycle 85j)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1.5">
                  Volume Contractuel (Tonnes)
                </label>
                <input
                  type="number"
                  value={targetQuantityTons}
                  onChange={(e) => setTargetQuantityTons(Number(e.target.value))}
                  className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg px-3 py-2 text-[#202924] dark:text-[#EEF4F0] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1.5">
                  Destination / Point Réception
                </label>
                <input
                  type="text"
                  value={buyerDestination}
                  onChange={(e) => setBuyerDestination(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg px-3 py-2 text-[#202924] dark:text-[#EEF4F0]"
                />
              </div>
            </div>
          </Card>

          {/* Backward Schedule Result Table */}
          {backwardSchedule && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#202924] dark:text-[#EEF4F0]">
                    Planification Rétrograde Calculée
                  </h3>
                  <Badge variant={backwardSchedule.isFeasible ? 'success' : 'error'} size="sm">
                    {backwardSchedule.isFeasible
                      ? `Faisable (+${backwardSchedule.bufferDays} jours d'avance)`
                      : 'Infaisable : Dépassement des délais !'}
                  </Badge>
                </div>
                <span className="text-xs font-mono text-[#66736B] dark:text-[#9EB0A5]">
                  Surface requise estimée : {(targetQuantityTons / 15).toFixed(1)} ha
                </span>
              </div>

              <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8F4] dark:bg-[#18261F] border-b border-[#E1E7E0] dark:border-[#24352C] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-4 font-semibold">Étape Rétrograde</th>
                      <th className="py-2.5 px-3 font-semibold">Date Début Prévue</th>
                      <th className="py-2.5 px-3 font-semibold">Date Fin Limite</th>
                      <th className="py-2.5 px-3 font-semibold">Durée Standard</th>
                      <th className="py-2.5 px-4 font-semibold">Marge de Sécurité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                    {backwardSchedule.steps.map((st, i) => (
                      <tr key={i} className="hover:bg-[#F7F8F4]/50 dark:hover:bg-[#18261F]/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#202924] dark:text-[#EEF4F0]">
                          {st.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                          {st.start}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#66736B] dark:text-[#9EB0A5]">
                          {st.end}
                        </td>
                        <td className="py-3 px-3 text-[#66736B] dark:text-[#9EB0A5]">
                          {st.duration}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F0F4EE] dark:bg-[#1B2B23] text-[#2F7D4A] dark:text-[#77A96B] border border-[#E1E7E0] dark:border-[#283D33]">
                            {st.buffer}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: 10 KEY PRODUCTION-TO-EXPORT STAGES */}
      {viewMode === 'stages' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {productionStages.map((stage, idx) => (
              <div
                key={stage.id}
                className="p-4 rounded-xl border border-[#E1E7E0] dark:border-[#24352C] bg-white dark:bg-[#14201A] shadow-xs flex flex-col justify-between hover:border-[#2F7D4A] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{stage.icon}</span>
                    <span className="text-[10px] font-mono font-bold text-[#8A988F]">
                      0{idx + 1}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#202924] dark:text-[#EEF4F0] leading-snug">
                    {stage.name}
                  </h4>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C] flex items-center justify-between text-[11px] text-[#66736B] dark:text-[#9EB0A5]">
                  <span>Durée type:</span>
                  <span className="font-mono font-semibold text-[#2F7D4A] dark:text-[#77A96B]">
                    {stage.standardDays} jours
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
