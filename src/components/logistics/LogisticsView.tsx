import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  Ship,
  Plane,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Package,
  Calendar,
  Layers,
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  Scale,
  Thermometer,
  Lock,
  ExternalLink,
  ChevronRight,
  FileCheck,
  Sparkles,
  AlertOctagon,
  Building2,
  DollarSign,
  Info
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge, StatusDot } from '../ui/Badge.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { AuthSession } from '../../types/organization.ts';
import {
  ShipmentMaster,
  ShipmentStatus,
  TransportMode,
  ComplianceDocumentRecord,
  ComplianceDocumentType,
  DocumentComplianceStatus,
  ShipmentMilestone,
  MilestoneStatus,
  ScenarioSimulationResult
} from '../../types/logistics.ts';
import { LogisticsService } from '../../services/client-api.ts';

interface LogisticsViewProps {
  session: AuthSession;
  onNavigateToMasterCalendar?: () => void;
}

export function LogisticsView({ session, onNavigateToMasterCalendar }: LogisticsViewProps) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language.startsWith('fr');

  const [activeTab, setActiveTab] = useState<'shipments' | 'compliance' | 'risk_scenarios' | 'dispatch_gating'>('shipments');

  // State from server
  const [shipments, setShipments] = useState<ShipmentMaster[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentMaster | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterMarket, setFilterMarket] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState<boolean>(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState<boolean>(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState<boolean>(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);

  // Milestone edit state
  const [selectedMilestone, setSelectedMilestone] = useState<ShipmentMilestone | null>(null);
  const [milestoneStatus, setMilestoneStatus] = useState<MilestoneStatus>('COMPLETED');
  const [milestoneDelayHours, setMilestoneDelayHours] = useState<number>(0);
  const [milestoneNotes, setMilestoneNotes] = useState<string>('');

  // Document edit state
  const [selectedDoc, setSelectedDoc] = useState<ComplianceDocumentRecord | null>(null);
  const [docStatus, setDocStatus] = useState<DocumentComplianceStatus>('APPROVED_VALID');
  const [docNumber, setDocNumber] = useState<string>('');
  const [docExpiryDate, setDocExpiryDate] = useState<string>('');
  const [docRejectionReason, setDocRejectionReason] = useState<string>('');

  // Risk Simulation State
  const [scenarioType, setScenarioType] = useState<'THREE_DAY_TRANSPORT_DELAY' | 'MISSED_VESSEL_CONNECTION' | 'REJECTED_CUSTOMS_DOCUMENT' | 'PACKAGING_SHORTAGE' | 'FREIGHT_COST_INCREASE'>('THREE_DAY_TRANSPORT_DELAY');
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // New Shipment Form State
  const [newOrderNumber, setNewOrderNumber] = useState<string>('ORD-2026-PIM-001');
  const [newTransportMode, setNewTransportMode] = useState<TransportMode>('MARITIME');
  const [newMarket, setNewMarket] = useState<'EUROPEAN_UNION' | 'CEDEAO' | 'DOMESTIC_GUINEA'>('EUROPEAN_UNION');
  const [newCarrier, setNewCarrier] = useState<string>('CMA CGM Conakry');
  const [newCarrierContact, setNewCarrierContact] = useState<string>('Agent Maritime PAC');
  const [newCarrierPhone, setNewCarrierPhone] = useState<string>('+224 622 00 11 22');
  const [newVehicle, setNewVehicle] = useState<string>('Conteneur 20ft Dry TC-9912');
  const [newSeal, setNewSeal] = useState<string>('GN-PLOMB-2026-09');
  const [newDispatchLocation, setNewDispatchLocation] = useState<string>('Magasin Central Friguiagbé, Kindia');
  const [newDestinationCity, setNewDestinationCity] = useState<string>('Port du Havre, France');
  const [newDestinationCountry, setNewDestinationCountry] = useState<string>('FR');
  const [newBatchNumber, setNewBatchNumber] = useState<string>('PRC-2026-S17-001');
  const [newAllocatedQtyKg, setNewAllocatedQtyKg] = useState<number>(5000);
  const [newPickupDate, setNewPickupDate] = useState<string>('2026-10-25T08:00:00Z');
  const [newArrivalDate, setNewArrivalDate] = useState<string>('2026-11-12T16:00:00Z');

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await LogisticsService.listShipments(session);
      setShipments(data);
      if (data.length > 0 && !selectedShipment) {
        setSelectedShipment(data[0]);
      } else if (selectedShipment) {
        const refreshed = data.find(s => s.id === selectedShipment.id);
        if (refreshed) setSelectedShipment(refreshed);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors du chargement des expéditions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.organization?.id, session.user?.activeOrganizationId]);

  // Handle New Shipment Submit
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await LogisticsService.createShipment(session, {
        orderId: 'ord-2026-pim-001',
        transportMode: newTransportMode,
        carrierName: newCarrier,
        carrierContactPerson: newCarrierContact,
        carrierContactPhone: newCarrierPhone,
        containerOrVehicleId: newVehicle,
        sealNumber: newSeal,
        dispatchLocation: newDispatchLocation,
        destinationPortOrCity: newDestinationCity,
        destinationCountry: newDestinationCountry,
        destinationMarket: newMarket,
        linkedBatches: [
          {
            inventoryItemId: 'inv-proc-pim-001',
            batchNumber: newBatchNumber,
            productName: 'Piment S17 Habanero Séché',
            quantityAllocated: Number(newAllocatedQtyKg),
            unit: 'KG'
          }
        ],
        plannedPickupDate: newPickupDate,
        estimatedArrivalDate: newArrivalDate
      });
      setSuccessMessage(isFr ? `Expédition ${created.shipmentNumber} créée avec succès !` : `Shipment ${created.shipmentNumber} created!`);
      setIsNewShipmentModalOpen(false);
      await loadData();
      setSelectedShipment(created);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la création de l’expédition.');
    }
  };

  // Handle Milestone Update with Delay Propagation
  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment || !selectedMilestone) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await LogisticsService.updateShipmentMilestone(
        session,
        selectedShipment.id,
        selectedMilestone.id,
        {
          status: milestoneStatus,
          delayHours: Number(milestoneDelayHours),
          notes: milestoneNotes
        }
      );
      setSelectedShipment(updated);
      setSuccessMessage(
        isFr
          ? `Jalon '${selectedMilestone.name}' mis à jour. Nouvelle arrivée estimée: ${new Date(updated.estimatedArrivalDate).toLocaleDateString()}`
          : `Milestone updated. New arrival: ${new Date(updated.estimatedArrivalDate).toLocaleDateString()}`
      );
      setIsMilestoneModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Handle Document Review
  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment || !selectedDoc) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await LogisticsService.updateDocumentStatus(
        session,
        selectedShipment.id,
        selectedDoc.id,
        {
          status: docStatus,
          documentNumber: docNumber,
          expiryDate: docExpiryDate,
          rejectionReason: docStatus === 'REJECTED_NON_COMPLIANT' ? docRejectionReason : undefined
        }
      );
      setSelectedShipment(updated);
      setSuccessMessage(isFr ? `Document '${selectedDoc.title}' mis à jour.` : `Document updated.`);
      setIsDocumentModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Run Scenario Simulation
  const handleRunSimulation = async (type: any) => {
    if (!selectedShipment) return;
    setIsSimulating(true);
    setScenarioType(type);
    try {
      const res = await LogisticsService.simulateRiskScenario(session, selectedShipment.id, type);
      setSimulationResult(res);
      setIsScenarioModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered shipments
  const filteredShipments = shipments.filter(s => {
    if (filterMarket !== 'ALL' && s.destinationMarket !== filterMarket) return false;
    if (filterMode !== 'ALL' && s.transportMode !== filterMode) return false;
    if (filterStatus !== 'ALL' && s.currentStatus !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const num = s.shipmentNumber.toLowerCase();
      const buyer = s.buyerName.toLowerCase();
      const dest = s.destinationPortOrCity.toLowerCase();
      if (!num.includes(q) && !buyer.includes(q) && !dest.includes(q)) return false;
    }
    return true;
  });

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'MARITIME': return <Ship className="w-4 h-4 text-sky-600" />;
      case 'AIR_FREIGHT': return <Plane className="w-4 h-4 text-purple-600" />;
      case 'ROAD_FREIGHT': return <Truck className="w-4 h-4 text-amber-600" />;
      default: return <Layers className="w-4 h-4 text-[#2F7D4A]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
              PHASE 7 &bull; COMMERCE AGRICOLE & EXPORT
            </span>
            <Badge variant="forest" size="xs">
              {shipments.length} Expéditions Actives
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
            {isFr ? 'Logistique, Expéditions & Conformité Export' : 'Logistics, Shipments & Export Trade'}
          </h1>
          <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
            {isFr
              ? 'Planification des transports maritimes, routiers et aériens, matrice documentaire multi-marchés, recalcul dynamique des retards et simulation d’aléas.'
              : 'Shipment scheduling, multi-market compliance checklists, delay propagation, and risk scenario simulation.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToMasterCalendar && (
            <Button
              variant="outline"
              size="sm"
              icon={<Calendar className="w-3.5 h-3.5 text-amber-600" />}
              onClick={onNavigateToMasterCalendar}
            >
              {isFr ? 'Calendrier Maître' : 'Master Calendar'}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewShipmentModalOpen(true)}
          >
            {isFr ? '+ Nouvelle Expédition' : '+ New Shipment'}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:underline">Fermer</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:underline">OK</button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E1E7E0] dark:border-[#24352C] pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'shipments'
              ? 'bg-[#173F35] text-white'
              : 'text-[#66736B] dark:text-[#9EB0A5] hover:bg-[#F0F4EE] dark:hover:bg-[#1B2B23]'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>{isFr ? 'Expéditions & Jalons' : 'Shipments & Tracking'}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{shipments.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'compliance'
              ? 'bg-[#173F35] text-white'
              : 'text-[#66736B] dark:text-[#9EB0A5] hover:bg-[#F0F4EE] dark:hover:bg-[#1B2B23]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{isFr ? 'Matrice Documentaire & Douane' : 'Compliance Documents'}</span>
        </button>

        <button
          onClick={() => setActiveTab('risk_scenarios')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'risk_scenarios'
              ? 'bg-[#173F35] text-white'
              : 'text-[#66736B] dark:text-[#9EB0A5] hover:bg-[#F0F4EE] dark:hover:bg-[#1B2B23]'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
          <span>{isFr ? 'Simulation Retards & Aléas (+72h)' : 'Delay Risk Simulation'}</span>
        </button>

        <button
          onClick={() => setActiveTab('dispatch_gating')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'dispatch_gating'
              ? 'bg-[#173F35] text-white'
              : 'text-[#66736B] dark:text-[#9EB0A5] hover:bg-[#F0F4EE] dark:hover:bg-[#1B2B23]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isFr ? 'Blocage Rejets & Contrôle Qualité' : 'Quality Dispatch Gating'}</span>
        </button>
      </div>

      {/* TAB 1: SHIPMENTS & MILESTONE TRACKING */}
      {activeTab === 'shipments' && (
        <div className="space-y-6">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="sm">
              <div className="text-[10px] text-[#8A988F] font-mono uppercase">En Transit Maritime</div>
              <div className="text-xl font-bold font-mono text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {shipments.filter(s => s.transportMode === 'MARITIME').length} Conteneurs
              </div>
              <div className="text-[11px] text-[#2F7D4A] mt-1 flex items-center gap-1">
                <Ship className="w-3 h-3" /> Port de Conakry &rarr; UE
              </div>
            </Card>

            <Card padding="sm">
              <div className="text-[10px] text-[#8A988F] font-mono uppercase">Corridors Routiers CEDEAO</div>
              <div className="text-xl font-bold font-mono text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                {shipments.filter(s => s.transportMode === 'ROAD_FREIGHT').length} Convois
              </div>
              <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <Truck className="w-3 h-3" /> Sénégal / Mali / Guinée
              </div>
            </Card>

            <Card padding="sm">
              <div className="text-[10px] text-[#8A988F] font-mono uppercase">Taux de Respect Délais</div>
              <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                {shipments.length > 0
                  ? `${Math.round((shipments.filter(s => s.totalDelayHours === 0).length / shipments.length) * 100)}%`
                  : '100%'}
              </div>
              <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-600" /> Zéro rupture critique
              </div>
            </Card>

            <Card padding="sm">
              <div className="text-[10px] text-[#8A988F] font-mono uppercase">Frais Logistiques Déclarés</div>
              <div className="text-xl font-bold font-mono text-[#173F35] dark:text-[#52C582] mt-0.5">
                {Math.round(shipments.reduce((acc, s) => acc + s.costs.totalCost, 0) / 1000000)}M GNF
              </div>
              <div className="text-[11px] text-[#8A988F] mt-1 font-mono">
                Modèle contractuel certifié
              </div>
            </Card>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#14201A] p-3 rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8A988F]" />
              <input
                type="text"
                placeholder={isFr ? "Rechercher par n° expédition, acheteur, conteneur ou destination..." : "Search shipment..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F8F4] dark:bg-[#18261F] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg text-[#202924] dark:text-[#EEF4F0]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterMarket}
                onChange={e => setFilterMarket(e.target.value)}
                className="text-xs bg-[#F7F8F4] dark:bg-[#18261F] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg px-2.5 py-1.5"
              >
                <option value="ALL">{isFr ? 'Tous Marchés' : 'All Markets'}</option>
                <option value="EUROPEAN_UNION">Union Européenne</option>
                <option value="CEDEAO">CEDEAO / Ouest-Africain</option>
                <option value="DOMESTIC_GUINEA">National Guinée</option>
              </select>

              <select
                value={filterMode}
                onChange={e => setFilterMode(e.target.value)}
                className="text-xs bg-[#F7F8F4] dark:bg-[#18261F] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg px-2.5 py-1.5"
              >
                <option value="ALL">{isFr ? 'Tous Modes' : 'All Transport Modes'}</option>
                <option value="MARITIME">Maritime (Navire)</option>
                <option value="ROAD_FREIGHT">Routier (Camion)</option>
                <option value="AIR_FREIGHT">Aérien (Cargo)</option>
              </select>
            </div>
          </div>

          {/* Shipments Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of Shipments (1 col) */}
            <div className="space-y-3 lg:col-span-1">
              <h3 className="text-xs font-bold uppercase font-mono text-[#66736B] dark:text-[#9EB0A5]">
                Dossiers d'Expédition ({filteredShipments.length})
              </h3>
              {filteredShipments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8A988F] bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
                  Aucune expédition ne correspond aux critères.
                </div>
              ) : (
                filteredShipments.map(s => {
                  const isSelected = selectedShipment?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedShipment(s)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-[#14201A] border-[#2F7D4A] ring-1 ring-[#2F7D4A]/30 shadow-xs'
                          : 'bg-white/60 dark:bg-[#14201A]/60 border-[#E1E7E0] dark:border-[#24352C] hover:border-[#CDD6CC]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#F0F4EE] dark:bg-[#1B2B23]">
                            {getModeIcon(s.transportMode)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-[#202924] dark:text-[#EEF4F0] block">
                              {s.shipmentNumber}
                            </span>
                            <span className="text-[10px] text-[#8A988F] font-mono">
                              {s.orderNumber} &bull; {s.buyerName}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant={
                            s.currentStatus === 'DELIVERED' ? 'forest' :
                            s.currentStatus === 'DELAYED' ? 'error' :
                            s.currentStatus === 'DISPATCHED_IN_TRANSIT' ? 'info' : 'warning'
                          }
                          size="xs"
                        >
                          {s.currentStatus}
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-[#526359] dark:text-[#9EB0A5] pt-2 border-t border-[#E1E7E0] dark:border-[#24352C]">
                        <span className="font-mono text-[11px] truncate max-w-[140px]">
                          &rarr; {s.destinationPortOrCity}
                        </span>
                        <span className="font-mono font-bold text-[#202924] dark:text-[#EEF4F0]">
                          {(s.totalNetWeightKg / 1000).toFixed(1)} T
                        </span>
                      </div>

                      {s.totalDelayHours > 0 && (
                        <div className="mt-2 text-[10px] font-mono text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-1 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Retard cumulé : +{s.totalDelayHours}h
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Shipment Detailed View (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {selectedShipment ? (
                <div className="bg-white dark:bg-[#14201A] rounded-2xl border border-[#E1E7E0] dark:border-[#24352C] p-5 space-y-6 shadow-xs">
                  {/* Detailed Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#202924] dark:text-[#EEF4F0]">
                          {selectedShipment.shipmentNumber}
                        </span>
                        <Badge variant="forest" size="sm">
                          {selectedShipment.incoterm}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          {selectedShipment.destinationMarket}
                        </Badge>
                      </div>
                      <div className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-1">
                        Commande Client : <strong>{selectedShipment.orderNumber}</strong> &bull; Acheteur : <strong>{selectedShipment.buyerName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        icon={<Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                        onClick={() => handleRunSimulation('THREE_DAY_TRANSPORT_DELAY')}
                      >
                        {isFr ? 'Simuler Aléa +72h' : 'Simulate 3-Day Delay'}
                      </Button>
                    </div>
                  </div>

                  {/* Route & Equipment Strip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#F7F8F4] dark:bg-[#18261F] p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-[#8A988F] uppercase font-mono block">Origine & Départ</span>
                      <strong className="text-[#202924] dark:text-[#EEF4F0] block mt-0.5">{selectedShipment.dispatchLocation}</strong>
                      <span className="text-[11px] font-mono text-[#66736B]">
                        Départ prévu : {new Date(selectedShipment.plannedPickupDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#8A988F] uppercase font-mono block">Destination & Arrivée</span>
                      <strong className="text-[#202924] dark:text-[#EEF4F0] block mt-0.5">{selectedShipment.destinationPortOrCity}</strong>
                      <span className="text-[11px] font-mono text-[#2F7D4A]">
                        Arrivée estimée : {new Date(selectedShipment.estimatedArrivalDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#8A988F] uppercase font-mono block">Transporteur & Unité</span>
                      <strong className="text-[#202924] dark:text-[#EEF4F0] block mt-0.5">{selectedShipment.carrierName}</strong>
                      <span className="text-[11px] font-mono text-[#66736B]">
                        {selectedShipment.containerOrVehicleId}
                      </span>
                    </div>
                  </div>

                  {/* Temperature & Packaging Spec */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl border border-[#E1E7E0] dark:border-[#24352C] bg-white dark:bg-[#14201A]">
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="w-4 h-4 text-sky-600" />
                        <h4 className="text-xs font-bold text-[#202924] dark:text-[#EEF4F0]">
                          Régime Thermique & Conservation
                        </h4>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#66736B]">Régime appliqué :</span>
                          <span className="font-mono font-semibold">{selectedShipment.temperatureHandling.regime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#66736B]">Plage de température :</span>
                          <span className="font-mono font-bold text-[#173F35] dark:text-[#52C582]">
                            {selectedShipment.temperatureHandling.minTempC}°C à {selectedShipment.temperatureHandling.maxTempC}°C
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#66736B]">Enregistreur de T° en continu :</span>
                          <span className="font-mono">
                            {selectedShipment.temperatureHandling.requiresContinuousColdChainLog ? 'Oui (Sonde USB active)' : 'Non requis'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-[#E1E7E0] dark:border-[#24352C] bg-white dark:bg-[#14201A]">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-amber-600" />
                        <h4 className="text-xs font-bold text-[#202924] dark:text-[#EEF4F0]">
                          Conditionnement & Palettisation
                        </h4>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#66736B]">Type de palette :</span>
                          <span className="font-mono">{selectedShipment.packagingPallet.palletType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#66736B]">Nombre de palettes :</span>
                          <span className="font-mono font-bold">{selectedShipment.packagingPallet.palletCount} palettes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#66736B]">Poids Net / Brut :</span>
                          <span className="font-mono font-bold">
                            {(selectedShipment.totalNetWeightKg / 1000).toFixed(2)} T / {(selectedShipment.totalGrossWeightKg / 1000).toFixed(2)} T
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Milestones Timeline */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase font-mono text-[#173F35] dark:text-[#E8F0EC] flex items-center justify-between">
                      <span>Jalons d'Acheminement & Suivi Opérationnel</span>
                      <span className="text-[10px] text-[#8A988F] font-normal">
                        Cliquez sur un jalon pour renseigner l'avancement ou déclarer un retard
                      </span>
                    </h4>

                    <div className="space-y-2">
                      {selectedShipment.milestones.map((ms, idx) => (
                        <div
                          key={ms.id}
                          onClick={() => {
                            setSelectedMilestone(ms);
                            setMilestoneStatus(ms.status);
                            setMilestoneDelayHours(ms.delayHours || 0);
                            setMilestoneNotes(ms.notes || '');
                            setIsMilestoneModalOpen(true);
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            ms.status === 'COMPLETED'
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200'
                              : ms.status === 'DELAYED'
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200'
                              : 'bg-[#F7F8F4] dark:bg-[#18261F] border-[#E1E7E0] dark:border-[#24352C] hover:border-[#2F7D4A]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-white dark:bg-[#14201A] border">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-[#202924] dark:text-[#EEF4F0]">
                                {ms.name}
                              </div>
                              <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono">
                                {ms.location} &bull; Prévu : {new Date(ms.plannedDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {ms.delayHours > 0 && (
                              <span className="text-[10px] font-mono text-rose-600 font-bold">
                                +{ms.delayHours}h retard
                              </span>
                            )}
                            <Badge
                              size="xs"
                              variant={
                                ms.status === 'COMPLETED' ? 'forest' :
                                ms.status === 'DELAYED' ? 'error' :
                                ms.status === 'IN_PROGRESS' ? 'warning' : 'neutral'
                              }
                            >
                              {ms.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transparent Cost Breakdown */}
                  <div className="pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
                    <h4 className="text-xs font-bold uppercase font-mono text-[#173F35] dark:text-[#E8F0EC] mb-2 flex items-center justify-between">
                      <span>Structure Transparente des Coûts Logistiques</span>
                      <span className="text-[10px] text-[#8A988F] font-mono">
                        {selectedShipment.costs.rateNotes}
                      </span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs bg-[#F7F8F4] dark:bg-[#18261F] p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] text-[#8A988F] block">Fret Principal</span>
                        <strong className="font-mono text-[11px]">{selectedShipment.costs.freightCost.toLocaleString()} GNF</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A988F] block">Manutention</span>
                        <strong className="font-mono text-[11px]">{selectedShipment.costs.handlingCost.toLocaleString()} GNF</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A988F] block">Transit & Douane</span>
                        <strong className="font-mono text-[11px]">{selectedShipment.costs.customsClearanceCost.toLocaleString()} GNF</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A988F] block">Assurance Cargo</span>
                        <strong className="font-mono text-[11px]">{selectedShipment.costs.insuranceCost.toLocaleString()} GNF</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A988F] block">Emballages/Palettes</span>
                        <strong className="font-mono text-[11px]">{selectedShipment.costs.packagingCost.toLocaleString()} GNF</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A988F] block">Coût Unitaire</span>
                        <strong className="font-mono text-[11px] text-[#173F35] dark:text-[#52C582]">
                          {selectedShipment.costs.costPerKg.toLocaleString()} GNF/kg
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#8A988F] bg-white dark:bg-[#14201A] rounded-2xl border border-[#E1E7E0] dark:border-[#24352C]">
                  Sélectionnez une expédition pour afficher son suivi détaillé.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPLIANCE DOCUMENTS & MULTI-MARKET MATRIX */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-[#173F35]/5 dark:bg-[#2F7D4A]/10 border border-[#2F7D4A]/20 p-4 rounded-xl text-xs space-y-2">
            <h4 className="font-bold text-[#173F35] dark:text-[#77A96B] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Matrice Réglementaire & Contrôle Documentaire par Destination
            </h4>
            <p className="text-[#526359] dark:text-[#9EB0A5]">
              Chaque destination et catégorie de produit dispose de son protocole documentaire propre :
              l’Union Européenne requiert le certificat phytosanitaire CIPV, le certificat d’origine EUR.1 et les analyses de résidus/aflatoxines ; la zone CEDEAO requiert le certificat d’origine communautaire TLS et la lettre de voiture CMR ; le marché national requiert le bordereau de traçabilité d’origine.
            </p>
          </div>

          {selectedShipment ? (
            <div className="bg-white dark:bg-[#14201A] rounded-2xl border border-[#E1E7E0] dark:border-[#24352C] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E1E7E0] dark:border-[#24352C]">
                <div>
                  <h3 className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">
                    Dossier Documentaire Export &bull; {selectedShipment.shipmentNumber}
                  </h3>
                  <span className="text-xs text-[#66736B]">
                    Marché cible : <strong>{selectedShipment.destinationMarket}</strong> ({selectedShipment.destinationCountry})
                  </span>
                </div>
                <Badge variant="forest" size="xs">
                  {selectedShipment.documents.filter(d => d.status === 'APPROVED_VALID').length} / {selectedShipment.documents.length} Validés
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8F4] dark:bg-[#18261F] border-b border-[#E1E7E0] dark:border-[#24352C] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">Type Document</th>
                      <th className="py-2.5 px-3">Numéro / Réf.</th>
                      <th className="py-2.5 px-3">Autorité Émettrice</th>
                      <th className="py-2.5 px-3">Validité</th>
                      <th className="py-2.5 px-3">Statut Conformité</th>
                      <th className="py-2.5 px-3">Vérifié Par</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                    {selectedShipment.documents.map(doc => (
                      <tr key={doc.id} className="hover:bg-[#F7F8F4]/50 dark:hover:bg-[#18261F]/30 text-xs">
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#202924] dark:text-[#EEF4F0]">{doc.title}</div>
                          <div className="text-[10px] text-[#8A988F] font-mono">{doc.documentType}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold">
                          {doc.documentNumber || <span className="text-[#8A988F] italic">Non renseigné</span>}
                        </td>
                        <td className="py-3 px-3 text-[#526359] dark:text-[#9EB0A5]">
                          {doc.issuingAuthority || 'En cours de demande'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {doc.expiryDate ? `Jusqu'au ${doc.expiryDate}` : 'Permanent'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            size="xs"
                            variant={
                              doc.status === 'APPROVED_VALID' ? 'forest' :
                              doc.status === 'REJECTED_NON_COMPLIANT' ? 'error' :
                              doc.status === 'SUBMITTED_FOR_REVIEW' ? 'warning' : 'neutral'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#66736B]">
                          {doc.verifiedByUserName || '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setSelectedDoc(doc);
                              setDocStatus(doc.status);
                              setDocNumber(doc.documentNumber || '');
                              setDocExpiryDate(doc.expiryDate || '');
                              setDocRejectionReason(doc.rejectionReason || '');
                              setIsDocumentModalOpen(true);
                            }}
                          >
                            Vérifier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#8A988F] bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
              Sélectionnez une expédition dans l'onglet principal pour gérer ses documents.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DELAY RISK & SCENARIO PLANNING */}
      {activeTab === 'risk_scenarios' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#14201A] rounded-2xl border border-[#E1E7E0] dark:border-[#24352C] p-5 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">
                Moteur de Simulation des Aléas & Recalcul d'Impact
              </h3>
              <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                Testez en direct les conséquences d'un imprévu logistique sur les délais contractuels, la durée de vie des produits frais et les surcoûts d'immobilisation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card padding="md" className="cursor-pointer hover:border-[#2F7D4A] transition-colors" onClick={() => handleRunSimulation('THREE_DAY_TRANSPORT_DELAY')}>
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <strong className="text-xs">Retard Routier +72h</strong>
                </div>
                <p className="text-xs text-[#66736B] dark:text-[#9EB0A5]">
                  Blocage frontière ou coupure de route RN1. Recalcule la date d'arrivée et vérifie l'intégrité de la chaîne du froid.
                </p>
              </Card>

              <Card padding="md" className="cursor-pointer hover:border-[#2F7D4A] transition-colors" onClick={() => handleRunSimulation('MISSED_VESSEL_CONNECTION')}>
                <div className="flex items-center gap-2 text-rose-600 mb-2">
                  <Ship className="w-4 h-4" />
                  <strong className="text-xs">Rupture Navire PAC (+7j)</strong>
                </div>
                <p className="text-xs text-[#66736B] dark:text-[#9EB0A5]">
                  Conteneur manquant le navire hebdomadaire au Port Autonome de Conakry. Évalue le coût de branchement et le risque de dépérissement.
                </p>
              </Card>

              <Card padding="md" className="cursor-pointer hover:border-[#2F7D4A] transition-colors" onClick={() => handleRunSimulation('REJECTED_CUSTOMS_DOCUMENT')}>
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <strong className="text-xs">Rejet Document Phytosanitaire</strong>
                </div>
                <p className="text-xs text-[#66736B] dark:text-[#9EB0A5]">
                  Rejet d'analyse ou certificat manquant lors du contrôle DNPV/Douane. Active le protocole de contre-expertise.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DISPATCH GATING & QUALITY REJECTION BLOCKING */}
      {activeTab === 'dispatch_gating' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#14201A] rounded-2xl border border-[#E1E7E0] dark:border-[#24352C] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E7E0] dark:border-[#24352C]">
              <div>
                <h3 className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">
                  Garde-Fou Qualité & Blocage Strict des Lots Non Conformes
                </h3>
                <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                  Aucun lot refusé ou non validé par l'inspection de laboratoire ne peut être affecté à une expédition.
                </p>
              </div>
              <Badge variant="forest" size="xs">
                Contrôle Actif
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Lot Conforme & Autorisé à l’Expédition
                </div>
                <p className="text-xs text-[#526359] dark:text-[#9EB0A5]">
                  <strong>Lot PRC-2026-S17-001 (Piment S17 Séché)</strong> : Taux d'humidité 9.8%, absence totale d'aflatoxines, certificat ONCQ validé. Affectation autorisée dans l'expédition SHP-2026-EXP-PIM-001.
                </p>
                <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                  Statut : ACCEPTED_GRADE_A &bull; Certificat : ONCQ-2026-AFLA-04
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                  <XCircle className="w-4 h-4" />
                  Lot Rejeté & Bloqué à l’Expédition
                </div>
                <p className="text-xs text-[#526359] dark:text-[#9EB0A5]">
                  <strong>Lot PRC-2026-S17-REJ (Piment Humide)</strong> : Humidité 18.5% (&gt; 11% autorisé). Toute tentative de création d'expédition sur ce lot est automatiquement rejetée par le système.
                </p>
                <div className="font-mono text-[11px] text-rose-700 dark:text-rose-400">
                  Statut : REJECTED &bull; Motif : Teneur en eau excessive et moisissures
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: NEW SHIPMENT */}
      <Modal
        isOpen={isNewShipmentModalOpen}
        onClose={() => setIsNewShipmentModalOpen(false)}
        title={isFr ? "Créer une Nouvelle Expédition" : "New Shipment"}
        subtitle="Rattachez l'expédition à une commande confirmée et à un lot d'inventaire approuvé"
      >
        <form onSubmit={handleCreateShipment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Marché Cible"
              value={newMarket}
              onChange={e => setNewMarket(e.target.value as any)}
              options={[
                { value: 'EUROPEAN_UNION', label: 'Union Européenne (Rungis / Rotterdam)' },
                { value: 'CEDEAO', label: 'CEDEAO Régional (Dakar / Bamako / Abidjan)' },
                { value: 'DOMESTIC_GUINEA', label: 'National Guinée (Conakry)' }
              ]}
            />
            <Select
              label="Mode de Transport"
              value={newTransportMode}
              onChange={e => setNewTransportMode(e.target.value as any)}
              options={[
                { value: 'MARITIME', label: 'Maritime (Conteneur Navire)' },
                { value: 'ROAD_FREIGHT', label: 'Routier (Camion Bâché / Frigo)' },
                { value: 'AIR_FREIGHT', label: 'Aérien (Fret Cargo)' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Compagnie / Transporteur"
              required
              value={newCarrier}
              onChange={e => setNewCarrier(e.target.value)}
            />
            <Input
              label="N° Conteneur ou Véhicule"
              required
              value={newVehicle}
              onChange={e => setNewVehicle(e.target.value)}
              placeholder="ex: CMAU 928374-1 ou Immat camion"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Origine / Lieu d'Enlèvement"
              required
              value={newDispatchLocation}
              onChange={e => setNewDispatchLocation(e.target.value)}
            />
            <Input
              label="Destination Finale"
              required
              value={newDestinationCity}
              onChange={e => setNewDestinationCity(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Lot d'Inventaire Approuvé"
              required
              value={newBatchNumber}
              onChange={e => setNewBatchNumber(e.target.value)}
              placeholder="ex: PRC-2026-S17-001"
            />
            <Input
              label="Quantité Allouée (KG)"
              type="number"
              required
              value={newAllocatedQtyKg}
              onChange={e => setNewAllocatedQtyKg(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date d'Enlèvement Prévue"
              type="datetime-local"
              required
              value={newPickupDate.substring(0, 16)}
              onChange={e => setNewPickupDate(e.target.value)}
            />
            <Input
              label="Date d'Arrivée Estimée"
              type="datetime-local"
              required
              value={newArrivalDate.substring(0, 16)}
              onChange={e => setNewArrivalDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsNewShipmentModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Créer l'expédition
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: UPDATE MILESTONE & PROPAGATE DELAY */}
      <Modal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        title={selectedMilestone ? `Mise à Jour Jalon : ${selectedMilestone.name}` : 'Mise à Jour Jalon'}
        subtitle="Renseignez l'avancement ou déclarez un retard d'acheminement"
      >
        <form onSubmit={handleUpdateMilestone} className="space-y-4">
          <Select
            label="Statut du Jalon"
            value={milestoneStatus}
            onChange={e => setMilestoneStatus(e.target.value as any)}
            options={[
              { value: 'COMPLETED', label: 'COMPLETED — Réalisé avec succès' },
              { value: 'IN_PROGRESS', label: 'IN_PROGRESS — En cours de traitement' },
              { value: 'DELAYED', label: 'DELAYED — Retard constaté (Recalcul automatique)' },
              { value: 'PENDING', label: 'PENDING — En attente' }
            ]}
          />

          <Input
            label="Heures de Retard Ajoutées (+h)"
            type="number"
            min="0"
            value={milestoneDelayHours}
            onChange={e => setMilestoneDelayHours(Number(e.target.value))}
            hint="Le retard décale automatiquement l'arrivée estimée et les jalons aval."
          />

          <Input
            label="Notes d'Exploitation / Motif"
            value={milestoneNotes}
            onChange={e => setMilestoneNotes(e.target.value)}
            placeholder="ex: Embouteillage axe RN1 ou attente rapport phytosanitaire"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsMilestoneModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Enregistrer le jalon
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: COMPLIANCE DOCUMENT REVIEW */}
      <Modal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        title={selectedDoc ? `Contrôle Documentaire : ${selectedDoc.title}` : 'Contrôle Document'}
        subtitle="Validation et enregistrement du visa réglementaire"
      >
        <form onSubmit={handleUpdateDocument} className="space-y-4">
          <Select
            label="Statut de Conformité"
            value={docStatus}
            onChange={e => setDocStatus(e.target.value as any)}
            options={[
              { value: 'APPROVED_VALID', label: 'APPROVED_VALID — Conforme & Visé' },
              { value: 'SUBMITTED_FOR_REVIEW', label: 'SUBMITTED_FOR_REVIEW — Déposé en instruction' },
              { value: 'REQUIRED_DRAFT', label: 'REQUIRED_DRAFT — Projet requis' },
              { value: 'REJECTED_NON_COMPLIANT', label: 'REJECTED_NON_COMPLIANT — Non conforme (Bloquant)' }
            ]}
          />

          <Input
            label="Numéro de Référence Officiel"
            value={docNumber}
            onChange={e => setDocNumber(e.target.value)}
            placeholder="ex: PHYT-GN-2026-0941"
          />

          <Input
            label="Date d'Expiration / Validité"
            type="date"
            value={docExpiryDate}
            onChange={e => setDocExpiryDate(e.target.value)}
          />

          {docStatus === 'REJECTED_NON_COMPLIANT' && (
            <Input
              label="Motif du Rejet Documentaire"
              required
              value={docRejectionReason}
              onChange={e => setDocRejectionReason(e.target.value)}
              placeholder="ex: Signature d'autorité manquante ou résultats non conformes"
            />
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsDocumentModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Valider la conformité
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: SCENARIO RISK SIMULATION RESULTS */}
      <Modal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        title="Résultat de Simulation du Scénario d'Aléa"
        subtitle={simulationResult?.scenarioName || 'Simulation'}
      >
        {simulationResult && (
          <div className="space-y-4 text-xs">
            <div className={`p-3 rounded-xl border ${
              simulationResult.deadlineBreached
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
            }`}>
              <div className="font-bold flex items-center gap-2">
                {simulationResult.deadlineBreached ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {simulationResult.deadlineBreached
                  ? 'Délai Contractuel Acheteur Dépassé !'
                  : 'Délai Contractuel Acheteur Maintenu'}
              </div>
              <div className="text-[11px] mt-1 font-mono">
                Arrivée recalculée : <strong>{new Date(simulationResult.recalculatedArrivalDate).toLocaleDateString()}</strong> &bull; Date limite contrat : {new Date(simulationResult.originalBuyerDeadline).toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#F7F8F4] dark:bg-[#18261F] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
                <span className="text-[10px] text-[#8A988F] uppercase font-mono block">Impact Qualité / Fraîcheur</span>
                <span className={`font-bold mt-1 block ${
                  simulationResult.productQualityRisk === 'CRITICAL_SPOILAGE' ? 'text-rose-600' :
                  simulationResult.productQualityRisk === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  Risque {simulationResult.productQualityRisk} ({simulationResult.shelfLifeLossDays} jours de shelf-life consommés)
                </span>
              </div>

              <div className="p-3 bg-[#F7F8F4] dark:bg-[#18261F] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
                <span className="text-[10px] text-[#8A988F] uppercase font-mono block">Surcoût Estimé</span>
                <span className="font-bold text-[#173F35] dark:text-[#52C582] mt-1 block font-mono">
                  +{simulationResult.estimatedCostImpactGNF.toLocaleString()} GNF
                </span>
                <span className="text-[10px] text-[#8A988F]">{simulationResult.costImpactReason}</span>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-[#14201A] rounded-xl border border-[#2F7D4A]/30 space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-[#173F35] dark:text-[#77A96B] block">
                Recommandation Opérationnelle & Atténuation
              </span>
              <p className="text-xs text-[#202924] dark:text-[#EEF4F0]">
                {simulationResult.recommendedMitigationAction}
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E1E7E0] dark:border-[#24352C]">
              <Button size="sm" variant="primary" onClick={() => setIsScenarioModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
