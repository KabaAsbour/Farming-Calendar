import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  Sliders,
  ShieldCheck,
  FileText,
  Building,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { Modal } from '../ui/Modal.tsx';
import { AuthSession } from '../../types/organization.ts';
import {
  BudgetLineItem,
  CampaignFinancialPerformance,
  ExchangeRateRecord,
  FinancialScenarioComparisonItem,
  InvestmentAppraisalResult,
  BudgetCategory,
  ExpenseNature
} from '../../types/finance.ts';
import { FinanceService } from '../../services/client-api.ts';

interface FinanceViewProps {
  session: AuthSession;
}

type FinanceTab = 'budgets' | 'profitability' | 'cashflow' | 'scenarios' | 'investment_dcf' | 'currencies';

export function FinanceView({ session }: FinanceViewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FinanceTab>('budgets');
  const [selectedCurrency, setSelectedCurrency] = useState<'GNF' | 'EUR' | 'USD' | 'XOF'>('GNF');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRecord[]>([]);

  // State
  const [budgets, setBudgets] = useState<BudgetLineItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('camp-pepper-s17-01');
  const [performance, setPerformance] = useState<CampaignFinancialPerformance | null>(null);
  const [scenarios, setScenarios] = useState<FinancialScenarioComparisonItem[]>([]);
  const [appraisal, setAppraisal] = useState<InvestmentAppraisalResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filter state for budgets
  const [expenseNatureFilter, setExpenseNatureFilter] = useState<string>('ALL');
  const [budgetSearch, setBudgetSearch] = useState<string>('');

  // Budget Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [budgetTitle, setBudgetTitle] = useState<string>('');
  const [budgetCategory, setBudgetCategory] = useState<BudgetCategory>('FERTILIZERS_CROP_PROTECTION');
  const [budgetExpenseNature, setBudgetExpenseNature] = useState<ExpenseNature>('OPEX');
  const [budgetPlanned, setBudgetPlanned] = useState<number>(10000000);
  const [budgetCommitted, setBudgetCommitted] = useState<number>(0);
  const [budgetActual, setBudgetActual] = useState<number>(0);
  const [budgetNotes, setBudgetNotes] = useState<string>('');

  // Exchange Rate Modal State
  const [isRateModalOpen, setIsRateModalOpen] = useState<boolean>(false);
  const [fromCurr, setFromCurr] = useState<'EUR' | 'USD' | 'XOF'>('EUR');
  const [rateVal, setRateVal] = useState<number>(9350);
  const [rateSource, setRateSource] = useState<string>('Banque Centrale de la République de Guinée (BCRG)');

  // DCF Appraisal Inputs State
  const [dcfCapex, setDcfCapex] = useState<number>(150000000);
  const [dcfDiscountRate, setDcfDiscountRate] = useState<number>(12);
  const [dcfInflationRate, setDcfInflationRate] = useState<number>(8);
  const [dcfLifespan, setDcfLifespan] = useState<number>(5);

  const canEdit = ['FINANCE_MANAGER', 'ORG_ADMIN', 'MANAGER', 'COMMERCIAL_MANAGER', 'PLATFORM_OWNER'].includes(
    session.user?.role || ''
  );

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [fetchedBudgets, fetchedRates, fetchedPerf, fetchedScenarios, fetchedDcf] = await Promise.all([
        FinanceService.listBudgets(session),
        FinanceService.getExchangeRates(session),
        FinanceService.calculateCampaignFinancialPerformance(session, selectedCampaignId, {
          targetCurrency: selectedCurrency
        }),
        FinanceService.simulateFinancialScenarios(session, selectedCampaignId),
        FinanceService.calculateMultiYearInvestmentAppraisal(session, {
          projectName: 'Unité de Séchage et Transformation Piment (Kindia)',
          initialInvestmentCapex: dcfCapex,
          discountRatePct: dcfDiscountRate,
          inflationRatePct: dcfInflationRate,
          financingInterestRatePct: 10,
          taxRatePct: 25,
          projectLifespanYears: dcfLifespan,
          annualRevenues: [85000000, 110000000, 135000000, 140000000, 150000000],
          annualOpexCosts: [35000000, 42000000, 48000000, 50000000, 52000000],
          terminalValue: 25000000,
          assumptionsNotes: 'Financement mixte fonds propres et crédit de campagne.'
        })
      ]);

      setBudgets(fetchedBudgets);
      setExchangeRates(fetchedRates);
      setPerformance(fetchedPerf);
      setScenarios(fetchedScenarios);
      setAppraisal(fetchedDcf);
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors du chargement des données financières.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCurrency, selectedCampaignId]);

  const formatAmount = (amount: number, currency: string = selectedCurrency) => {
    if (currency === 'GNF') {
      if (Math.abs(amount) >= 1000000) {
        return (amount / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M GNF';
      }
      return amount.toLocaleString('fr-FR') + ' GNF';
    }
    return amount.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' ' + currency;
  };

  const handleCreateBudgetLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setActionError(null);
    try {
      await FinanceService.createOrUpdateBudget(session, {
        entityType: 'CAMPAIGN',
        entityId: selectedCampaignId,
        entityName: performance?.campaignName || 'Campagne en cours',
        fiscalYear: 2026,
        category: budgetCategory,
        expenseNature: budgetExpenseNature,
        title: budgetTitle,
        currency: 'GNF',
        plannedBudget: Number(budgetPlanned),
        committedAmount: Number(budgetCommitted),
        actualExpenditure: Number(budgetActual),
        notes: budgetNotes
      });
      setIsBudgetModalOpen(false);
      setBudgetTitle('');
      setActionSuccess('Ligne budgétaire enregistrée avec succès.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Échec de l’enregistrement de la ligne budgétaire.');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!canEdit) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ligne budgétaire ?')) return;
    try {
      await FinanceService.deleteBudget(session, id);
      setActionSuccess('Ligne budgétaire supprimée.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la suppression.');
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      await FinanceService.setExchangeRate(session, {
        fromCurrency: fromCurr,
        toCurrency: 'GNF',
        rate: Number(rateVal),
        effectiveDate: new Date().toISOString().split('T')[0],
        source: rateSource,
        isManualOverride: true
      });
      setIsRateModalOpen(false);
      setActionSuccess('Taux de change actualisé avec référence BCRG.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la mise à jour du taux.');
    }
  };

  const handleExport = (fmt: 'CSV' | 'JSON') => {
    FinanceService.exportFinancialReport(session, selectedCampaignId, fmt);
  };

  // Filtered budgets
  const filteredBudgets = budgets.filter(b => {
    if (expenseNatureFilter !== 'ALL' && b.expenseNature !== expenseNatureFilter) return false;
    if (budgetSearch) {
      const q = budgetSearch.toLowerCase();
      if (!b.title.toLowerCase().includes(q) && !b.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalOpexPlanned = budgets.filter(b => b.expenseNature === 'OPEX').reduce((acc, b) => acc + b.plannedBudget, 0);
  const totalOpexActual = budgets.filter(b => b.expenseNature === 'OPEX').reduce((acc, b) => acc + b.actualExpenditure, 0);
  const totalCapexPlanned = budgets.filter(b => b.expenseNature === 'CAPEX').reduce((acc, b) => acc + b.plannedBudget, 0);
  const totalCapexActual = budgets.filter(b => b.expenseNature === 'CAPEX').reduce((acc, b) => acc + b.actualExpenditure, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
              PLANIFICATION FINANCIÈRE & ANALYTIQUE (PHASE 8)
            </span>
            <Badge variant="forest" size="xs">
              Tenue Budgétaire & Rentabilité Parcellaire
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
            Pilotage Économique & Performance Agrobusiness
          </h1>
          <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
            Séparation stricte OPEX/CAPEX, marge unitaire, seuil de rentabilité (Break-Even), BFR et modélisation de scénarios de stress.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Campaign Selector */}
          <select
            value={selectedCampaignId}
            onChange={e => setSelectedCampaignId(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-[#1B2B23] border border-[#CDD6CC] dark:border-[#283D33] text-[#202924] dark:text-[#EEF4F0] shadow-xs"
          >
            <option value="camp-pepper-s17-01">Campagne Piment S17 Kindia Export (4.5 ha)</option>
            <option value="camp-cassava-01">Campagne Manioc Bonoua Kindia (6.0 ha)</option>
          </select>

          {/* Currency Switcher */}
          <div className="flex items-center bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-0.5 shadow-xs">
            {(['GNF', 'EUR', 'USD', 'XOF'] as const).map(curr => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  selectedCurrency === curr
                    ? 'bg-[#173F35] text-[#EEF4F0]'
                    : 'text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924] dark:hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Export Dropdown */}
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleExport('CSV')}
          >
            Export CSV
          </Button>

          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsBudgetModalOpen(true)}
            >
              Nouveau Budget
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-2">×</button>
        </div>
      )}

      {/* 2. Top Executive Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
          <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">CA Prévisionnel Total</span>
          <div className="text-base font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
            {performance ? formatAmount(performance.totalRevenue) : '—'}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" />
            {performance ? `${performance.saleableOutputTons} T commercialisables` : ''}
          </span>
        </Card>

        <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
          <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Charges OPEX</span>
          <div className="text-base font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
            {formatAmount(totalOpexActual > 0 ? totalOpexActual : totalOpexPlanned)}
          </div>
          <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] mt-0.5 block">
            Budget: {formatAmount(totalOpexPlanned)}
          </span>
        </Card>

        <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
          <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Investissements CAPEX</span>
          <div className="text-base font-bold text-purple-700 dark:text-purple-400 mt-0.5">
            {formatAmount(totalCapexActual > 0 ? totalCapexActual : totalCapexPlanned)}
          </div>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 block">
            Immobilisations amorties
          </span>
        </Card>

        <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
          <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Marge Brute (Gross Margin)</span>
          <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
            {performance ? `${performance.grossMarginPct}%` : '—'}
          </div>
          <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] mt-0.5 block">
            {performance ? formatAmount(performance.grossMargin) : ''}
          </span>
        </Card>

        <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
          <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">Résultat Exploitation (EBIT)</span>
          <div className="text-base font-bold text-[#173F35] dark:text-[#77A96B] mt-0.5">
            {performance ? formatAmount(performance.operatingProfitEbit) : '—'}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            Marge: {performance?.operatingProfitMarginPct}%
          </span>
        </Card>

        <Card className="p-3 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
          <span className="text-[10px] font-mono uppercase text-[#66736B] dark:text-[#9EB0A5]">BFR Crête (Peak Cash Deficit)</span>
          <div className="text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5">
            {performance ? formatAmount(performance.workingCapitalRequirement) : '—'}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block">
            Besoin trésorerie campagne
          </span>
        </Card>
      </div>

      {/* 3. Sub-Tab Navigation */}
      <div className="flex border-b border-[#E1E7E0] dark:border-[#24352C] gap-1 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'budgets'
              ? 'border-[#2F7D4A] text-[#173F35] dark:text-[#77A96B]'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Budgets & Postes de Coûts (OPEX / CAPEX)
        </button>

        <button
          onClick={() => setActiveTab('profitability')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'profitability'
              ? 'border-[#2F7D4A] text-[#173F35] dark:text-[#77A96B]'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Rentabilité & Seuils de Rentabilité (Unit Economics)
        </button>

        <button
          onClick={() => setActiveTab('cashflow')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'cashflow'
              ? 'border-[#2F7D4A] text-[#173F35] dark:text-[#77A96B]'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Échéancier de Trésorerie & BFR
        </button>

        <button
          onClick={() => setActiveTab('scenarios')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'scenarios'
              ? 'border-[#2F7D4A] text-[#173F35] dark:text-[#77A96B]'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Modélisation de Scénarios & Stress Tests
        </button>

        <button
          onClick={() => setActiveTab('investment_dcf')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'investment_dcf'
              ? 'border-[#2F7D4A] text-[#173F35] dark:text-[#77A96B]'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Investissements Pluriannuels (VAN / TRI / Payback)
        </button>

        <button
          onClick={() => setActiveTab('currencies')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'currencies'
              ? 'border-[#2F7D4A] text-[#173F35] dark:text-[#77A96B]'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Taux de Change & Devises BCRG
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: BUDGETS MANAGEMENT */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#14201A] p-3 rounded-lg border border-[#E1E7E0] dark:border-[#24352C]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#66736B] dark:text-[#9EB0A5] font-medium">Filtrer par nature :</span>
              {['ALL', 'OPEX', 'CAPEX'].map(nature => (
                <button
                  key={nature}
                  onClick={() => setExpenseNatureFilter(nature)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                    expenseNatureFilter === nature
                      ? 'bg-[#173F35] text-white'
                      : 'bg-[#F0F4EE] dark:bg-[#1B2B23] text-[#66736B] dark:text-[#9EB0A5]'
                  }`}
                >
                  {nature === 'ALL' ? 'Tous les postes' : nature}
                </button>
              ))}
            </div>

            <div className="w-64">
              <input
                type="text"
                placeholder="Rechercher intitulé ou catégorie..."
                value={budgetSearch}
                onChange={e => setBudgetSearch(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#1B2B23] border border-[#CDD6CC] dark:border-[#283D33] rounded-md text-[#202924] dark:text-[#EEF4F0]"
              />
            </div>
          </div>

          {/* Budget Table */}
          <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F4] dark:bg-[#1B2B23] text-[#66736B] dark:text-[#9EB0A5] border-b border-[#E1E7E0] dark:border-[#24352C]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Poste / Intitulé</th>
                    <th className="py-2.5 px-3 font-semibold">Catégorie</th>
                    <th className="py-2.5 px-3 font-semibold">Nature</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Budget Prévu</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Engagé</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Réel Réalisé</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Solde Estimé</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Écart</th>
                    {canEdit && <th className="py-2.5 px-3 font-semibold text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {filteredBudgets.map(item => (
                    <tr key={item.id} className="hover:bg-[#F7F8F4] dark:hover:bg-[#1B2B23]/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#202924] dark:text-[#EEF4F0]">
                        <div>{item.title}</div>
                        {item.notes && <div className="text-[10px] text-[#8A988F] italic">{item.notes}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {item.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={item.expenseNature === 'CAPEX' ? 'info' : 'neutral'} size="xs">
                          {item.expenseNature}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#202924] dark:text-[#EEF4F0]">
                        {formatAmount(item.plannedBudget)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#66736B] dark:text-[#9EB0A5]">
                        {formatAmount(item.committedAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#173F35] dark:text-[#77A96B]">
                        {formatAmount(item.actualExpenditure)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#66736B] dark:text-[#9EB0A5]">
                        {formatAmount(item.forecastRemaining)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            item.varianceAmount >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {item.varianceAmount >= 0 ? '+' : ''}
                          {formatAmount(item.varianceAmount)}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteBudget(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredBudgets.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#66736B] dark:text-[#9EB0A5]">
                        Aucune ligne budgétaire enregistrée pour cette sélection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REVENUE, PROFITABILITY & BREAK-EVEN */}
      {activeTab === 'profitability' && performance && (
        <div className="space-y-6">
          {/* Yield to Revenue Waterfall */}
          <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
            <CardHeader
              title="Conversion Agronomique : Du Champ au Produit Commercialisable"
              subtitle="Déduction transparente des pertes au champ, séchage/curing, et écarts de calibrage qualité."
            />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              <div className="p-3 bg-gray-50 dark:bg-[#1B2B23] rounded-lg">
                <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono">1. Récolte Brute</span>
                <div className="text-base font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                  {performance.grossHarvestTons} Tonnes
                </div>
                <span className="text-[10px] text-[#8A988F]">Pesée bord champ brute</span>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                  2. Pertes Usinage (-{performance.processingLossPct}%)
                </span>
                <div className="text-base font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                  -{performance.processingLossTons} Tonnes
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">Évaporation & parures</span>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <span className="text-[10px] text-red-700 dark:text-red-400 font-mono">
                  3. Rejets Qualité (-{performance.qualityRejectedPct}%)
                </span>
                <div className="text-base font-bold text-red-800 dark:text-red-300 mt-0.5">
                  -{performance.qualityRejectedTons} Tonnes
                </div>
                <span className="text-[10px] text-red-600 dark:text-red-400">Calibre hors-norme</span>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">4. Commercialisable</span>
                <div className="text-base font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                  {performance.saleableOutputTons} Tonnes
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Grade A + Grade B net</span>
              </div>

              <div className="p-3 bg-[#173F35] text-[#EEF4F0] rounded-lg">
                <span className="text-[10px] text-[#77A96B] font-mono">5. Chiffre d'Affaires</span>
                <div className="text-base font-bold mt-0.5">{formatAmount(performance.totalRevenue)}</div>
                <span className="text-[10px] text-[#9EB0A5]">Export + Local + Stock</span>
              </div>
            </div>

            {/* Channels Split */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#E1E7E0] dark:border-[#24352C] text-xs">
              <div className="p-2.5 rounded-lg border border-[#CDD6CC] dark:border-[#283D33]">
                <div className="flex justify-between font-bold text-[#202924] dark:text-[#EEF4F0]">
                  <span>Ventes Export (75%)</span>
                  <span>{formatAmount(performance.exportRevenue)}</span>
                </div>
                <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-1">
                  Volume: {performance.exportSalesTons} T @ {formatAmount(performance.exportPricePerKg)}/kg
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#CDD6CC] dark:border-[#283D33]">
                <div className="flex justify-between font-bold text-[#202924] dark:text-[#EEF4F0]">
                  <span>Ventes Locales (20%)</span>
                  <span>{formatAmount(performance.localRevenue)}</span>
                </div>
                <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-1">
                  Volume: {performance.localSalesTons} T @ {formatAmount(performance.localPricePerKg)}/kg
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#CDD6CC] dark:border-[#283D33]">
                <div className="flex justify-between font-bold text-[#202924] dark:text-[#EEF4F0]">
                  <span>Stock d'Inventaire Résiduel (5%)</span>
                  <span>{formatAmount(performance.unsoldStockValuation)}</span>
                </div>
                <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-1">
                  Volume: {performance.unsoldStockTons} T valorisé à coût décoté
                </div>
              </div>
            </div>
          </Card>

          {/* Unit Economics & Break-Even Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Ratios Économiques & Coûts Unitaires"
                subtitle="Coûts de revient réels ramenés à l'hectare et au kilogramme produit."
              />
              <div className="space-y-3 mt-4 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Superficie cultivée</span>
                  <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">{performance.areaHa} Hectares</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Coût de revient par Hectare</span>
                  <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">{formatAmount(performance.costPerHectare)} / ha</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Coût unitaire au Kilogramme</span>
                  <span className="font-bold text-[#173F35] dark:text-[#77A96B]">{formatAmount(performance.costPerKg)} / kg</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Marge Brute Globale</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatAmount(performance.grossMargin)} ({performance.grossMarginPct}%)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[#66736B] dark:text-[#9EB0A5]">Marge sur Coûts Variables</span>
                  <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">
                    {formatAmount(performance.contributionMargin)} ({performance.contributionMarginPct}%)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[#66736B] dark:text-[#9EB0A5] font-semibold">Résultat d'Exploitation (EBIT)</span>
                  <span className="font-bold text-base text-[#173F35] dark:text-[#77A96B]">
                    {formatAmount(performance.operatingProfitEbit)} ({performance.operatingProfitMarginPct}%)
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
              <CardHeader
                title="Seuils de Rentabilité (Break-Even Point)"
                subtitle="Volumes et prix minimums requis pour couvrir l'intégralité des charges."
              />
              <div className="space-y-4 mt-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase">
                    Prix de Vente d'Équilibre
                  </span>
                  <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">
                    {formatAmount(performance.breakEvenPricePerKg)} / kg
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                    Tout prix de vente supérieur génère un bénéfice net d'exploitation.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-[#1B2B23] rounded-lg">
                    <span className="text-[10px] font-mono text-[#66736B] dark:text-[#9EB0A5] uppercase">
                      Tonnage d'Équilibre
                    </span>
                    <div className="text-base font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                      {performance.breakEvenQuantityTons} Tonnes
                    </div>
                    <span className="text-[10px] text-[#8A988F]">Volume minimal à écouler</span>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-[#1B2B23] rounded-lg">
                    <span className="text-[10px] font-mono text-[#66736B] dark:text-[#9EB0A5] uppercase">
                      Rendement Minimal
                    </span>
                    <div className="text-base font-bold text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                      {performance.breakEvenYieldTonsPerHa} T / ha
                    </div>
                    <span className="text-[10px] text-[#8A988F]">Seuil agronomique critique</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: CASH FLOW & WORKING CAPITAL */}
      {activeTab === 'cashflow' && performance && (
        <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
          <CardHeader
            title="Échéancier Prévisionnel de Trésorerie & BFR de Campagne"
            subtitle="Anticipation du déficit de trésorerie cumulé (creux de campagne) et des rentrées de paiement."
          />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F8F4] dark:bg-[#1B2B23] text-[#66736B] dark:text-[#9EB0A5] border-b border-[#E1E7E0] dark:border-[#24352C]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Période / Stade Agronomique</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Décaissements (OPEX)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Encaissements (Ventes)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Flux Net Période</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Solde Cumulé Trésorerie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                {performance.cashFlowSchedule.map((cf, idx) => (
                  <tr key={idx} className="hover:bg-[#F7F8F4] dark:hover:bg-[#1B2B23]/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-[#202924] dark:text-[#EEF4F0]">{cf.periodLabel}</td>
                    <td className="py-3 px-3 text-right text-red-600 dark:text-red-400 font-medium">
                      -{formatAmount(cf.outflowPlanned)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      +{formatAmount(cf.inflowPlanned)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      <span className={cf.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {cf.netCashFlow >= 0 ? '+' : ''}
                        {formatAmount(cf.netCashFlow)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          cf.cumulativeCashBalance < 0
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {formatAmount(cf.cumulativeCashBalance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-900 dark:text-amber-200">
                <strong>Besoin en Fonds de Roulement Maximal (Point Bas) :</strong> Le pic de trésorerie négative atteint{' '}
                <strong>{formatAmount(performance.workingCapitalRequirement)}</strong> lors des mois de préparation et semis avant les premières rentrées.
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: STRESS TEST & SCENARIOS */}
      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
            <CardHeader
              title="Comparatif des Scénarios de Rentabilité & Tests de Résilience (Stress Tests)"
              subtitle="Simulation rigoureuse des chocs de production (-20%), de prix (-15%), d'inflation (+15%) et de retards de paiement (+60j). Les simulations n'altèrent pas les écritures réelles."
            />

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F4] dark:bg-[#1B2B23] text-[#66736B] dark:text-[#9EB0A5] border-b border-[#E1E7E0] dark:border-[#24352C]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Scénario Testé</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Volume Net (T)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Prix Moyen</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Chiffre d'Affaires</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Charges OPEX</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Résultat (EBIT)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Marge %</th>
                    <th className="py-2.5 px-3 font-semibold text-right">BFR Crête</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {scenarios.map(s => {
                    const isBase = s.scenarioId === 'BASE';
                    const isOptimistic = s.scenarioId === 'OPTIMISTIC';
                    return (
                      <tr
                        key={s.scenarioId}
                        className={`hover:bg-[#F7F8F4] dark:hover:bg-[#1B2B23]/50 transition-colors ${
                          isBase ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {isBase && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {isOptimistic && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />}
                            {!isBase && !isOptimistic && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                            <span className="text-[#202924] dark:text-[#EEF4F0]">{s.scenarioName}</span>
                          </div>
                          <div className="text-[10px] text-[#8A988F] mt-0.5">{s.description}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium">{s.saleableOutputTons} T</td>
                        <td className="py-3 px-3 text-right">{formatAmount(s.averagePricePerKg)}/kg</td>
                        <td className="py-3 px-3 text-right font-semibold text-[#202924] dark:text-[#EEF4F0]">
                          {formatAmount(s.totalRevenue)}
                        </td>
                        <td className="py-3 px-3 text-right text-red-600 dark:text-red-400">
                          {formatAmount(s.totalOpex)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span className={s.operatingProfitEbit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                            {formatAmount(s.operatingProfitEbit)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-xs">
                          {s.operatingProfitMarginPct}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-400">
                          {formatAmount(s.workingCapitalPeakDeficit)}
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

      {/* TAB 5: MULTI-YEAR CAPITAL INVESTMENT DCF (NPV / IRR / PAYBACK) */}
      {activeTab === 'investment_dcf' && appraisal && (
        <div className="space-y-4">
          <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
            <CardHeader
              title={`Évaluation des Investissements Pluriannuels (DCF) — ${appraisal.projectName}`}
              subtitle="Calcul rigoureux de la Valeur Actuelle Nette (VAN), Taux de Rentabilité Interne (TRI) et Délai de Récupération."
            />

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">Valeur Actuelle Nette (VAN / NPV)</span>
                <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">
                  {formatAmount(appraisal.npv)}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {appraisal.npv > 0 ? 'Projet créateur de valeur' : 'Projet non viable'}
                </span>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-[10px] text-blue-700 dark:text-blue-400 font-mono">Taux de Rentabilité Interne (TRI / IRR)</span>
                <div className="text-xl font-bold text-blue-900 dark:text-blue-300 mt-0.5">
                  {appraisal.irrPct}%
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400">
                  vs Taux d'actualisation de {appraisal.discountRatePct}%
                </span>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-mono">Délai de Récupération Actualisé</span>
                <div className="text-xl font-bold text-purple-900 dark:text-purple-300 mt-0.5">
                  {appraisal.discountedPaybackYears} ans
                </div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400">
                  Simple : {appraisal.simplePaybackYears} ans
                </span>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">Retour sur Investissement (ROI)</span>
                <div className="text-xl font-bold text-amber-900 dark:text-amber-300 mt-0.5">
                  {appraisal.roiPct}%
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">Rendement cumulé net</span>
              </div>
            </div>

            {/* Annual Discounted Flows Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F4] dark:bg-[#1B2B23] text-[#66736B] dark:text-[#9EB0A5] border-b border-[#E1E7E0] dark:border-[#24352C]">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Année</th>
                    <th className="py-2 px-3 font-semibold text-right">Revenus Bruts</th>
                    <th className="py-2 px-3 font-semibold text-right">Charges OPEX</th>
                    <th className="py-2 px-3 font-semibold text-right">Impôts & Finance</th>
                    <th className="py-2 px-3 font-semibold text-right">Flux Net Annuel</th>
                    <th className="py-2 px-3 font-semibold text-right">Flux Actualisé</th>
                    <th className="py-2 px-3 font-semibold text-right">VAN Cumulée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  <tr className="bg-gray-50/50 dark:bg-gray-900/30">
                    <td className="py-2 px-3 font-mono font-bold">Année 0 (Investissement)</td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right font-bold text-red-600">-{formatAmount(dcfCapex)}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-600">-{formatAmount(dcfCapex)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-red-600">-{formatAmount(dcfCapex)}</td>
                  </tr>
                  {appraisal.annualCashFlows.map(cf => (
                    <tr key={cf.year} className="hover:bg-[#F7F8F4] dark:hover:bg-[#1B2B23]/50">
                      <td className="py-2 px-3 font-semibold">Année {cf.year}</td>
                      <td className="py-2 px-3 text-right">{formatAmount(cf.grossInflow)}</td>
                      <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">-{formatAmount(cf.opexOutflow)}</td>
                      <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">-{formatAmount(cf.taxAndFinancing)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{formatAmount(cf.netCashFlow)}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatAmount(cf.discountedCashFlow)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span className={cf.cumulativeDiscountedCashFlow >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                          {formatAmount(cf.cumulativeDiscountedCashFlow)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Assumptions Footnotes */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1B2B23] rounded-lg text-xs space-y-1">
              <div className="font-semibold text-[#202924] dark:text-[#EEF4F0] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#2F7D4A]" />
                Hypothèses Financières Explicites :
              </div>
              <p className="text-[#66736B] dark:text-[#9EB0A5]">
                • Taux d'actualisation WACC : <strong>{appraisal.assumptions.discountRate}</strong>
              </p>
              <p className="text-[#66736B] dark:text-[#9EB0A5]">
                • Inflation : <strong>{appraisal.assumptions.inflationRate}</strong> | Financement : <strong>{appraisal.assumptions.financingCost}</strong> | Fiscalité : <strong>{appraisal.assumptions.taxRate}</strong>
              </p>
              <p className="text-[#66736B] dark:text-[#9EB0A5] italic">
                {appraisal.assumptions.notes}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: MULTI-CURRENCY & EXCHANGE RATES */}
      {activeTab === 'currencies' && (
        <Card className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1E7E0] dark:border-[#24352C]">
            <div>
              <h2 className="text-sm font-bold text-[#202924] dark:text-[#EEF4F0]">
                Grille des Taux de Change & Références Officielles (BCRG)
              </h2>
              <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                Chaque conversion enregistre la date d'effet et la source vérifiée. L'équivalence implicite est formellement interdite.
              </p>
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => setIsRateModalOpen(true)}
              >
                Actualiser Taux BCRG
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {exchangeRates.map(r => (
              <div key={r.id} className="p-3 bg-gray-50 dark:bg-[#1B2B23] rounded-lg border border-[#CDD6CC] dark:border-[#283D33] text-xs">
                <div className="flex justify-between items-center font-bold text-[#202924] dark:text-[#EEF4F0]">
                  <span>1 {r.fromCurrency} =</span>
                  <span className="text-sm font-mono text-[#173F35] dark:text-[#77A96B]">{r.rate.toLocaleString('fr-FR')} {r.toCurrency}</span>
                </div>
                <div className="mt-2 text-[10px] text-[#66736B] dark:text-[#9EB0A5] space-y-0.5">
                  <div>Date d'effet : <strong>{r.effectiveDate}</strong></div>
                  <div className="truncate" title={r.source}>Source : {r.source}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* MODAL: ADD BUDGET LINE */}
      {isBudgetModalOpen && (
        <Modal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          title="Ajouter une Ligne Budgétaire"
        >
          <form onSubmit={handleCreateBudgetLine} className="space-y-4">
            <Input
              label="Intitulé du Poste de Dépense"
              required
              value={budgetTitle}
              onChange={e => setBudgetTitle(e.target.value)}
              placeholder="ex: Achat semences hybrides S17 certifiées"
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Catégorie Budgétaire"
                value={budgetCategory}
                onChange={e => setBudgetCategory(e.target.value as BudgetCategory)}
                options={[
                  { value: 'LAND_PREPARATION_PLANTING', label: 'Préparation du Sol & Plantation' },
                  { value: 'SEED_PLANTING_MATERIAL', label: 'Semences & Matériel Végétal' },
                  { value: 'FERTILIZERS_CROP_PROTECTION', label: 'Engrais & Protection des Cultures' },
                  { value: 'IRRIGATION_WATER', label: 'Irrigation & Carburant Motopompe' },
                  { value: 'LABOR', label: 'Main d’Œuvre & Salaires' },
                  { value: 'MACHINERY_MAINTENANCE', label: 'Machinisme & Maintenance' },
                  { value: 'HARVEST_POST_HARVEST', label: 'Récolte & Post-Récolte' },
                  { value: 'PROCESSING_EQUIPMENT_OPERATING', label: 'Usinage & Énergie de Transformation' },
                  { value: 'PACKAGING', label: 'Emballage & Conditionnement Export' },
                  { value: 'STORAGE', label: 'Stockage & Conservation' },
                  { value: 'TRANSPORT_EXPORT', label: 'Transport, Transit & Export' },
                  { value: 'MARKETING_ADMIN_FINANCE', label: 'Administration & Frais Financiers' },
                  { value: 'IRRIGATION_SYSTEM_INVESTMENT', label: 'CAPEX: Système d’Irrigation Goutte-à-goutte' },
                  { value: 'PROCESSING_UNIT_CONSTRUCTION', label: 'CAPEX: Ligne de Transformation Industrielle' }
                ]}
              />

              <Select
                label="Nature Comptable"
                value={budgetExpenseNature}
                onChange={e => setBudgetExpenseNature(e.target.value as ExpenseNature)}
                options={[
                  { value: 'OPEX', label: 'OPEX (Charges Courantes d’Exploitation)' },
                  { value: 'CAPEX', label: 'CAPEX (Investissement Immobilisé Amortissable)' }
                ]}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Budget Prévu (GNF)"
                type="number"
                min="0"
                required
                value={budgetPlanned}
                onChange={e => setBudgetPlanned(Number(e.target.value))}
              />

              <Input
                label="Montant Engagé (GNF)"
                type="number"
                min="0"
                value={budgetCommitted}
                onChange={e => setBudgetCommitted(Number(e.target.value))}
              />

              <Input
                label="Dépense Réelle (GNF)"
                type="number"
                min="0"
                value={budgetActual}
                onChange={e => setBudgetActual(Number(e.target.value))}
              />
            </div>

            <Input
              label="Notes & Justificatifs"
              value={budgetNotes}
              onChange={e => setBudgetNotes(e.target.value)}
              placeholder="ex: Contrat de prestation avec le groupement des tractoristes"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsBudgetModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Enregistrer la Ligne
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: UPDATE EXCHANGE RATE */}
      {isRateModalOpen && (
        <Modal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
          title="Actualiser Taux de Change Officiel (BCRG)"
        >
          <form onSubmit={handleSaveRate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Devise Source"
                value={fromCurr}
                onChange={e => setFromCurr(e.target.value as any)}
                options={[
                  { value: 'EUR', label: 'EUR (Euro)' },
                  { value: 'USD', label: 'USD (Dollar Américain)' },
                  { value: 'XOF', label: 'XOF (Franc CFA)' }
                ]}
              />

              <Input
                label={`Valeur en GNF (pour 1 ${fromCurr})`}
                type="number"
                min="0"
                step="0.01"
                required
                value={rateVal}
                onChange={e => setRateVal(Number(e.target.value))}
              />
            </div>

            <Input
              label="Source Officielle de Référence"
              required
              value={rateSource}
              onChange={e => setRateSource(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsRateModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Valider le Taux
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
