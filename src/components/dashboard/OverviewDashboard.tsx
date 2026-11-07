import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  ChevronRight,
  Package,
  Truck,
  Droplets,
  Sliders,
  Download,
  RefreshCw,
  ShieldCheck,
  Building,
  UserCheck,
  HelpCircle,
  FileText,
  XCircle,
  Activity,
  Maximize2,
  ExternalLink,
  Info
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge, StatusDot } from '../ui/Badge.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { AuthSession, Farm } from '../../types/organization.ts';
import {
  DashboardRoleView,
  AlertThresholdConfig,
  DashboardFilterParams,
  DecisionSupportRecommendation,
  ExternalServiceStatus
} from '../../types/dashboard.ts';
import { DashboardService } from '../../services/client-api.ts';

interface OverviewDashboardProps {
  session: AuthSession;
  farms: Farm[];
  onNavigate: (tab: string, entityId?: string) => void;
  onQuickAction: (action: string) => void;
}

export function OverviewDashboard({
  session,
  farms,
  onNavigate,
  onQuickAction
}: OverviewDashboardProps) {
  const { t } = useTranslation();

  // Role default based on session
  const getDefaultRoleView = (): DashboardRoleView => {
    const role = session.user?.role;
    if (role === 'AGRONOMIST') return 'AGRONOMIST';
    if (role === 'COMMERCIAL_MANAGER') return 'COMMERCIAL_MANAGER';
    if (role === 'FINANCE_MANAGER') return 'FINANCE_MANAGER';
    if (role === 'MANAGER') return 'FARM_MANAGER';
    if (role === 'OPERATIONS_STAFF') return 'PROCESSING_MANAGER';
    return 'LEADERSHIP';
  };

  const [activeRoleView, setActiveRoleView] = useState<DashboardRoleView>(getDefaultRoleView());
  const [selectedFarmId, setSelectedFarmId] = useState<string>('ALL');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<DecisionSupportRecommendation[]>([]);
  const [externalServices, setExternalServices] = useState<ExternalServiceStatus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Threshold modal state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<AlertThresholdConfig>({
    costOverrunTolerancePct: 5,
    shipmentDelayToleranceHours: 24,
    safetyStockBufferPct: 15,
    cashDeficitThresholdGNF: 0,
    qualityFailureTolerancePct: 0
  });

  // Selected recommendation for detailed modal
  const [selectedRec, setSelectedRec] = useState<DecisionSupportRecommendation | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: DashboardFilterParams = {};
      if (selectedFarmId !== 'ALL') filters.farmId = selectedFarmId;
      if (selectedCampaignId !== 'ALL') filters.campaignId = selectedCampaignId;

      const [data, recs, ext] = await Promise.all([
        DashboardService.getDashboardData(session, activeRoleView, filters),
        DashboardService.getRecommendations(session, thresholds, filters),
        DashboardService.getExternalServicesStatus(session)
      ]);

      setDashboardData(data);
      setRecommendations(recs);
      setExternalServices(ext);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Erreur lors du chargement des données du tableau de bord.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [activeRoleView, selectedFarmId, selectedCampaignId]);

  const handleExport = (format: 'CSV' | 'JSON') => {
    DashboardService.exportDashboardReport(session, activeRoleView, format);
  };

  const formatGNF = (amount?: number) => {
    if (amount === undefined || amount === null) return '—';
    if (Math.abs(amount) >= 1_000_000) {
      return (amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M GNF';
    }
    return amount.toLocaleString('fr-FR') + ' GNF';
  };

  // Role metadata for tab selector
  const roleViewsList: Array<{ id: DashboardRoleView; label: string; icon: string; desc: string }> = [
    { id: 'LEADERSHIP', label: 'Direction Générale', icon: '🏛️', desc: 'Performance globale, commandes, rentabilité & risques' },
    { id: 'FARM_MANAGER', label: 'Chef d’Exploitation', icon: '🚜', desc: 'Opérations parcellaires, retards, récolte & intrants' },
    { id: 'AGRONOMIST', label: 'Agronomie & Suivi', icon: '🔬', desc: 'Stades culturaux, phytosanitaire & prévisions de rendement' },
    { id: 'COMMERCIAL_MANAGER', label: 'Direction Commerciale', icon: '💼', desc: 'Pipeline acheteurs, commandes fermes & échéances' },
    { id: 'PROCESSING_MANAGER', label: 'Usinage & Qualité', icon: '🏭', desc: 'Matières premières, rendement usine & rejets' },
    { id: 'LOGISTICS_MANAGER', label: 'Logistique & Transit', icon: '🚢', desc: 'Expéditions en transit, conformité documentaire & retards' },
    { id: 'FINANCE_MANAGER', label: 'Direction Financière', icon: '💰', desc: 'Budgets OPEX/CAPEX, trésorerie BFR & coûts unitaires' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#173F35] to-[#205144] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#77A96B_1px,transparent_1px)] [background-size:12px_12px]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-white/10 text-[#77A96B]">
                {session.organization?.countryCode || 'GN'} &bull; {session.organization?.name}
              </span>
              <span className="text-xs text-white/70">
                Phase 9: Tableaux de Bord par Rôle & Aide à la Décision
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cockpit Décisionnel & Pilotage Opérationnel
            </h1>
            <p className="text-xs text-white/80 leading-relaxed">
              Consolidation en temps réel des données des parcelles, usines de transformation, contrats commerciaux, expéditions export et comptabilité analytique.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<Sliders className="w-3.5 h-3.5" />}
              onClick={() => setIsConfigModalOpen(true)}
            >
              Seuils d'Alerte
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleExport('CSV')}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadDashboard}
            >
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* 2. ROLE SELECTOR TABS BAR */}
      <div className="bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-xl p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {roleViewsList.map(r => {
            const isSelected = activeRoleView === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRoleView(r.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#173F35] text-white shadow-xs'
                    : 'text-[#66736B] dark:text-[#9EB0A5] hover:bg-[#F7F8F4] dark:hover:bg-[#1B2B23] hover:text-[#202924]'
                }`}
                title={r.desc}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#77A96B]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FILTERS & DRILL-DOWN BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#14201A] p-3 rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#66736B] dark:text-[#9EB0A5]">
            <MapPin className="w-3.5 h-3.5 text-[#2F7D4A]" />
            <span className="font-semibold">Exploitation :</span>
            <select
              value={selectedFarmId}
              onChange={e => setSelectedFarmId(e.target.value)}
              className="px-2 py-1 bg-[#F7F8F4] dark:bg-[#1B2B23] border border-[#CDD6CC] dark:border-[#283D33] rounded-md text-xs font-medium text-[#202924] dark:text-[#EEF4F0]"
            >
              <option value="ALL">Toutes les Exploitations (Global)</option>
              {farms.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.region})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#66736B] dark:text-[#9EB0A5]">
            <Sprout className="w-3.5 h-3.5 text-[#2F7D4A]" />
            <span className="font-semibold">Campagne :</span>
            <select
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(e.target.value)}
              className="px-2 py-1 bg-[#F7F8F4] dark:bg-[#1B2B23] border border-[#CDD6CC] dark:border-[#283D33] rounded-md text-xs font-medium text-[#202924] dark:text-[#EEF4F0]"
            >
              <option value="ALL">Toutes les Campagnes en Cours</option>
              <option value="camp-pepper-s17-01">Piment S17 Kindia Export (4.5 ha)</option>
              <option value="camp-cassava-01">Manioc Bonoua Kindia (6.0 ha)</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-[#8A988F] font-mono">
          Données synchronisées avec la base &bull; {new Date().toLocaleTimeString()}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(error.toLowerCase().includes('token') || error.toLowerCase().includes('authenticat') || error.toLowerCase().includes('expir') || error.includes('UNAUTHORIZED')) && (
              <Button
                variant="primary"
                size="xs"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    try {
                      sessionStorage.removeItem('farming_calendar_token');
                      sessionStorage.removeItem('farming_calendar_session');
                    } catch {}
                    window.dispatchEvent(new CustomEvent('auth:expired'));
                  }
                }}
              >
                Se reconnecter
              </Button>
            )}
            <button onClick={() => setError(null)} className="text-red-500 font-bold p-1">×</button>
          </div>
        </div>
      )}

      {/* 4. DECISION SUPPORT & EXPLAINABLE RECOMMENDATIONS (Crucial Requirement) */}
      <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1E7E0] dark:border-[#24352C]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                AIDE À LA DÉCISION & GESTION DES RISQUES
              </span>
              <Badge variant="warning" size="xs">
                {recommendations.length} Alertes & Recommandations Expliquées
              </Badge>
            </div>
            <h2 className="text-sm font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
              Surveillance Proactive des Risques & Conseils Agronomiques
            </h2>
            <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
              Chaque recommandation explicite ses données sources, ses hypothèses et suggère un plan d’action immédiat. Distinction stricte entre règles métier et moteur d’optimisation IA.
            </p>
          </div>

          <Button
            variant="outline"
            size="xs"
            icon={<Sliders className="w-3 h-3" />}
            onClick={() => setIsConfigModalOpen(true)}
          >
            Ajuster Tolérances
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendations.slice(0, 6).map(rec => {
            const isCritical = rec.severity === 'CRITICAL';
            const isWarning = rec.severity === 'WARNING';
            const isAi = rec.type === 'AI_ADVISORY';

            return (
              <div
                key={rec.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isCritical
                    ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                    : isWarning
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                    : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isAi
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200'
                      }`}
                    >
                      {isAi ? '⚡ CONSEIL IA' : '📋 RÈGLE MÉTIER'}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isCritical
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {rec.severity}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0] mt-2 leading-snug">
                    {rec.title}
                  </h3>

                  <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-1 line-clamp-3">
                    {rec.summary}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedRec(rec)}
                    className="text-[11px] font-semibold text-[#173F35] dark:text-[#77A96B] hover:underline flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    Voir Justification
                  </button>

                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => onNavigate(rec.targetTab, rec.targetEntityId)}
                  >
                    {rec.actionLabel || 'Résoudre'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 5. ROLE-SPECIFIC DASHBOARD SECTIONS */}

      {/* VIEW A: LEADERSHIP / DIRECTION GÉNÉRALE */}
      {activeRoleView === 'LEADERSHIP' && dashboardData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Campagnes Actives</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.campaignPerformance?.activeCampaignsCount} Campagnes
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                {dashboardData.campaignPerformance?.totalCultivatedAreaHa} ha emblavés
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Engagements Acheteurs</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.commercialCommitments?.committedVolumeTons} Tonnes
              </div>
              <span className="text-[10px] text-sky-600 font-medium">
                {dashboardData.commercialCommitments?.confirmedOrdersCount} contrats fermes
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">CA Prévisionnel Total</span>
              <div className="text-lg font-bold text-[#173F35] dark:text-[#77A96B] mt-0.5">
                {formatGNF(dashboardData.commercialCommitments?.projectedRevenueGNF)}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                Marge brute: ~{dashboardData.financialSummary?.projectedMarginPct}%
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Fiabilité des Livraisons</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.deliveryReliability?.reliabilityScorePct}%
              </div>
              <span className="text-[10px] text-amber-600 font-medium">
                {dashboardData.deliveryReliability?.delayedShipmentsCount} expéditions avec retard
              </span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Performance des Récoltes & Avancement Tonnage"
                subtitle="Comparatif entre récolte prévisionnelle agronome et tonnages déjà pesés."
              />
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Objectif Total Récolte</span>
                  <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">
                    {dashboardData.campaignPerformance?.expectedHarvestTons} Tonnes
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Tonnage Pesé & Enregistré</span>
                  <span className="font-bold text-emerald-600">
                    {dashboardData.campaignPerformance?.actualHarvestedTons} Tonnes
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Taux d'Atteinte de l'Objectif</span>
                  <span className="font-bold text-[#173F35] dark:text-[#77A96B]">
                    {dashboardData.campaignPerformance?.harvestProgressPct}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Volume Restant à Récolter</span>
                  <span className="font-bold text-amber-600">
                    {Math.max(0, (dashboardData.campaignPerformance?.expectedHarvestTons || 0) - (dashboardData.campaignPerformance?.actualHarvestedTons || 0))} Tonnes
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Synthèse Financière & Coûts Moyens"
                subtitle="Dépenses réelles vs budgets alloués et coût moyen de revient à l'hectare."
              />
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Enveloppe Budgétaire Votée</span>
                  <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">
                    {formatGNF(dashboardData.financialSummary?.totalPlannedBudgetGNF)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Dépenses Réalisées Imputées</span>
                  <span className="font-bold text-red-600">
                    {formatGNF(dashboardData.financialSummary?.totalActualCostGNF)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Marge Brute Projetée</span>
                  <span className="font-bold text-emerald-600">
                    {formatGNF(dashboardData.financialSummary?.projectedMarginGNF)} ({dashboardData.financialSummary?.projectedMarginPct}%)
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Coût Moyen à l'Hectare</span>
                  <span className="font-bold text-[#173F35] dark:text-[#77A96B]">
                    {formatGNF(dashboardData.financialSummary?.costPerHectareAvgGNF)} / ha
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW B: FARM MANAGER / CHEF D'EXPLOITATION */}
      {activeRoleView === 'FARM_MANAGER' && dashboardData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Opérations Planifiées</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.fieldOperations?.totalDueOperations} Activités
              </div>
              <span className="text-[10px] text-[#66736B]">Cycle cultural 2026</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-red-600 font-bold">Tâches en Retard</span>
              <div className="text-lg font-bold text-red-700 dark:text-red-400 mt-0.5">
                {dashboardData.fieldOperations?.overdueCount} En Retard
              </div>
              <span className="text-[10px] text-red-600 font-medium">Interventions urgentes</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Équipes Mobilisées</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.laborAllocation?.totalWorkersMobilized} Ouvriers
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                {dashboardData.laborAllocation?.activeFieldTeamsCount} brigades actives
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Prochaine Récolte</span>
              <div className="text-lg font-bold text-[#173F35] dark:text-[#77A96B] mt-0.5">
                {dashboardData.harvestForecast?.expectedTonnageNext30Days} Tonnes
              </div>
              <span className="text-[10px] text-[#66736B]">Échéance : ~15 Nov 2026</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Overdue Operations List */}
            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Opérations Nécessitant une Action Immédiate"
                subtitle="Travaux du sol, fertilisation et désherbages ayant dépassé la date cible."
              />
              <div className="mt-3 space-y-2">
                {(dashboardData.fieldOperations?.overdueList || []).map((op: any) => (
                  <div key={op.id} className="p-2.5 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-red-900 dark:text-red-300">{op.operationName}</div>
                      <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5]">
                        {op.plotName} &bull; Resp : {op.responsible} &bull; Échéance : {op.plannedDate}
                      </div>
                    </div>
                    <Badge variant="error" size="xs">+{op.delayDays}j de retard</Badge>
                  </div>
                ))}
                {(dashboardData.fieldOperations?.overdueList || []).length === 0 && (
                  <div className="py-6 text-center text-xs text-emerald-600 font-medium">
                    Toutes les opérations au champ sont dans les délais prévus !
                  </div>
                )}
              </div>
            </Card>

            {/* Input Shortages */}
            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="État des Stocks d'Intrants & Risque de Rupture"
                subtitle="Surveillance des engrais, semences et produits de protection au magasin."
              />
              <div className="mt-3 space-y-2">
                {(dashboardData.inputShortages || []).map((inp: any) => {
                  const isCrit = inp.status === 'CRITICAL_DEFICIT';
                  const isLow = inp.status === 'LOW';
                  return (
                    <div key={inp.itemId} className="p-2.5 bg-gray-50 dark:bg-[#1B2B23] rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-[#202924] dark:text-[#EEF4F0]">{inp.itemName}</div>
                        <div className="text-[10px] text-[#8A988F]">
                          Seuil minimum requis : {inp.minimumRequired} {inp.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#202924] dark:text-[#EEF4F0]">
                          {inp.currentStock} {inp.unit}
                        </span>
                        <Badge variant={isCrit ? 'error' : isLow ? 'warning' : 'forest'} size="xs">
                          {isCrit ? 'Rupture' : isLow ? 'Stock Bas' : 'Optimal'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW C: AGRONOMIST / AGRONOME RÉFÉRENT */}
      {activeRoleView === 'AGRONOMIST' && dashboardData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Stades Phénologiques des Cultures"
                subtitle="Suivi de la progression des cycles végétatifs par parcelle."
              />
              <div className="mt-4 space-y-3">
                {(dashboardData.cropStages || []).map((stg: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-[#1B2B23] rounded-lg space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-[#202924] dark:text-[#EEF4F0]">
                      <span>{stg.cropName} ({stg.variety}) — {stg.plotName}</span>
                      <span className="text-[#173F35] dark:text-[#77A96B]">{stg.stage}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#2F7D4A] h-full rounded-full transition-all"
                        style={{ width: `${stg.cycleProgressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#8A988F]">
                      <span>{stg.daysInStage} jours dans ce stade</span>
                      <span>Progression cycle : {stg.cycleProgressPct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Relevés Sanitaires & Observations Terrain"
                subtitle="Signalements des attaques ravageurs, maladies et vigueur du feuillage."
              />
              <div className="mt-4 space-y-2">
                {(dashboardData.fieldObservations || []).map((obs: any) => (
                  <div key={obs.id} className="p-3 border border-[#E1E7E0] dark:border-[#24352C] rounded-lg text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">{obs.plotName}</span>
                      <Badge variant={obs.severity === 'MEDIUM' ? 'warning' : 'forest'} size="xs">
                        {obs.type}
                      </Badge>
                    </div>
                    <p className="text-[#66736B] dark:text-[#9EB0A5]">{obs.notes}</p>
                    <div className="text-[10px] text-[#8A988F] font-mono">
                      Relevé le {obs.date} par {obs.observer}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW D: COMMERCIAL MANAGER / DIRECTION COMMERCIALE */}
      {activeRoleView === 'COMMERCIAL_MANAGER' && dashboardData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Portefeuille Acheteurs</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.buyerPipeline?.totalBuyersCount} Comptes
              </div>
              <span className="text-[10px] text-sky-600 font-medium">
                {dashboardData.buyerPipeline?.activeContractsCount} contrats signés
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Commandes Fermes</span>
              <div className="text-lg font-bold text-[#173F35] dark:text-[#77A96B] mt-0.5">
                {formatGNF(dashboardData.quotationsAndOrders?.totalCommittedValueGNF)}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                Prix moyen: {formatGNF(dashboardData.quotationsAndOrders?.averagePricePerKgGNF)}/kg
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Piment Réservé</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.demandVsSupplyBalance?.pepperReservedTons} / {dashboardData.demandVsSupplyBalance?.pepperAvailableTons} T
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Capacité sécurisée</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Manioc Réservé</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.demandVsSupplyBalance?.cassavaReservedTons} / {dashboardData.demandVsSupplyBalance?.cassavaAvailableTons} T
              </div>
              <span className="text-[10px] text-sky-600 font-medium">Filière minoterie</span>
            </Card>
          </div>

          <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
            <CardHeader
              title="Prochaines Échéances de Livraison Contractuelles"
              subtitle="Commandes à préparer en priorité pour éviter tout défaut de livraison."
            />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F4] dark:bg-[#1B2B23] text-[#66736B] dark:text-[#9EB0A5]">
                  <tr>
                    <th className="py-2.5 px-3">N° Commande</th>
                    <th className="py-2.5 px-3">Client Acheteur</th>
                    <th className="py-2.5 px-3 text-right">Volume</th>
                    <th className="py-2.5 px-3">Date Cible</th>
                    <th className="py-2.5 px-3">Délai Restant</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {(dashboardData.upcomingDeadlines || []).map((ord: any) => (
                    <tr key={ord.orderId} className="hover:bg-[#F7F8F4] dark:hover:bg-[#1B2B23]/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#202924] dark:text-[#EEF4F0]">{ord.orderNumber}</td>
                      <td className="py-2.5 px-3">{ord.buyerName}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{ord.volumeTons} T</td>
                      <td className="py-2.5 px-3 font-mono">{ord.deliveryDeadline}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={ord.daysRemaining < 10 ? 'error' : 'forest'} size="xs">
                          {ord.daysRemaining} jours restants
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onNavigate('commercial', ord.orderId)}
                        >
                          Détails
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW E: PROCESSING / RESPONSABLE USINAGE */}
      {activeRoleView === 'PROCESSING_MANAGER' && dashboardData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Récolte en Attente</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.incomingRawMaterial?.harvestedProducePendingProcessingTons} Tonnes
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Piment & manioc bord champ</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Taux d'Utilisation Ligne</span>
              <div className="text-lg font-bold text-[#173F35] dark:text-[#77A96B] mt-0.5">
                {dashboardData.capacityUtilization?.utilizationRatePct}%
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                {dashboardData.capacityUtilization?.currentDailyThroughputKg} kg/jour
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Lots en Fabrication</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.productionPlans?.activeBatchesCount} Batches
              </div>
              <span className="text-[10px] text-sky-600 font-medium">Séchage & broyage actif</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-red-600 font-bold">Rejets Qualité</span>
              <div className="text-lg font-bold text-red-700 dark:text-red-400 mt-0.5">
                {dashboardData.qualityFailures?.length || 0} Lots Rejetés
              </div>
              <span className="text-[10px] text-red-600 font-medium">Blocage dispatch</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Rendements de Conversion des Lots (Yields)"
                subtitle="Rendement réel d'usinage vs standard théorique de recette."
              />
              <div className="mt-3 space-y-2">
                {(dashboardData.batchYields || []).map((b: any) => (
                  <div key={b.batchId} className="p-3 bg-gray-50 dark:bg-[#1B2B23] rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#202924] dark:text-[#EEF4F0]">
                      <span>{b.batchNumber} — {b.productName}</span>
                      <span className={b.variancePct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {b.conversionYieldPct}% ({b.variancePct >= 0 ? '+' : ''}{b.variancePct}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] flex justify-between">
                      <span>Matière Entrante: {b.inputKg} kg</span>
                      <span>Produit Fini Obtenu: {b.outputKg} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Rejets Qualité & Non-Conformités Sanitaires"
                subtitle="Lots bloqués par le contrôle qualité phytosanitaire et commercial."
              />
              <div className="mt-3 space-y-2">
                {(dashboardData.qualityFailures || []).map((q: any) => (
                  <div key={q.inspectionId} className="p-3 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold text-red-900 dark:text-red-300">
                      <span>{q.lotOrBatchNumber}</span>
                      <span>Rejet : {q.rejectionRatePct}% ({q.rejectedQuantityKg} kg)</span>
                    </div>
                    <p className="text-[11px] text-red-700 dark:text-red-400">Motif : {q.defectType}</p>
                    <div className="pt-1 flex justify-end">
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => onNavigate('operations')}
                      >
                        Inspecter le Lot
                      </Button>
                    </div>
                  </div>
                ))}
                {(dashboardData.qualityFailures || []).length === 0 && (
                  <div className="py-6 text-center text-xs text-emerald-600 font-medium">
                    Aucun lot bloqué. Tous les contrôles qualité sont validés.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW F: LOGISTICS / TRANSIT & EXPORT */}
      {activeRoleView === 'LOGISTICS_MANAGER' && dashboardData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Expéditions Actives</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {dashboardData.shipmentsInProgress?.totalActiveShipments} Convois
              </div>
              <span className="text-[10px] text-sky-600 font-medium">
                {dashboardData.shipmentsInProgress?.dispatchedInTransitCount} en transit
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-amber-600 font-bold">Expéditions Retardées</span>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                {dashboardData.shipmentsInProgress?.delayedCount} Retardées
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Recalcul jalons requis</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Documents Conformité</span>
              <div className="text-lg font-bold text-[#173F35] dark:text-[#77A96B] mt-0.5">
                {dashboardData.documentCompliance?.approvedCount} / {dashboardData.documentCompliance?.totalDocumentsRequired}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Certificats phytosanitaires</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Documents Manquants</span>
              <div className="text-lg font-bold text-red-600 mt-0.5">
                {dashboardData.documentCompliance?.rejectedOrMissingCount} En Attente
              </div>
              <span className="text-[10px] text-red-600 font-medium">Risque blocage douane</span>
            </Card>
          </div>

          <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
            <CardHeader
              title="Jalons des Expéditions en Cours & Décalages d'Arrivée"
              subtitle="Suivi des étapes logistiques entre départ Kindia et livraison portuaire."
            />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F4] dark:bg-[#1B2B23] text-[#66736B] dark:text-[#9EB0A5]">
                  <tr>
                    <th className="py-2.5 px-3">Tracking</th>
                    <th className="py-2.5 px-3">Destination</th>
                    <th className="py-2.5 px-3">Jalon Actuel</th>
                    <th className="py-2.5 px-3">Arrivée Prévue</th>
                    <th className="py-2.5 px-3">Retard</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {(dashboardData.milestoneTracking || []).map((m: any) => (
                    <tr key={m.shipmentId} className="hover:bg-[#F7F8F4] dark:hover:bg-[#1B2B23]/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#202924] dark:text-[#EEF4F0]">{m.trackingNumber}</td>
                      <td className="py-2.5 px-3">{m.destination}</td>
                      <td className="py-2.5 px-3 font-medium">{m.currentMilestone}</td>
                      <td className="py-2.5 px-3 font-mono">{m.estimatedArrival}</td>
                      <td className="py-2.5 px-3">
                        {m.delayHours > 0 ? (
                          <Badge variant="warning" size="xs">+{m.delayHours}h retard</Badge>
                        ) : (
                          <Badge variant="forest" size="xs">À l'heure</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onNavigate('logistics', m.shipmentId)}
                        >
                          Gérer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW G: FINANCE / DIRECTION FINANCIÈRE */}
      {activeRoleView === 'FINANCE_MANAGER' && dashboardData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">OPEX Réalisé</span>
              <div className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {formatGNF(dashboardData.budgetExecution?.totalActualOpexGNF)}
              </div>
              <span className="text-[10px] text-[#66736B]">
                Budget: {formatGNF(dashboardData.budgetExecution?.totalPlannedOpexGNF)}
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">CAPEX Investi</span>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-0.5">
                {formatGNF(dashboardData.budgetExecution?.totalActualCapexGNF)}
              </div>
              <span className="text-[10px] text-purple-600">Immobilisations amorties</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">BFR Crête (Point Bas)</span>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                {formatGNF(dashboardData.cashFlowSummary?.peakWorkingCapitalDeficitGNF)}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Besoins de trésorerie</span>
            </Card>

            <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Créances Clients B2B</span>
              <div className="text-lg font-bold text-[#173F35] dark:text-[#77A96B] mt-0.5">
                {formatGNF(dashboardData.outstandingCommercialReceipts?.totalReceivablesGNF)}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Factures en attente</span>
            </Card>
          </div>

          <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
            <CardHeader
              title="Exécution Budgétaire par Catégorie Agricole"
              subtitle="Engagements, dépenses réelles et écarts comptables."
            />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F4] dark:bg-[#1B2B23] text-[#66736B] dark:text-[#9EB0A5]">
                  <tr>
                    <th className="py-2.5 px-3">Poste Budgétaire</th>
                    <th className="py-2.5 px-3 text-right">Budget Alloué</th>
                    <th className="py-2.5 px-3 text-right">Dépenses Réelles</th>
                    <th className="py-2.5 px-3 text-right">Écart</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {(dashboardData.budgetCategoryBreakdown || []).map((b: any, idx: number) => {
                    const isOver = b.varianceGNF < 0;
                    return (
                      <tr key={idx} className="hover:bg-[#F7F8F4] dark:hover:bg-[#1B2B23]/50">
                        <td className="py-2.5 px-3 font-medium text-[#202924] dark:text-[#EEF4F0]">{b.category}</td>
                        <td className="py-2.5 px-3 text-right">{formatGNF(b.plannedGNF)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{formatGNF(b.actualGNF)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className={isOver ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                            {b.varianceGNF >= 0 ? '+' : ''}{formatGNF(b.varianceGNF)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={isOver ? 'error' : 'forest'} size="xs">
                            {isOver ? 'Dépassement' : 'Conforme'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 6. TRANSPARENCY NOTICE: EXTERNAL SERVICES INTEGRATIONS (Crucial Requirement) */}
      <div className="p-4 bg-gray-50 dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#202924] dark:text-[#EEF4F0]">
          <Activity className="w-4 h-4 text-[#2F7D4A]" />
          Transparence des Données Externes & Intégrations API
        </div>
        <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] leading-relaxed">
          Conformément aux normes agrobusiness du Farming Calendar, aucune donnée météo, cotation de marché ou imagerie satellitaire n'est simulée ou inventée. En l’absence de clé API configurée, le système affiche l'état non connecté et exploite exclusivement vos enregistrements réels vérifiés.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
          {externalServices.map((srv, idx) => (
            <div key={idx} className="p-2.5 rounded-lg border border-[#CDD6CC] dark:border-[#283D33] bg-white dark:bg-[#1B2B23] text-xs space-y-1">
              <div className="flex justify-between items-center font-semibold text-[#202924] dark:text-[#EEF4F0]">
                <span className="truncate">{srv.service}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                  {srv.status === 'CONFIGURED' ? 'ACTIF' : 'NON CONNECTÉ'}
                </span>
              </div>
              <p className="text-[10px] text-[#66736B] dark:text-[#9EB0A5]">{srv.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: ALERT THRESHOLDS CONFIGURATION */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configuration des Seuils d'Alerte Décisionnels"
        subtitle="Personnalisez les critères de déclenchement des alertes automatiques et recommandations."
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            setIsConfigModalOpen(false);
            loadDashboard();
          }}
          className="space-y-4"
        >
          <Input
            label="Tolérance Dépassement Budgétaire (%)"
            type="number"
            min="0"
            max="50"
            value={thresholds.costOverrunTolerancePct}
            onChange={e => setThresholds({ ...thresholds, costOverrunTolerancePct: Number(e.target.value) })}
          />

          <Input
            label="Tolérance Retard Expédition (Heures)"
            type="number"
            min="1"
            max="168"
            value={thresholds.shipmentDelayToleranceHours}
            onChange={e => setThresholds({ ...thresholds, shipmentDelayToleranceHours: Number(e.target.value) })}
          />

          <Input
            label="Marge de Sécurité Stock d'Intrants (%)"
            type="number"
            min="5"
            max="50"
            value={thresholds.safetyStockBufferPct}
            onChange={e => setThresholds({ ...thresholds, safetyStockBufferPct: Number(e.target.value) })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsConfigModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Enregistrer les Seuils
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RECOMMENDATION DETAIL & EXPLANATION */}
      {selectedRec && (
        <Modal
          isOpen={!!selectedRec}
          onClose={() => setSelectedRec(null)}
          title={selectedRec.title}
          subtitle={`Aide à la Décision • Domaine : ${selectedRec.domain} • Gravité : ${selectedRec.severity}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 dark:bg-[#1B2B23] rounded-lg space-y-1">
              <span className="font-bold text-[#202924] dark:text-[#EEF4F0] block">Diagnostic :</span>
              <p className="text-[#66736B] dark:text-[#9EB0A5]">{selectedRec.summary}</p>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-[#202924] dark:text-[#EEF4F0] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2F7D4A]" />
                Données Sources Sous-Jacentes (Base de Données) :
              </span>
              <pre className="p-3 bg-[#173F35]/5 dark:bg-[#1B2B23] rounded-lg text-[11px] font-mono text-[#202924] dark:text-[#EEF4F0] overflow-x-auto border border-[#E1E7E0] dark:border-[#283D33]">
                {JSON.stringify(selectedRec.underlyingData, null, 2)}
              </pre>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-[#202924] dark:text-[#EEF4F0] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                Hypothèses Retenues :
              </span>
              <ul className="list-disc pl-5 space-y-1 text-[#66736B] dark:text-[#9EB0A5]">
                {selectedRec.assumptions.map((asm, idx) => (
                  <li key={idx}>{asm}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-[#202924] dark:text-[#EEF4F0] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Actions Recommandées par le Système :
              </span>
              <ul className="list-disc pl-5 space-y-1 text-[#202924] dark:text-[#EEF4F0]">
                {selectedRec.suggestedNextSteps.map((stp, idx) => (
                  <li key={idx} className="font-medium">{stp}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
              <Button variant="outline" size="sm" onClick={() => setSelectedRec(null)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const targetTab = selectedRec.targetTab;
                  const targetId = selectedRec.targetEntityId;
                  setSelectedRec(null);
                  onNavigate(targetTab, targetId);
                }}
              >
                {selectedRec.actionLabel || 'Ouvrir l\'Élément Source'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
