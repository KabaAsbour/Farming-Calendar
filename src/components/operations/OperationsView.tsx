import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Warehouse,
  Package,
  ShieldCheck,
  Layers,
  Filter,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Scale,
  Thermometer,
  Microscope,
  History,
  TrendingUp,
  MapPin,
  Calendar,
  User,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  AlertOctagon
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge, StatusDot } from '../ui/Badge.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input } from '../ui/Input.tsx';
import { AuthSession } from '../../types/organization.ts';
import {
  InventoryItemMaster,
  StockMovementRecord,
  ProcessingRecipeMaster,
  ProcessingBatchMaster,
  QualityInspectionRecord,
  BatchRecallTraceResult,
  StockMovementType,
  StockCategory
} from '../../types/operations.ts';
import { OperationsService } from '../../services/client-api.ts';

interface OperationsViewProps {
  session: AuthSession;
}

export function OperationsView({ session }: OperationsViewProps) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language.startsWith('fr');

  const [activeTab, setActiveTab] = useState<'inventory' | 'processing' | 'quality' | 'traceability'>('inventory');

  // Live state from service
  const [inventoryItems, setInventoryItems] = useState<InventoryItemMaster[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>([]);
  const [recipes, setRecipes] = useState<ProcessingRecipeMaster[]>([]);
  const [batches, setBatches] = useState<ProcessingBatchMaster[]>([]);
  const [inspections, setInspections] = useState<QualityInspectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState<boolean>(false);

  // Form states: New stock movement
  const [movementItemId, setMovementItemId] = useState<string>('');
  const [movementType, setMovementType] = useState<StockMovementType>('RECEIVING');
  const [movementQty, setMovementQty] = useState<number>(100);
  const [movementBatchNumber, setMovementBatchNumber] = useState<string>('LOT-MAN-2026');
  const [movementDestination, setMovementDestination] = useState<string>('Magasin Central Friguiagbé');
  const [movementReason, setMovementReason] = useState<string>('Approvisionnement récolte');

  // Form states: New batch
  const [batchRecipeId, setBatchRecipeId] = useState<string>('');
  const [batchNumberInput, setBatchNumberInput] = useState<string>(`PRC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [batchInputQty, setBatchInputQty] = useState<number>(1000);
  const [batchFacility, setBatchFacility] = useState<string>('Station de Séchage et Usinage Friguiagbé');

  // Form states: New inspection
  const [inspectBatchNumber, setInspectBatchNumber] = useState<string>('PRC-2026-S17-001');
  const [inspectProductName, setInspectProductName] = useState<string>('Piment S17 Habanero Séché');
  const [inspectMoisture, setInspectMoisture] = useState<number>(10.0);
  const [inspectDefects, setInspectDefects] = useState<number>(1.0);
  const [inspectForeignMatter, setInspectForeignMatter] = useState<number>(0.2);
  const [inspectDecision, setInspectDecision] = useState<'ACCEPTED_GRADE_A' | 'ACCEPTED_GRADE_B' | 'REJECTED'>('ACCEPTED_GRADE_A');
  const [inspectRejectionReason, setInspectRejectionReason] = useState<string>('');

  // Traceability Recall Query
  const [recallQueryBatch, setRecallQueryBatch] = useState<string>('PRC-2026-S17-001');
  const [recallResult, setRecallResult] = useState<BatchRecallTraceResult | null>(null);
  const [recallLoading, setRecallLoading] = useState<boolean>(false);
  const [dispatchCheckResult, setDispatchCheckResult] = useState<{ isAllowed: boolean; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [items, movs, recs, bts, insps] = await Promise.all([
        OperationsService.listInventoryItems(session),
        OperationsService.listStockMovements(session),
        OperationsService.listProcessingRecipes(session),
        OperationsService.listProcessingBatches(session),
        OperationsService.listQualityInspections(session)
      ]);
      setInventoryItems(items);
      setStockMovements(movs);
      setRecipes(recs);
      setBatches(bts);
      setInspections(insps);
      if (items.length > 0 && !movementItemId) {
        setMovementItemId(items[0].id);
      }
      if (recs.length > 0 && !batchRecipeId) {
        setBatchRecipeId(recs[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du chargement des opérations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await OperationsService.recordStockMovement(session, {
        inventoryItemId: movementItemId,
        batchNumber: movementBatchNumber,
        movementType,
        quantity: Number(movementQty),
        locationDestination: movementDestination,
        reason: movementReason
      });
      setSuccessMsg(
        isFr
          ? `Mouvement enregistré avec succès (${res.movement.movementType}: ${res.movement.quantity} ${res.movement.unit}).`
          : `Stock movement recorded successfully (${res.movement.movementType}: ${res.movement.quantity} ${res.movement.unit}).`
      );
      setIsMovementModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement du mouvement.');
    }
  };

  const handleStartBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const selectedRecipe = recipes.find(r => r.id === batchRecipeId) || recipes[0];
      const res = await OperationsService.startProcessingBatch(session, {
        batchNumber: batchNumberInput,
        recipeId: selectedRecipe?.id,
        recipeName: selectedRecipe?.name || 'Usinage Standard',
        inputRawMaterialName: selectedRecipe?.standardInputUnit ? `${selectedRecipe.name} (Matière)` : 'Piment Frais',
        inputQuantity: Number(batchInputQty),
        inputUnit: selectedRecipe?.standardInputUnit || 'KG',
        expectedOutputQuantity: Number(batchInputQty) * ((selectedRecipe?.expectedConversionYieldPct || 24) / 100),
        expectedOutputUnit: selectedRecipe?.expectedOutputUnit || 'KG',
        facilityLocation: batchFacility
      });
      setSuccessMsg(
        isFr
          ? `Lot d'usinage ${res.batchNumber} initié avec succès.`
          : `Processing batch ${res.batchNumber} initiated successfully.`
      );
      setIsBatchModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du démarrage du lot.');
    }
  };

  const handleRecordInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await OperationsService.recordQualityInspection(session, {
        batchNumber: inspectBatchNumber,
        productName: inspectProductName,
        inspectorName: session.user.fullName || 'Auditeur Qualité Agréé',
        inspectorAccreditation: 'ONPQ Guinée — Inspection Phytosanitaire',
        sampleSizeTaken: '3 kg prélevés sur 10 cartons',
        moisturePct: Number(inspectMoisture),
        maxPermissibleMoisturePct: 11.0,
        defectsRatePct: Number(inspectDefects),
        maxPermissibleDefectsPct: 2.0,
        foreignMatterPct: Number(inspectForeignMatter),
        maxPermissibleForeignMatterPct: 0.5,
        chemicalResiduesCompliant: inspectDecision !== 'REJECTED',
        pesticideMRLCompliant: inspectDecision !== 'REJECTED',
        releaseStatus: inspectDecision,
        nonConformanceReason: inspectDecision === 'REJECTED' ? inspectRejectionReason : undefined,
        correctiveActionPlan: inspectDecision === 'REJECTED' ? 'Destruction sous contrôle ou séquestre douanier.' : undefined,
        officialCertificateNumber: inspectDecision === 'ACCEPTED_GRADE_A' ? `CERT-ONPQ-GN-${Math.floor(1000 + Math.random() * 9000)}` : undefined
      });
      setSuccessMsg(
        isFr
          ? `Inspection ${res.inspectionNumber} enregistrée avec le statut: ${res.releaseStatus}.`
          : `Inspection ${res.inspectionNumber} recorded with status: ${res.releaseStatus}.`
      );
      setIsInspectionModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement de l’inspection.');
    }
  };

  const handleExecuteRecallTrace = async (batchNum: string) => {
    setRecallLoading(true);
    setDispatchCheckResult(null);
    try {
      const trace = await OperationsService.traceBatchRecall(session, batchNum);
      setRecallResult(trace);

      // Also check dispatch gating
      try {
        await OperationsService.validateBatchForDispatch(session, batchNum);
        setDispatchCheckResult({
          isAllowed: true,
          message: isFr
            ? 'AUTORISÉ : Lot conforme aux spécifications qualité. Éligible pour chargement et expédition export.'
            : 'AUTHORIZED: Batch conforms to quality specifications. Eligible for dispatch.'
        });
      } catch (gateErr: any) {
        setDispatchCheckResult({
          isAllowed: false,
          message: gateErr.message
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du traçage du lot.');
    } finally {
      setRecallLoading(false);
    }
  };

  const filteredItems = inventoryItems.filter(item => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.warehouseLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#173F35] dark:text-[#E8F0EC]">
              {isFr ? 'Opérations, Usinage, Stocks & Traçabilité' : 'Operations, Processing, Inventory & Traceability'}
            </h1>
            <Badge variant="forest" size="sm">Phase 6</Badge>
          </div>
          <p className="text-xs text-[#526359] dark:text-[#9EB0A5] mt-1">
            {isFr
              ? 'Gestion des stocks avec mouvements auditables, rendement de transformation, contrôle qualité ONPQ et rappel de lot.'
              : 'Auditable stock control, processing conversion yields, accredited quality inspections, and recall tracing.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            {isFr ? 'Actualiser' : 'Refresh'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMovementModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {isFr ? 'Mouvement Stock' : 'Stock Movement'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBatchModalOpen(true)}
            icon={<Layers className="w-3.5 h-3.5" />}
          >
            {isFr ? 'Nouvel Usinage' : 'Start Batch'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsInspectionModalOpen(true)}
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
          >
            {isFr ? 'Contrôle Qualité' : 'Quality Inspection'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1 font-medium">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="font-bold">&times;</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1 font-medium">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="sm">
          <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase font-semibold">
            {isFr ? 'Articles Référencés' : 'Inventory Items'}
          </div>
          <div className="text-xl font-bold text-[#173F35] dark:text-[#E8F0EC] mt-1">
            {inventoryItems.length}
          </div>
          <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
            {inventoryItems.reduce((acc, i) => acc + (i.quantityOnHand || 0), 0).toLocaleString()} kg {isFr ? 'en stock physique' : 'on hand'}
          </div>
        </Card>

        <Card padding="sm">
          <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase font-semibold">
            {isFr ? 'Stock Disponible' : 'Available Stock'}
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {inventoryItems.reduce((acc, i) => acc + (i.quantityAvailable || 0), 0).toLocaleString()} <span className="text-xs font-normal">kg</span>
          </div>
          <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
            {inventoryItems.reduce((acc, i) => acc + (i.quantityReserved || 0), 0).toLocaleString()} kg {isFr ? 'réservés fermes' : 'reserved'}
          </div>
        </Card>

        <Card padding="sm">
          <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase font-semibold">
            {isFr ? 'Lots d’Usinage Actifs' : 'Active Processing Batches'}
          </div>
          <div className="text-xl font-bold text-[#173F35] dark:text-[#E8F0EC] mt-1">
            {batches.filter(b => b.status === 'IN_PROGRESS').length} / {batches.length}
          </div>
          <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
            {batches.filter(b => b.status === 'COMPLETED').length} {isFr ? 'lots achevés' : 'completed'}
          </div>
        </Card>

        <Card padding="sm">
          <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase font-semibold">
            {isFr ? 'Contrôles Qualité' : 'Quality Inspections'}
          </div>
          <div className="text-xl font-bold text-[#173F35] dark:text-[#E8F0EC] mt-1">
            {inspections.length}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
            {inspections.filter(q => q.releaseStatus === 'REJECTED').length} {isFr ? 'rejetés (expédition bloquée)' : 'rejected (blocked)'}
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E1E7E0] dark:border-[#24352C] gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'border-[#173F35] text-[#173F35] dark:border-[#52C582] dark:text-[#52C582] font-semibold'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          {isFr ? '1. Inventaire & Mouvements' : '1. Inventory & Ledger'}
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E1E7E0] dark:bg-[#24352C]">
            {inventoryItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('processing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'processing'
              ? 'border-[#173F35] text-[#173F35] dark:border-[#52C582] dark:text-[#52C582] font-semibold'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {isFr ? '2. Lignes d’Usinage & Recettes' : '2. Processing & Recipes'}
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E1E7E0] dark:bg-[#24352C]">
            {batches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'quality'
              ? 'border-[#173F35] text-[#173F35] dark:border-[#52C582] dark:text-[#52C582] font-semibold'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {isFr ? '3. Contrôles Qualité & Agréments' : '3. Quality Inspections'}
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E1E7E0] dark:bg-[#24352C]">
            {inspections.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('traceability');
            if (!recallResult) handleExecuteRecallTrace(recallQueryBatch);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'traceability'
              ? 'border-[#173F35] text-[#173F35] dark:border-[#52C582] dark:text-[#52C582] font-semibold'
              : 'border-transparent text-[#66736B] dark:text-[#9EB0A5] hover:text-[#202924]'
          }`}
        >
          <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          {isFr ? '4. Rappel de Lot & Traçabilité (Recall)' : '4. Recall & Traceability'}
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
            Explorer
          </span>
        </button>
      </div>

      {/* TAB 1: INVENTORY & STOCK MOVEMENTS */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#F7F8F4] dark:bg-[#18261F] p-3 rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8A988F]" />
              <input
                type="text"
                placeholder={isFr ? "Rechercher par article, SKU, magasin..." : "Search items, SKU, warehouse..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#173F35]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#66736B] dark:text-[#9EB0A5] whitespace-nowrap font-medium">Catégorie:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg px-2.5 py-1.5"
              >
                <option value="ALL">{isFr ? 'Toutes les catégories' : 'All Categories'}</option>
                <option value="RAW_AGRICULTURAL_PRODUCE">{isFr ? 'Matières Premières Agricoles' : 'Raw Agricultural Produce'}</option>
                <option value="FINISHED_PRODUCT">{isFr ? 'Produits Finis Transformés' : 'Finished Products'}</option>
                <option value="PACKAGING_MATERIAL">{isFr ? 'Emballage & Conditionnement' : 'Packaging Materials'}</option>
                <option value="AGRICULTURAL_INPUT">{isFr ? 'Intrants & Fertilisants' : 'Agricultural Inputs'}</option>
                <option value="WORK_IN_PROGRESS">{isFr ? 'En Cours d’Usinage (WIP)' : 'Work in Progress'}</option>
              </select>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F8F4] dark:bg-[#18261F] border-b border-[#E1E7E0] dark:border-[#24352C] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px]">
                  <th className="py-3 px-4 font-semibold">{isFr ? 'Article & SKU' : 'Item & SKU'}</th>
                  <th className="py-3 px-3 font-semibold">{isFr ? 'Catégorie' : 'Category'}</th>
                  <th className="py-3 px-3 font-semibold">{isFr ? 'En Stock (Physique)' : 'On Hand'}</th>
                  <th className="py-3 px-3 font-semibold">{isFr ? 'Réservé' : 'Reserved'}</th>
                  <th className="py-3 px-3 font-semibold">{isFr ? 'Quarantaine' : 'Quarantine'}</th>
                  <th className="py-3 px-3 font-semibold text-emerald-800 dark:text-emerald-400">{isFr ? 'Disponible Réel' : 'Net Available'}</th>
                  <th className="py-3 px-3 font-semibold">{isFr ? 'Emplacement' : 'Location'}</th>
                  <th className="py-3 px-3 font-semibold">{isFr ? 'Dernier Lot' : 'Latest Batch'}</th>
                  <th className="py-3 px-4 font-semibold text-right">{isFr ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-[#F7F8F4]/50 dark:hover:bg-[#18261F]/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#202924] dark:text-[#EEF4F0]">{item.name}</div>
                      <div className="text-[10px] text-[#8A988F] font-mono">{item.sku}</div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="neutral" size="xs">
                        {item.category.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-[#202924] dark:text-[#EEF4F0]">
                      {item.quantityOnHand.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-700 dark:text-amber-400">
                      {item.quantityReserved.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-700 dark:text-rose-400">
                      {item.quantityQuarantined > 0 ? (
                        <span className="font-bold underline">{item.quantityQuarantined.toLocaleString()} {item.unit}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {item.quantityAvailable.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-[#526359] dark:text-[#9EB0A5] text-[11px]">
                      {item.warehouseLocation}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#173F35] dark:text-[#52C582]">
                      {item.latestBatchNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setMovementItemId(item.id);
                          setIsMovementModalOpen(true);
                        }}
                      >
                        {isFr ? 'Mouvement' : 'Transfer'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Movements Ledger */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#173F35] dark:text-[#E8F0EC] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                {isFr ? 'Journal d’Audit Immuable des Mouvements' : 'Immutable Movement Audit Log'}
              </h3>
              <span className="text-[11px] text-[#8A988F] font-mono">
                {stockMovements.length} {isFr ? 'enregistrements certifiés' : 'certified entries'}
              </span>
            </div>

            <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F8F4] dark:bg-[#18261F] border-b border-[#E1E7E0] dark:border-[#24352C] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">Date & Réf</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Lot</th>
                    <th className="py-2.5 px-3 font-semibold">Quantité</th>
                    <th className="py-2.5 px-3 font-semibold">Destination</th>
                    <th className="py-2.5 px-3 font-semibold">Opérateur</th>
                    <th className="py-2.5 px-3 font-semibold">Motif Auditable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {stockMovements.slice(-8).reverse().map(m => (
                    <tr key={m.id} className="hover:bg-[#F7F8F4]/50 dark:hover:bg-[#18261F]/30 text-[11px]">
                      <td className="py-2 px-3 font-mono text-[#8A988F]">
                        {new Date(m.movementDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={
                            m.movementType === 'RECEIVING' ? 'forest' :
                            m.movementType === 'RESERVATION' ? 'warning' :
                            m.movementType === 'TRANSFER' ? 'neutral' : 'error'
                          }
                          size="xs"
                        >
                          {m.movementType}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-[#173F35] dark:text-[#52C582]">
                        {m.batchNumber}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-[#202924] dark:text-[#EEF4F0]">
                        {m.quantity.toLocaleString()} {m.unit}
                      </td>
                      <td className="py-2 px-3 text-[#526359] dark:text-[#9EB0A5]">
                        {m.locationDestination}
                      </td>
                      <td className="py-2 px-3 text-[#526359] dark:text-[#9EB0A5]">
                        {m.responsibleUserName}
                      </td>
                      <td className="py-2 px-3 text-[#202924] dark:text-[#EEF4F0]">
                        {m.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROCESSING & RECIPES */}
      {activeTab === 'processing' && (
        <div className="space-y-6">
          {/* Active Batches Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#173F35] dark:text-[#E8F0EC] flex items-center justify-between">
              <span>{isFr ? 'Lots d’Usinage en Cours & Historique' : 'Processing Batches'}</span>
              <Button size="xs" variant="primary" onClick={() => setIsBatchModalOpen(true)}>
                {isFr ? '+ Lancer un Lot' : '+ New Batch'}
              </Button>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {batches.map(batch => (
                <Card key={batch.id} padding="md">
                  <div className="flex items-start justify-between pb-3 border-b border-[#E1E7E0] dark:border-[#24352C]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">
                          {batch.batchNumber}
                        </h4>
                        <Badge
                          variant={batch.status === 'COMPLETED' ? 'forest' : batch.status === 'IN_PROGRESS' ? 'warning' : 'error'}
                          size="xs"
                        >
                          {batch.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-[#526359] dark:text-[#9EB0A5] mt-0.5">
                        {batch.recipeName}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#8A988F] font-mono block">Rendement de Conversion</span>
                      <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {batch.status === 'COMPLETED' ? `${batch.actualConversionYieldPct}%` : `Prévu ${batch.expectedConversionYieldPct}%`}
                      </span>
                    </div>
                  </div>

                  {/* Batch Flow & Metrics */}
                  <div className="grid grid-cols-3 gap-2 my-3 text-xs bg-[#F7F8F4] dark:bg-[#18261F] p-2.5 rounded-lg">
                    <div>
                      <span className="text-[10px] text-[#8A988F] block font-mono">Entrée Matière</span>
                      <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">
                        {batch.inputQuantity.toLocaleString()} {batch.inputUnit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block font-mono">Sortie Produit</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {batch.outputQuantity > 0 ? `${batch.outputQuantity.toLocaleString()} ${batch.outputUnit}` : 'En cours...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block font-mono">Pertes / Déchets</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400">
                        {batch.lossesQuantity.toLocaleString()} kg
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#526359] dark:text-[#9EB0A5] pt-1">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-[#8A988F]" />
                      {batch.facilityLocation}
                    </span>
                    <span className="font-mono text-[11px]">
                      Coût Unitaire: <strong className="text-[#202924] dark:text-[#EEF4F0]">{batch.unitProductionCostGNF.toLocaleString()} GNF/{batch.outputUnit}</strong>
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Recipes Catalog */}
          <div className="space-y-3 pt-4 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <h3 className="text-sm font-bold text-[#173F35] dark:text-[#E8F0EC]">
              {isFr ? 'Catalogue des Protocoles & Recettes de Transformation' : 'Processing Recipes Catalog'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map(recipe => (
                <Card key={recipe.id} padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-[#8A988F] font-mono">{recipe.code}</span>
                      <h4 className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                        {recipe.name}
                      </h4>
                    </div>
                    <Badge variant={recipe.isLocallyValidated ? 'forest' : 'neutral'} size="xs">
                      {recipe.isLocallyValidated ? (isFr ? 'Validé Localement' : 'Locally Validated') : (isFr ? 'Essai R&D' : 'R&D Trial')}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#526359] dark:text-[#9EB0A5] mt-2">
                    {recipe.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 my-3 text-xs bg-[#F7F8F4] dark:bg-[#18261F] p-2 rounded-lg">
                    <div>
                      <span className="text-[10px] text-[#8A988F] block font-mono">Rendement Théorique</span>
                      <span className="font-bold text-[#173F35] dark:text-[#52C582]">{recipe.expectedConversionYieldPct}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block font-mono">Durée Process</span>
                      <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">{recipe.estimatedDurationHours} h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block font-mono">Main d'œuvre</span>
                      <span className="font-bold text-[#202924] dark:text-[#EEF4F0]">{recipe.laborHoursRequired} h.mo</span>
                    </div>
                  </div>

                  {recipe.stages && recipe.stages.length > 0 && (
                    <div className="mt-2 text-[11px] text-[#66736B] dark:text-[#9EB0A5]">
                      <span className="font-semibold block mb-1">Étapes:</span>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        {recipe.stages.map((stg, i) => (
                          <li key={i}>{stg}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {recipe.localValidationSource && (
                    <div className="mt-3 text-[10px] text-[#8A988F] italic border-t border-[#E1E7E0] dark:border-[#24352C] pt-2">
                      Source de validation: {recipe.localValidationSource}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUALITY & CERTIFICATIONS */}
      {activeTab === 'quality' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#173F35] dark:text-[#E8F0EC]">
                {isFr ? 'Contrôles Phytosanitaires & Décisions de Libération' : 'Official Quality & Phytosanitary Release'}
              </h3>
              <p className="text-xs text-[#526359] dark:text-[#9EB0A5]">
                {isFr
                  ? 'Exigences strictes : Tout lot rejeté est systématiquement exclu des affectations commandes et expéditions.'
                  : 'Enforced policy: Any rejected batch is strictly blocked from order dispatch and export shipments.'}
              </p>
            </div>
            <Button size="xs" variant="primary" onClick={() => setIsInspectionModalOpen(true)}>
              {isFr ? '+ Nouvelle Inspection' : '+ New Inspection'}
            </Button>
          </div>

          <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F8F4] dark:bg-[#18261F] border-b border-[#E1E7E0] dark:border-[#24352C] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px]">
                  <th className="py-3 px-4 font-semibold">N° Contrôle & Date</th>
                  <th className="py-3 px-3 font-semibold">Lot & Produit</th>
                  <th className="py-3 px-3 font-semibold">Humidité (Max 11%)</th>
                  <th className="py-3 px-3 font-semibold">Défauts & Matière</th>
                  <th className="py-3 px-3 font-semibold">Inspecteur / Accréditation</th>
                  <th className="py-3 px-3 font-semibold">Certificat Officiel</th>
                  <th className="py-3 px-4 font-semibold text-right">Statut & Décision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                {inspections.map((qc) => (
                  <tr key={qc.id} className="hover:bg-[#F7F8F4]/50 dark:hover:bg-[#18261F]/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#202924] dark:text-[#EEF4F0]">
                      {qc.inspectionNumber}
                      <span className="text-[10px] text-[#8A988F] block font-normal">
                        {new Date(qc.inspectionDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#202924] dark:text-[#EEF4F0]">{qc.productName}</div>
                      <div className="text-[10px] text-[#8A988F] font-mono">{qc.batchNumber}</div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className={qc.moisturePct && qc.moisturePct > (qc.maxPermissibleMoisturePct || 11) ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                        {qc.moisturePct}%
                      </span>
                      <span className="text-[10px] text-[#8A988F] block">Max: {qc.maxPermissibleMoisturePct || 11}%</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <div>Défauts: {qc.defectsRatePct}%</div>
                      <div className="text-[10px] text-[#8A988F]">M. Étrangère: {qc.foreignMatterPct}%</div>
                    </td>
                    <td className="py-3 px-3 text-[#66736B] dark:text-[#9EB0A5] text-[11px]">
                      <div className="font-medium text-[#202924] dark:text-[#EEF4F0]">{qc.inspectorName}</div>
                      <div className="text-[10px] text-[#8A988F]">{qc.inspectorAccreditation}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {qc.officialCertificateNumber ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">{qc.officialCertificateNumber}</span>
                      ) : (
                        <span className="text-[#8A988F] italic">Non certifié</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {qc.releaseStatus === 'ACCEPTED_GRADE_A' ? (
                        <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                          LIBÉRÉ GRADE A
                        </span>
                      ) : qc.releaseStatus === 'REJECTED' ? (
                        <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                          REJETÉ (BLOQUÉ)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                          {qc.releaseStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RECALL & END-TO-END TRACEABILITY EXPLORER */}
      {activeTab === 'traceability' && (
        <div className="space-y-6">
          {/* Query Bar */}
          <div className="bg-[#F7F8F4] dark:bg-[#18261F] p-4 rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
            <h3 className="text-sm font-bold text-[#173F35] dark:text-[#E8F0EC] mb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              {isFr ? 'Moteur d’Audit & Rappel de Lot (End-to-End Recall)' : 'End-to-End Recall Traceability Explorer'}
            </h3>
            <p className="text-xs text-[#526359] dark:text-[#9EB0A5] mb-3">
              {isFr
                ? 'Saisissez un numéro de lot pour remonter toute la chaîne de garde : de la parcelle agricole jusqu’aux commandes acheteurs expédiées.'
                : 'Enter a batch identifier to trace the complete chain of custody from farm plots to delivered customer orders.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                value={recallQueryBatch}
                onChange={(e) => setRecallQueryBatch(e.target.value)}
                placeholder="ex. PRC-2026-S17-001, PRC-2026-S17-REJ, HARV-PIM-2026-001"
                className="flex-1 text-xs font-mono bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg px-3 py-2"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleExecuteRecallTrace(recallQueryBatch)}
                disabled={recallLoading || !recallQueryBatch}
                icon={<Search className="w-3.5 h-3.5" />}
              >
                {recallLoading ? (isFr ? 'Traçage en cours...' : 'Tracing...') : (isFr ? 'Auditer le Lot' : 'Trace Batch')}
              </Button>
            </div>

            <div className="flex gap-2 mt-2">
              <span className="text-[10px] text-[#8A988F]">Exemples rapides:</span>
              <button
                onClick={() => { setRecallQueryBatch('PRC-2026-S17-001'); handleExecuteRecallTrace('PRC-2026-S17-001'); }}
                className="text-[10px] text-[#173F35] dark:text-[#52C582] underline font-mono"
              >
                PRC-2026-S17-001 (Conforme)
              </button>
              <button
                onClick={() => { setRecallQueryBatch('PRC-2026-S17-REJ'); handleExecuteRecallTrace('PRC-2026-S17-REJ'); }}
                className="text-[10px] text-rose-600 dark:text-rose-400 underline font-mono"
              >
                PRC-2026-S17-REJ (Rejeté)
              </button>
            </div>
          </div>

          {/* Dispatch Gating Status Banner */}
          {dispatchCheckResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                dispatchCheckResult.isAllowed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              {dispatchCheckResult.isAllowed ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertOctagon className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-xs uppercase tracking-wider">
                  {dispatchCheckResult.isAllowed
                    ? (isFr ? 'Éligibilité Dispatch Validée' : 'Dispatch Eligibility Validated')
                    : (isFr ? 'BLOCAGE SÉCURITÉ & QUALITÉ : EXPÉDITION INTERDITE' : 'QUALITY DISPATCH BLOCKED')}
                </div>
                <div className="text-xs mt-1 font-medium leading-relaxed">
                  {dispatchCheckResult.message}
                </div>
              </div>
            </div>
          )}

          {/* Recall Visual Pipeline */}
          {recallResult && (
            <div className="space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#66736B] dark:text-[#9EB0A5] font-semibold">
                {isFr ? 'Chaîne de Custodie & Traçabilité Traversée' : 'Traversed Chain of Custody'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Stage 1: Farm & Plot */}
                <Card padding="md">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E1E7E0] dark:border-[#24352C]">
                    <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0]">1. Exploitation & Parcelle</span>
                  </div>
                  <div className="text-xs mt-3 space-y-1.5">
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Ferme:</span>
                      <strong className="text-[#202924] dark:text-[#EEF4F0]">{recallResult.farm.name || 'Kindia'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Région:</span>
                      <span>{recallResult.farm.region || 'Basse-Guinée'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Campagne:</span>
                      <span className="font-mono text-[11px] text-[#173F35] dark:text-[#52C582]">{recallResult.campaign.name}</span>
                    </div>
                  </div>
                </Card>

                {/* Stage 2: Harvest */}
                <Card padding="md">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E1E7E0] dark:border-[#24352C]">
                    <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0]">2. Récolte Plein Champ</span>
                  </div>
                  <div className="text-xs mt-3 space-y-1.5">
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Lot de Récolte:</span>
                      <strong className="font-mono text-emerald-700 dark:text-emerald-400">{recallResult.harvest.batchNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Date de Récolte:</span>
                      <span>{recallResult.harvest.harvestDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Volume Récolté:</span>
                      <span className="font-bold">{recallResult.harvest.quantityHarvested} Tonnes</span>
                    </div>
                  </div>
                </Card>

                {/* Stage 3: Processing & Quality */}
                <Card padding="md">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E1E7E0] dark:border-[#24352C]">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0]">3. Usinage & Contrôle</span>
                  </div>
                  <div className="text-xs mt-3 space-y-1.5">
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Lot Usiné:</span>
                      <strong className="font-mono text-[#202924] dark:text-[#EEF4F0]">
                        {recallResult.processingBatch?.batchNumber || 'Non transformé'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Statut Qualité:</span>
                      <Badge
                        variant={
                          recallResult.qualityInspection?.releaseStatus === 'ACCEPTED_GRADE_A' ? 'forest' :
                          recallResult.qualityInspection?.releaseStatus === 'REJECTED' ? 'error' : 'warning'
                        }
                        size="xs"
                      >
                        {recallResult.qualityInspection?.releaseStatus || 'EN ATTENTE'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8A988F] block">Certificat Phytosanitaire:</span>
                      <span className="font-mono text-[11px] text-[#173F35] dark:text-[#52C582]">
                        {recallResult.qualityInspection?.certificateNumber || 'Aucun'}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Stage 4: Customer Order Dispatch */}
                <Card padding="md">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E1E7E0] dark:border-[#24352C]">
                    <ShoppingBag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0]">4. Commandes Liées</span>
                  </div>
                  <div className="text-xs mt-3 space-y-1.5">
                    {recallResult.customerOrders && recallResult.customerOrders.length > 0 ? (
                      recallResult.customerOrders.map((ord, idx) => (
                        <div key={idx} className="p-2 bg-[#F7F8F4] dark:bg-[#18261F] rounded border border-[#E1E7E0] dark:border-[#24352C]">
                          <strong className="block text-[#202924] dark:text-[#EEF4F0]">{ord.buyerName}</strong>
                          <span className="text-[10px] font-mono text-[#8A988F]">{ord.orderNumber} &bull; {ord.status}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[#8A988F] italic">Aucune commande rattachée</span>
                    )}
                  </div>
                </Card>
              </div>

              {/* Movement Trail Details */}
              {recallResult.stockMovements && recallResult.stockMovements.length > 0 && (
                <div className="bg-white dark:bg-[#14201A] p-4 rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
                  <h5 className="font-bold text-xs text-[#173F35] dark:text-[#E8F0EC] mb-2">
                    Traçabilité des Transferts Physiques Associés ({recallResult.stockMovements.length})
                  </h5>
                  <div className="space-y-1 text-xs">
                    {recallResult.stockMovements.map((sm, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-[#E1E7E0] dark:border-[#24352C] last:border-none">
                        <span className="font-mono text-[#8A988F]">{new Date(sm.date).toLocaleDateString()}</span>
                        <Badge size="xs" variant="neutral">{sm.movementType}</Badge>
                        <span className="font-bold font-mono">{sm.quantity.toLocaleString()} {sm.unit}</span>
                        <span className="text-[#526359] dark:text-[#9EB0A5]">&rarr; {sm.destination}</span>
                        <span className="text-[#8A988F] text-[10px]">{sm.responsible}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: NEW STOCK MOVEMENT */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={isFr ? "Enregistrer un Mouvement de Stock Auditable" : "Record Auditable Stock Movement"}
      >
        <form onSubmit={handleRecordMovement} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
              {isFr ? 'Article' : 'Inventory Item'}
            </label>
            <select
              value={movementItemId}
              onChange={(e) => setMovementItemId(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
              required
            >
              {inventoryItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) — Dispo: {item.quantityAvailable} {item.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                {isFr ? 'Type de Mouvement' : 'Movement Type'}
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as StockMovementType)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
              >
                <option value="RECEIVING">RECEIVING (Entrée Récolte / Achat)</option>
                <option value="ISSUING">ISSUING (Sortie Usinage / Consommation)</option>
                <option value="RESERVATION">RESERVATION (Réservation Commande)</option>
                <option value="RELEASE">RELEASE (Libération Réservation)</option>
                <option value="TRANSFER">TRANSFER (Transfert / Quarantaine)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Ajustement Inventaire)</option>
                <option value="SPOILAGE">SPOILAGE (Perte / Avarie)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                {isFr ? 'Quantité' : 'Quantity'}
              </label>
              <input
                type="number"
                min="1"
                value={movementQty}
                onChange={(e) => setMovementQty(Number(e.target.value))}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                {isFr ? 'Numéro de Lot' : 'Batch Number'}
              </label>
              <input
                type="text"
                value={movementBatchNumber}
                onChange={(e) => setMovementBatchNumber(e.target.value)}
                className="w-full text-xs font-mono bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                {isFr ? 'Destination / Hangar' : 'Destination Location'}
              </label>
              <input
                type="text"
                value={movementDestination}
                onChange={(e) => setMovementDestination(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
              {isFr ? 'Motif Auditable Obligatoire' : 'Auditable Reason'}
            </label>
            <input
              type="text"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              placeholder="ex. Réception récolte parcelle P-01"
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsMovementModalOpen(false)}>
              {isFr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isFr ? 'Valider le Mouvement' : 'Confirm Movement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: START BATCH */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={isFr ? "Lancer un Nouveau Lot d’Usinage" : "Start New Processing Batch"}
      >
        <form onSubmit={handleStartBatch} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
              {isFr ? 'Protocole de Transformation' : 'Recipe Protocol'}
            </label>
            <select
              value={batchRecipeId}
              onChange={(e) => setBatchRecipeId(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
              required
            >
              {recipes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} (Rendement: {r.expectedConversionYieldPct}%)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                {isFr ? 'Numéro de Lot Produit' : 'Batch Code'}
              </label>
              <input
                type="text"
                value={batchNumberInput}
                onChange={(e) => setBatchNumberInput(e.target.value)}
                className="w-full text-xs font-mono bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                {isFr ? 'Quantité Matière Entrée (KG)' : 'Input Quantity (KG)'}
              </label>
              <input
                type="number"
                min="10"
                value={batchInputQty}
                onChange={(e) => setBatchInputQty(Number(e.target.value))}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
              {isFr ? 'Station / Lieu de Traitement' : 'Facility Location'}
            </label>
            <input
              type="text"
              value={batchFacility}
              onChange={(e) => setBatchFacility(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsBatchModalOpen(false)}>
              {isFr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isFr ? 'Lancer la Production' : 'Start Batch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: QUALITY INSPECTION */}
      <Modal
        isOpen={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        title={isFr ? "Enregistrer un Contrôle Qualité ONPQ" : "Record Quality Inspection"}
      >
        <form onSubmit={handleRecordInspection} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                {isFr ? 'Numéro de Lot Contrôlé' : 'Inspected Batch'}
              </label>
              <input
                type="text"
                value={inspectBatchNumber}
                onChange={(e) => setInspectBatchNumber(e.target.value)}
                className="w-full text-xs font-mono bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                {isFr ? 'Produit' : 'Product Name'}
              </label>
              <input
                type="text"
                value={inspectProductName}
                onChange={(e) => setInspectProductName(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                Humidité (%) [Max 11%]
              </label>
              <input
                type="number"
                step="0.1"
                value={inspectMoisture}
                onChange={(e) => setInspectMoisture(Number(e.target.value))}
                className="w-full text-xs font-mono bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                Défauts (%) [Max 2%]
              </label>
              <input
                type="number"
                step="0.1"
                value={inspectDefects}
                onChange={(e) => setInspectDefects(Number(e.target.value))}
                className="w-full text-xs font-mono bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
                Corps Étrangers (%) [Max 0.5%]
              </label>
              <input
                type="number"
                step="0.05"
                value={inspectForeignMatter}
                onChange={(e) => setInspectForeignMatter(Number(e.target.value))}
                className="w-full text-xs font-mono bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] block mb-1">
              {isFr ? 'Décision de Libération' : 'Release Decision'}
            </label>
            <select
              value={inspectDecision}
              onChange={(e) => setInspectDecision(e.target.value as any)}
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg p-2 font-bold"
            >
              <option value="ACCEPTED_GRADE_A">ACCEPTED_GRADE_A (Conforme Export)</option>
              <option value="ACCEPTED_GRADE_B">ACCEPTED_GRADE_B (Conforme Marché Local)</option>
              <option value="REJECTED">REJECTED (Non Conforme — Bloqué)</option>
            </select>
          </div>

          {inspectDecision === 'REJECTED' && (
            <div>
              <label className="text-xs font-semibold text-rose-700 dark:text-rose-400 block mb-1">
                {isFr ? 'Motif de Non-Conformité Obligatoire' : 'Rejection Reason'}
              </label>
              <textarea
                value={inspectRejectionReason}
                onChange={(e) => setInspectRejectionReason(e.target.value)}
                placeholder="ex. Humidité supérieure au seuil max et présence de moisissures."
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-rose-300 dark:border-rose-900 rounded-lg p-2"
                rows={2}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsInspectionModalOpen(false)}>
              {isFr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isFr ? 'Enregistrer le Rapport' : 'Save Inspection'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
