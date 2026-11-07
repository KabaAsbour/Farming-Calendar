import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Globe2,
  FileText,
  DollarSign,
  Truck,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Layers,
  Scale,
  Calendar,
  Lock,
  RefreshCw,
  Phone,
  Mail,
  UserCheck,
  Package,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge, StatusDot } from '../ui/Badge.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { AuthSession } from '../../types/organization.ts';
import { CommercialService } from '../../services/client-api.ts';
import {
  BuyerMaster,
  CommercialOrderMaster,
  OrderStatus,
  SupplyDemandBalance
} from '../../types/commercial.ts';

interface CommercialViewProps {
  session: AuthSession;
  onNavigateToMasterCalendar?: () => void;
}

export function CommercialView({ session, onNavigateToMasterCalendar }: CommercialViewProps) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<'orders' | 'buyers' | 'supply_demand' | 'reservations'>('orders');

  // Data states
  const [orders, setOrders] = useState<CommercialOrderMaster[]>([]);
  const [buyers, setBuyers] = useState<BuyerMaster[]>([]);
  const [supplyBalances, setSupplyBalances] = useState<SupplyDemandBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals & Drawers
  const [selectedOrder, setSelectedOrder] = useState<CommercialOrderMaster | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerMaster | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showNewBuyerModal, setShowNewBuyerModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);

  // New Order Form state
  const [newBuyerId, setNewBuyerId] = useState('');
  const [newProduct, setNewProduct] = useState('Piment / Hot Pepper');
  const [newVariety, setNewVariety] = useState('S17 / Habanero amélioré');
  const [newQtyTons, setNewQtyTons] = useState('15');
  const [newPricePerKg, setNewPricePerKg] = useState('45000');
  const [newIncoterm, setNewIncoterm] = useState('FOB');
  const [newDeliveryStart, setNewDeliveryStart] = useState('2026-10-25');
  const [newDeliveryEnd, setNewDeliveryEnd] = useState('2026-10-30');
  const [newDestination, setNewDestination] = useState('Port Autonome de Conakry - Quai Export');

  // New Buyer Form state
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newBuyerCountry, setNewBuyerCountry] = useState('GN');
  const [newBuyerMarket, setNewBuyerMarket] = useState('Exportation Union Européenne');
  const [newBuyerLocality, setNewBuyerLocality] = useState('Conakry');
  const [newBuyerType, setNewBuyerType] = useState('EXPORTER');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newTargetPrice, setNewTargetPrice] = useState('45000');

  // Supply Reservation Form state
  const [resOrderId, setResOrderId] = useState('');
  const [resOrderLineId, setResOrderLineId] = useState('');
  const [resCampaignId, setResCampaignId] = useState('camp-pepper-s17-01');
  const [resQtyTons, setResQtyTons] = useState('5.0');

  // Communication note state
  const [newCommSummary, setNewCommSummary] = useState('');
  const [newCommType, setNewCommType] = useState<'EMAIL' | 'PHONE_CALL' | 'IN_PERSON_MEETING'>('PHONE_CALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, oList, balances] = await Promise.all([
        CommercialService.getBuyers(session),
        CommercialService.getOrders(session),
        CommercialService.getSupplyDemandBalance(session)
      ]);
      setBuyers(bList);
      setOrders(oList);
      setSupplyBalances(balances);
      if (bList.length > 0 && !newBuyerId) {
        setNewBuyerId(bList[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading commercial data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.user.activeOrganizationId, session.organization?.id]);

  const handleCreateBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      await CommercialService.createBuyer(session, {
        name: newBuyerName,
        countryCode: newBuyerCountry,
        market: newBuyerMarket,
        locality: newBuyerLocality,
        buyerType: newBuyerType as any,
        contacts: [
          {
            id: crypto.randomUUID(),
            fullName: newContactName || 'Contact Achats',
            role: 'Responsable Approvisionnement',
            email: newContactEmail || 'achats@buyer.dev',
            phone: newContactPhone || '+224 600 00 00 00',
            isPrimary: true
          }
        ],
        productsOfInterest: [newProduct],
        targetPrice: parseFloat(newTargetPrice) || 45000,
        targetCurrency: 'GNF',
        targetUnit: 'KG',
        verificationStatus: 'VERIFIED',
        isDemoRecord: true
      });
      setSuccessMessage('Acheteur B2B enregistré avec succès.');
      setShowNewBuyerModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const qtyTons = parseFloat(newQtyTons) || 10;
      const unitPrice = parseFloat(newPricePerKg) || 45000;

      await CommercialService.createOrder(session, {
        buyerId: newBuyerId || buyers[0]?.id,
        orderType: 'ACCEPTED_ORDER',
        incoterm: newIncoterm,
        deliveryDestination: newDestination,
        deliveryWindowStart: newDeliveryStart,
        deliveryWindowEnd: newDeliveryEnd,
        currency: 'GNF',
        lines: [
          {
            cropName: newProduct,
            cropVarietyName: newVariety,
            specifications: 'Qualité Export certifiée, taux d’humidité < 11%',
            orderedQuantity: qtyTons * 1000,
            unit: 'KG',
            quantityTons: qtyTons,
            unitPrice,
            qualityGrade: 'GRADE_A_PREMIUM',
            packagingType: 'Cartons 5kg ventilés neutres'
          }
        ],
        notes: 'Engagement commercial enregistré avec jalon Master Calendar automatique.'
      });

      setSuccessMessage('Commande commerciale enregistrée et synchronisée.');
      setShowNewOrderModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleTransitionStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setErrorMessage('');
    try {
      const updated = await CommercialService.updateOrderStatus(session, orderId, nextStatus);
      setSelectedOrder(updated);
      setSuccessMessage(`Commande passée au statut : ${nextStatus}`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleMakeReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const qty = parseFloat(resQtyTons);
      await CommercialService.reserveSupply(session, {
        orderId: resOrderId,
        orderLineId: resOrderLineId,
        campaignId: resCampaignId,
        quantityTons: qty
      });
      setSuccessMessage(`Réservation ferme de ${qty} tonnes effectuée avec succès.`);
      setShowReservationModal(false);
      await loadData();
      if (selectedOrder) {
        const refreshed = await CommercialService.getOrderById(session, selectedOrder.id);
        setSelectedOrder(refreshed);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleAddCommunication = async (buyerId: string) => {
    if (!newCommSummary.trim()) return;
    try {
      const updated = await CommercialService.addBuyerCommunication(session, buyerId, {
        date: new Date().toISOString(),
        type: newCommType,
        authorName: session.user.fullName,
        summary: newCommSummary
      });
      setSelectedBuyer(updated);
      setNewCommSummary('');
      setSuccessMessage('Échange consigné dans le CRM acheteur.');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.buyerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.deliveryDestination?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Messages */}
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="font-bold hover:underline">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="font-bold hover:underline">✕</button>
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
              COMMERCE & MARCHÉS
            </span>
            <Badge variant="forest" size="xs">
              Phase 5 : Gestion Commerciale Intégrée
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
            CRM Acheteurs, Contrats & Synchronisation Offre-Demande
          </h1>
          <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
            Liaison transactionnelle entre la demande des acheteurs, les récoltes des parcelles et le Calendrier Maître.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subtabs Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#F0F4EE] dark:bg-[#1B2B23] rounded-lg border border-[#E1E7E0] dark:border-[#283D33]">
            <button
              onClick={() => setSubTab('orders')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                subTab === 'orders'
                  ? 'bg-white dark:bg-[#14201A] text-[#173F35] dark:text-[#77A96B] shadow-xs'
                  : 'text-[#66736B] dark:text-[#9EB0A5]'
              }`}
            >
              Commandes & Contrats ({orders.length})
            </button>
            <button
              onClick={() => setSubTab('buyers')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                subTab === 'buyers'
                  ? 'bg-white dark:bg-[#14201A] text-[#173F35] dark:text-[#77A96B] shadow-xs'
                  : 'text-[#66736B] dark:text-[#9EB0A5]'
              }`}
            >
              Répertoire CRM Acheteurs ({buyers.length})
            </button>
            <button
              onClick={() => setSubTab('supply_demand')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                subTab === 'supply_demand'
                  ? 'bg-white dark:bg-[#14201A] text-[#173F35] dark:text-[#77A96B] shadow-xs'
                  : 'text-[#66736B] dark:text-[#9EB0A5]'
              }`}
            >
              Équilibre Offre / Demande
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<UserCheck className="w-3.5 h-3.5" />}
            onClick={() => setShowNewBuyerModal(true)}
          >
            Nouvel Acheteur
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowNewOrderModal(true)}
          >
            Nouvelle Commande
          </Button>
        </div>
      </div>

      {/* SUBTAB 1: ORDERS & CONTRACTS */}
      {subTab === 'orders' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#14201A] p-3 rounded-xl border border-[#E1E7E0] dark:border-[#24352C] shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#66736B] dark:text-[#9EB0A5]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par référence, acheteur ou port..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-[#F7F8F4] dark:bg-[#18261F] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg text-[#202924] dark:text-[#EEF4F0] focus:ring-1 focus:ring-[#2F7D4A]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-[#F7F8F4] dark:bg-[#18261F] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg px-2.5 py-1.5 text-[#202924] dark:text-[#EEF4F0]"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="INQUIRY">Demande d'information</option>
                <option value="QUOTED">Devis émis</option>
                <option value="CONFIRMED">Confirmé / Contrat</option>
                <option value="IN_PRODUCTION">En production agricole</option>
                <option value="PROCESSING">En transformation / usinage</option>
                <option value="DELIVERED">Livré acheteur</option>
              </select>

              {onNavigateToMasterCalendar && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={onNavigateToMasterCalendar}
                  icon={<Calendar className="w-3.5 h-3.5" />}
                >
                  Calendrier Maître
                </Button>
              )}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F8F4] dark:bg-[#18261F] border-b border-[#E1E7E0] dark:border-[#24352C] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px]">
                    <th className="py-3 px-4 font-semibold">Réf & Acheteur</th>
                    <th className="py-3 px-3 font-semibold">Produit & Spécification</th>
                    <th className="py-3 px-3 font-semibold">Volume Demandé</th>
                    <th className="py-3 px-3 font-semibold">Montant Total</th>
                    <th className="py-3 px-3 font-semibold">Fenêtre Livraison</th>
                    <th className="py-3 px-3 font-semibold">Réservation Récolte</th>
                    <th className="py-3 px-3 font-semibold">Statut</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {filteredOrders.map((ord) => {
                    const primaryLine = ord.lines[0];
                    const reservedTons = primaryLine?.reservedQuantityTons || 0;
                    const requestedTons = primaryLine?.quantityTons || 0;
                    const isFullyCovered = reservedTons >= requestedTons && requestedTons > 0;

                    return (
                      <tr
                        key={ord.id}
                        className="hover:bg-[#F7F8F4]/60 dark:hover:bg-[#18261F]/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#202924] dark:text-[#EEF4F0]">{ord.buyerName}</div>
                          <div className="text-[10px] text-[#8A988F] font-mono">{ord.orderNumber} &bull; {ord.buyerCountry}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-[#202924] dark:text-[#EEF4F0]">{primaryLine?.cropName || 'Cultures mixtes'}</div>
                          <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5]">{ord.incoterm} &bull; {ord.deliveryDestination}</div>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#202924] dark:text-[#EEF4F0]">
                          {requestedTons.toFixed(1)} T
                        </td>
                        <td className="py-3.5 px-3 font-mono">
                          <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {(ord.totalAmount / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}M {ord.currency}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#202924] dark:text-[#EEF4F0]">
                          <span className="text-[11px]">{ord.deliveryWindowEnd}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          {reservedTons > 0 ? (
                            <div>
                              <span className={`font-mono text-xs font-semibold ${isFullyCovered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                                {reservedTons.toFixed(1)} T réservées
                              </span>
                              {!isFullyCovered && (
                                <span className="text-[10px] text-amber-600 block">
                                  Manque {(requestedTons - reservedTons).toFixed(1)} T
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                              Non alloué
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge
                            variant={
                              ord.status === 'DELIVERED' || ord.status === 'COMPLETED'
                                ? 'success'
                                : ord.status === 'CONFIRMED' || ord.status === 'IN_PRODUCTION'
                                ? 'forest'
                                : ord.status === 'PROCESSING' || ord.status === 'QUALITY_INSPECTION'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="xs"
                          >
                            {ord.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="px-2.5 py-1 text-xs text-[#2F7D4A] dark:text-[#77A96B] font-semibold hover:underline"
                          >
                            Détails &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: BUYERS CRM DIRECTORY */}
      {subTab === 'buyers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buyers.map((buyer) => (
            <Card key={buyer.id} padding="md" className="flex flex-col justify-between hover:border-[#2F7D4A] transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E1E7E0] dark:border-[#24352C]">
                  <div>
                    <h3 className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">{buyer.name}</h3>
                    <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5] font-mono">
                      {buyer.locality} &bull; {buyer.countryCode} ({buyer.market})
                    </span>
                  </div>
                  <Badge variant={buyer.leadStatus === 'ACTIVE_CONTRACT' ? 'forest' : 'success'} size="xs">
                    {buyer.leadStatus}
                  </Badge>
                </div>

                <div className="space-y-2 mt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#8A988F] uppercase font-mono">Interlocuteur</span>
                    <div className="font-medium text-[#202924] dark:text-[#EEF4F0]">
                      {buyer.contacts[0]?.fullName || 'Contact non renseigné'}
                    </div>
                    <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5]">
                      {buyer.contacts[0]?.email} &bull; {buyer.contacts[0]?.phone}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A988F] uppercase font-mono">Spéculations d'intérêt</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {buyer.productsOfInterest.map((p, idx) => (
                        <span key={idx} className="text-[10px] bg-[#F0F4EE] dark:bg-[#1B2B23] text-[#173F35] dark:text-[#77A96B] px-1.5 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A988F] uppercase font-mono">Normes & Certifications</span>
                    <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5]">
                      {buyer.certificationsRequired.length > 0 ? buyer.certificationsRequired.join(', ') : 'Standard'}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] text-[#8A988F] uppercase font-mono">Source de Contact</span>
                    <div className="text-[11px] text-[#2F7D4A] dark:text-[#77A96B] font-medium">
                      {buyer.sourceOfContact}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C] flex items-center justify-between">
                <span className="text-[10px] text-[#8A988F]">
                  {buyer.communications.length} échange(s)
                </span>
                <button
                  onClick={() => setSelectedBuyer(buyer)}
                  className="text-xs text-[#2F7D4A] dark:text-[#77A96B] font-semibold hover:underline"
                >
                  Fiche & Historique &rarr;
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* SUBTAB 3: SUPPLY & DEMAND BALANCE MATRIX */}
      {subTab === 'supply_demand' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#F7F8F4] dark:bg-[#18261F] rounded-xl border border-[#E1E7E0] dark:border-[#283D33]">
            <h2 className="text-sm font-bold text-[#202924] dark:text-[#EEF4F0] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#2F7D4A]" />
              Matrice d'Arbitrage Offre vs Demande (Overselling Prevention)
            </h2>
            <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-1">
              Cette matrice compare en temps réel la demande contractuelle des acheteurs aux prévisions de récolte et stocks physiques disponibles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {supplyBalances.map((item, idx) => (
              <Card key={idx} padding="md">
                <div className="flex items-start justify-between pb-3 border-b border-[#E1E7E0] dark:border-[#24352C]">
                  <div>
                    <h3 className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">{item.cropName}</h3>
                    <span className="text-[10px] text-[#66736B] dark:text-[#9EB0A5]">
                      Parcelles: {item.activeContributingFarms.join(', ') || 'Kindia / Dalaba'}
                    </span>
                  </div>
                  <Badge
                    variant={
                      item.balanceStatus === 'SURPLUS' || item.balanceStatus === 'BALANCED'
                        ? 'success'
                        : item.balanceStatus === 'SHORTAGE_WARNING'
                        ? 'warning'
                        : 'error'
                    }
                    size="xs"
                  >
                    {item.balanceStatus === 'SURPLUS' ? 'Excédentaire' : item.balanceStatus === 'BALANCED' ? 'Équilibré' : 'Déficit Risque'}
                  </Badge>
                </div>

                <div className="space-y-2 mt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#66736B] dark:text-[#9EB0A5]">Demande Acheteurs :</span>
                    <span className="font-mono font-bold text-[#202924] dark:text-[#EEF4F0]">{item.totalBuyerDemandTons} T</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66736B] dark:text-[#9EB0A5]">Prévision Récolte :</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{item.forecastHarvestTons} T</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66736B] dark:text-[#9EB0A5]">Stock Récolté Réel :</span>
                    <span className="font-mono font-medium">{item.actualHarvestedStockTons} T</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66736B] dark:text-[#9EB0A5]">Engagements Réservés :</span>
                    <span className="font-mono font-medium text-amber-600">{item.totalCommittedTons} T</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E1E7E0] dark:border-[#24352C]">
                    <span className="font-semibold text-[#202924] dark:text-[#EEF4F0]">Disponible Non Engagé :</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.unreservedAvailableTons} T</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[10px] text-[#8A988F] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Réservations transactionnelles garanties contre le sur-engagement.</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      <Modal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        title="Créer une Nouvelle Commande Commerciale"
        subtitle="Enregistrez un engagement acheteur lié au calendrier maître"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
              Acheteur Partenaire (CRM)
            </label>
            <select
              value={newBuyerId}
              onChange={(e) => setNewBuyerId(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
            >
              {buyers.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.locality})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Culture / Spéculation
              </label>
              <select
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
              >
                <option value="Piment / Hot Pepper">Piment / Hot Pepper</option>
                <option value="Manioc / Cassava">Manioc / Cassava</option>
                <option value="Pastèque / Watermelon">Pastèque / Watermelon</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Volume Commandé (Tonnes)
              </label>
              <input
                type="number"
                step="0.5"
                value={newQtyTons}
                onChange={(e) => setNewQtyTons(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Prix Unitaire (GNF / kg)
              </label>
              <input
                type="number"
                value={newPricePerKg}
                onChange={(e) => setNewPricePerKg(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Incoterm
              </label>
              <select
                value={newIncoterm}
                onChange={(e) => setNewIncoterm(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
              >
                <option value="FOB">FOB Conakry</option>
                <option value="DAP">DAP Destination Acheteur</option>
                <option value="EXW">EXW Sortie d'Exploitation</option>
                <option value="CIF">CIF Port Acheteur</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Début Fenêtre de Livraison
              </label>
              <input
                type="date"
                value={newDeliveryStart}
                onChange={(e) => setNewDeliveryStart(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Date Limite d'Échéance
              </label>
              <input
                type="date"
                value={newDeliveryEnd}
                onChange={(e) => setNewDeliveryEnd(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
              Destination / Lieu de Mise à Disposition
            </label>
            <input
              type="text"
              value={newDestination}
              onChange={(e) => setNewDestination(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowNewOrderModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Enregistrer & Synchroniser
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE BUYER MODAL */}
      <Modal
        isOpen={showNewBuyerModal}
        onClose={() => setShowNewBuyerModal(false)}
        title="Ajouter un Nouvel Acheteur B2B"
        subtitle="Enregistrez un partenaire commercial dans le CRM"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBuyer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
              Raison Sociale / Nom Entreprise *
            </label>
            <input
              type="text"
              required
              value={newBuyerName}
              onChange={(e) => setNewBuyerName(e.target.value)}
              placeholder="ex: West Africa Trading SA"
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Type d'Acteur
              </label>
              <select
                value={newBuyerType}
                onChange={(e) => setNewBuyerType(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
              >
                <option value="EXPORTER">Exportateur Fruits & Légumes</option>
                <option value="IMPORTER">Importateur International</option>
                <option value="PROCESSOR">Transformateur Industriel</option>
                <option value="WHOLESALER">Grossiste Régional</option>
                <option value="DISTRIBUTOR">Distributeur Urbain</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Pays & Marché
              </label>
              <input
                type="text"
                value={newBuyerMarket}
                onChange={(e) => setNewBuyerMarket(e.target.value)}
                placeholder="ex: Export UE (Rungis / Rotterdam)"
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Contact Clé
              </label>
              <input
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Prénom & Nom"
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Email
              </label>
              <input
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                placeholder="achats@societe.com"
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
                Téléphone
              </label>
              <input
                type="text"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="+224 6..."
                className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowNewBuyerModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Enregistrer Acheteur
            </Button>
          </div>
        </form>
      </Modal>

      {/* ORDER DETAILS & STATUS MACHINE MODAL */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Détails Commande ${selectedOrder.orderNumber}`}
          subtitle={`${selectedOrder.buyerName} — ${selectedOrder.lines[0]?.cropName}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            {/* KPI summary */}
            <div className="grid grid-cols-3 gap-3 bg-[#F7F8F4] dark:bg-[#18261F] p-4 rounded-xl border border-[#E1E7E0] dark:border-[#283D33]">
              <div>
                <span className="text-[10px] text-[#8A988F] uppercase font-mono">Volume Total</span>
                <div className="text-base font-bold font-mono text-[#202924] dark:text-[#EEF4F0] mt-0.5">
                  {selectedOrder.lines[0]?.quantityTons} Tonnes
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[#8A988F] uppercase font-mono">Montant Global</span>
                <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {(selectedOrder.totalAmount).toLocaleString('fr-FR')} {selectedOrder.currency}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[#8A988F] uppercase font-mono">Statut Actuel</span>
                <div className="mt-1">
                  <Badge variant="forest" size="xs">{selectedOrder.status}</Badge>
                </div>
              </div>
            </div>

            {/* Status Transition Control */}
            <div className="p-3 bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C]">
              <span className="text-[10px] font-mono uppercase font-bold text-[#66736B] dark:text-[#9EB0A5] block mb-2">
                Actions sur le cycle de commande (State Machine)
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.status === 'INQUIRY' && (
                  <Button variant="primary" size="xs" onClick={() => handleTransitionStatus(selectedOrder.id, 'QUOTED')}>
                    Émettre le Devis Formel
                  </Button>
                )}
                {selectedOrder.status === 'QUOTED' && (
                  <Button variant="forest" size="xs" onClick={() => handleTransitionStatus(selectedOrder.id, 'CONFIRMED')}>
                    Confirmer le Contrat Acheteur
                  </Button>
                )}
                {selectedOrder.status === 'CONFIRMED' && (
                  <>
                    <Button variant="primary" size="xs" onClick={() => handleTransitionStatus(selectedOrder.id, 'IN_PRODUCTION')}>
                      Lancer la Production Agricole
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setResOrderId(selectedOrder.id);
                        setResOrderLineId(selectedOrder.lines[0]?.id || '');
                        setShowReservationModal(true);
                      }}
                      icon={<Lock className="w-3.5 h-3.5" />}
                    >
                      Allouer Récolte Parcelle
                    </Button>
                  </>
                )}
                {selectedOrder.status === 'IN_PRODUCTION' && (
                  <Button variant="forest" size="xs" onClick={() => handleTransitionStatus(selectedOrder.id, 'PROCESSING')}>
                    Transférer en Usinage & Séchage
                  </Button>
                )}
                {selectedOrder.status === 'PROCESSING' && (
                  <Button variant="forest" size="xs" onClick={() => handleTransitionStatus(selectedOrder.id, 'QUALITY_INSPECTION')}>
                    Déclencher Inspection ONPQ
                  </Button>
                )}
                {selectedOrder.status === 'QUALITY_INSPECTION' && (
                  <Button variant="forest" size="xs" onClick={() => handleTransitionStatus(selectedOrder.id, 'DISPATCHED')}>
                    Valider le Départ Convoi
                  </Button>
                )}
                {selectedOrder.status === 'DISPATCHED' && (
                  <Button variant="forest" size="xs" onClick={() => handleTransitionStatus(selectedOrder.id, 'DELIVERED')}>
                    Confirmer Réception Acheteur
                  </Button>
                )}
              </div>
            </div>

            {/* Document Checklist & Payment Milestones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#F7F8F4] dark:bg-[#18261F] rounded-lg border border-[#E1E7E0] dark:border-[#283D33]">
                <span className="text-[10px] font-mono uppercase font-bold text-[#66736B] dark:text-[#9EB0A5] block mb-1.5">
                  Documents Exigés pour Exportation
                </span>
                <ul className="space-y-1">
                  {selectedOrder.requiredDocuments.map((doc, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-xs text-[#202924] dark:text-[#EEF4F0]">
                      <FileText className="w-3.5 h-3.5 text-[#2F7D4A]" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-[#F7F8F4] dark:bg-[#18261F] rounded-lg border border-[#E1E7E0] dark:border-[#283D33]">
                <span className="text-[10px] font-mono uppercase font-bold text-[#66736B] dark:text-[#9EB0A5] block mb-1.5">
                  Échéances de Règlement
                </span>
                <div className="space-y-1.5">
                  {selectedOrder.paymentMilestones.map((pm, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span>{pm.milestoneName}</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {pm.amount.toLocaleString()} GNF
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* BUYER CRM PROFILE MODAL */}
      {selectedBuyer && (
        <Modal
          isOpen={!!selectedBuyer}
          onClose={() => setSelectedBuyer(null)}
          title={`Fiche Acheteur : ${selectedBuyer.name}`}
          subtitle={`${selectedBuyer.locality} &bull; ${selectedBuyer.countryCode} (${selectedBuyer.market})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F7F8F4] dark:bg-[#18261F] rounded-xl border border-[#E1E7E0] dark:border-[#283D33]">
              <div>
                <span className="text-[10px] text-[#8A988F] uppercase font-mono">Statut de Vérification</span>
                <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {selectedBuyer.verificationStatus === 'VERIFIED' ? 'Acheteur Vérifié & Agréé' : 'Auto-enregistré'}
                </div>
              </div>
              <Badge variant="forest" size="xs">
                {selectedBuyer.sourceOfContact}
              </Badge>
            </div>

            {/* Communication Log */}
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#66736B] dark:text-[#9EB0A5] block mb-2">
                Historique des Échanges Commerciaux
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedBuyer.communications.map((comm) => (
                  <div key={comm.id} className="p-2.5 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-lg">
                    <div className="flex justify-between text-[10px] text-[#8A988F]">
                      <span className="font-semibold text-[#202924] dark:text-[#EEF4F0]">{comm.authorName}</span>
                      <span>{comm.date.split('T')[0]}</span>
                    </div>
                    <div className="text-xs text-[#202924] dark:text-[#EEF4F0] mt-1">{comm.summary}</div>
                  </div>
                ))}
              </div>

              {/* Add Note Form */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCommSummary}
                  onChange={(e) => setNewCommSummary(e.target.value)}
                  placeholder="Consigner un appel, email ou compte-rendu de réunion..."
                  className="flex-1 text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg px-3 py-1.5 text-[#202924] dark:text-[#EEF4F0]"
                />
                <Button variant="primary" size="xs" onClick={() => handleAddCommunication(selectedBuyer.id)}>
                  Consigner
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* SUPPLY RESERVATION MODAL (OVERSELLING PREVENTION) */}
      <Modal
        isOpen={showReservationModal}
        onClose={() => setShowReservationModal(false)}
        title="Allouer / Réserver Récolte de Parcelle"
        subtitle="Verrouillage transactionnel pour empêcher le sur-engagement"
        maxWidth="md"
      >
        <form onSubmit={handleMakeReservation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
              Campagne / Parcelle Source
            </label>
            <select
              value={resCampaignId}
              onChange={(e) => setResCampaignId(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0]"
            >
              <option value="camp-pepper-s17-01">Campagne Piment S17 — Friguiagbé 2026 (Kindia)</option>
              <option value="camp-cassava-01">Campagne Manioc Bonoua — Kindia Nord</option>
              <option value="camp-pepper-birdseye-02">Campagne Piment Bird's Eye — Dalaba</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1">
              Quantité à Réserver (Tonnes)
            </label>
            <input
              type="number"
              step="0.5"
              value={resQtyTons}
              onChange={(e) => setResQtyTons(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#14201A] border border-[#CDD6CC] dark:border-[#283D33] rounded-lg p-2 text-[#202924] dark:text-[#EEF4F0] font-mono"
            />
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Si la quantité dépasse le volume disponible non engagé, le système rejettera automatiquement la réservation pour protéger la crédibilité commerciale de l'organisation.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E1E7E0] dark:border-[#24352C]">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowReservationModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirmer la Réservation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
