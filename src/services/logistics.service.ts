/**
 * FARMING CALENDAR — LOGISTICS & EXPORT TRADE SERVICE (PHASE 7)
 * Domestic and international trade, shipment planning, compliance document tracking,
 * delay propagation, scenario risk simulation, and quality dispatch gating.
 */

import { getState, commitState } from '../db/connection.ts';
import { AuthSession, UserRole } from '../types/organization.ts';
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
} from '../types/logistics.ts';
import { logAuditEvent } from './audit.service.ts';
import { CalendarService } from './calendar.service.ts';

export class LogisticsService {
  /**
   * RBAC authorization check
   */
  public static assertCanManageLogistics(role: UserRole): void {
    const allowed: UserRole[] = [
      'COMMERCIAL_MANAGER',
      'ORG_ADMIN',
      'MANAGER',
      'OPERATIONS_STAFF',
      'PLATFORM_OWNER'
    ];
    if (!allowed.includes(role)) {
      throw new Error(`SECURITY_ERROR: Role ${role} is not authorized to manage shipments and export compliance.`);
    }
  }

  private static getOrgId(session: AuthSession): string {
    return session.organization?.id || session.user?.activeOrganizationId || '';
  }

  private static isPlatformOwner(session: AuthSession): boolean {
    return session.user?.role === 'PLATFORM_OWNER';
  }

  /**
   * List shipments with tenant isolation and optional filtering
   */
  public static async listShipments(
    session: AuthSession,
    filters?: {
      destinationMarket?: string;
      transportMode?: string;
      currentStatus?: string;
      orderId?: string;
      search?: string;
    }
  ): Promise<ShipmentMaster[]> {
    const state = getState();
    const orgId = this.getOrgId(session);
    const isOwner = this.isPlatformOwner(session);

    let list = (state.shipments || []).filter((s: any) => {
      if (!isOwner && s.organization_id !== orgId) return false;
      if (s.is_deleted) return false;
      if (filters?.destinationMarket && filters.destinationMarket !== 'ALL' && s.destination_market !== filters.destinationMarket) return false;
      if (filters?.transportMode && filters.transportMode !== 'ALL' && s.transport_mode !== filters.transportMode) return false;
      if (filters?.currentStatus && filters.currentStatus !== 'ALL' && s.current_status !== filters.currentStatus) return false;
      if (filters?.orderId && s.order_id !== filters.orderId) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const matchesNum = s.shipment_number?.toLowerCase().includes(q);
        const matchesBuyer = s.buyer_name?.toLowerCase().includes(q);
        const matchesCarrier = s.carrier_name?.toLowerCase().includes(q);
        const matchesDest = s.destination_port_or_city?.toLowerCase().includes(q);
        if (!matchesNum && !matchesBuyer && !matchesCarrier && !matchesDest) return false;
      }
      return true;
    });

    // Mask confidential financial documents if caller is VIEWER or unauthorized
    const canViewFinancials = ['ORG_ADMIN', 'COMMERCIAL_MANAGER', 'FINANCE_MANAGER', 'MANAGER', 'PLATFORM_OWNER'].includes(session.user?.role || '');

    return list.map((s: any) => this.mapDbShipmentToModel(s, canViewFinancials));
  }

  /**
   * Get single shipment by ID
   */
  public static async getShipmentById(session: AuthSession, shipmentId: string): Promise<ShipmentMaster> {
    const state = getState();
    const shipment = (state.shipments || []).find((s: any) => s.id === shipmentId && !s.is_deleted);
    if (!shipment) {
      throw new Error(`Shipment not found: ${shipmentId}`);
    }

    const orgId = this.getOrgId(session);
    if (!this.isPlatformOwner(session) && shipment.organization_id !== orgId) {
      throw new Error(`SECURITY_ERROR: Cross-tenant access blocked. Cannot access shipment belonging to another organization.`);
    }

    const canViewFinancials = ['ORG_ADMIN', 'COMMERCIAL_MANAGER', 'FINANCE_MANAGER', 'MANAGER', 'PLATFORM_OWNER'].includes(session.user?.role || '');
    return this.mapDbShipmentToModel(shipment, canViewFinancials);
  }

  /**
   * Create new shipment linked to order and approved inventory lots
   */
  public static async createShipment(
    session: AuthSession,
    data: {
      orderId: string;
      orderNumber?: string;
      buyerId?: string;
      buyerName?: string;
      transportMode: TransportMode;
      carrierName: string;
      carrierContactPerson?: string;
      carrierContactPhone?: string;
      containerOrVehicleId: string;
      sealNumber?: string;
      dispatchLocation?: string;
      destinationPortOrCity: string;
      destinationCountry: string;
      destinationMarket: 'EUROPEAN_UNION' | 'CEDEAO' | 'DOMESTIC_GUINEA' | 'NORTH_AMERICA' | 'MIDDLE_EAST';
      incoterm?: any;
      linkedBatches: Array<{
        inventoryItemId: string;
        batchNumber: string;
        productName: string;
        quantityAllocated: number;
        unit: string;
      }>;
      plannedPickupDate: string;
      estimatedArrivalDate: string;
      temperatureHandling?: any;
      packagingPallet?: any;
      costs?: any;
      specialInstructions?: string;
    }
  ): Promise<ShipmentMaster> {
    this.assertCanManageLogistics(session.user.role);
    const state = getState();
    const orgId = this.getOrgId(session);

    // 1. Verify order existence and tenancy
    const order = (state.commercial_orders || []).find((o: any) => o.id === data.orderId && !o.is_deleted);
    if (!order) {
      throw new Error(`Commercial order not found: ${data.orderId}`);
    }
    if (!this.isPlatformOwner(session) && order.organization_id !== orgId) {
      throw new Error(`SECURITY_ERROR: Order belongs to another organization.`);
    }

    // 2. QUALITY DISPATCH GATING:
    // Inspect each linked batch to ensure unapproved or rejected lots are BLOCKED
    const verifiedBatches: any[] = [];
    let isBlocked = false;
    let blockReason = '';

    for (const batchInput of data.linkedBatches) {
      // Find quality inspection record for this batch if it exists
      const qi = (state.quality_inspections || []).find(
        (q: any) => q.batch_number === batchInput.batchNumber && !q.is_deleted
      );

      let releaseStatus: 'ACCEPTED_GRADE_A' | 'ACCEPTED_GRADE_B' | 'PENDING' | 'REJECTED' = 'PENDING';
      let inspectionNumber = '';

      if (qi) {
        releaseStatus = qi.release_status;
        inspectionNumber = qi.inspection_number;
      }

      // Check inventory item quarantine state
      const invItem = (state.inventory_items || []).find((i: any) => i.id === batchInput.inventoryItemId && !i.is_deleted);
      if (invItem && invItem.status === 'QUARANTINED') {
        releaseStatus = 'REJECTED';
      }

      if (releaseStatus === 'REJECTED') {
        isBlocked = true;
        blockReason = `DISPATCH_BLOCKED: Inventory lot '${batchInput.batchNumber}' has quality status REJECTED. Unapproved or contaminated produce is strictly forbidden from dispatch.`;
        throw new Error(blockReason);
      }

      verifiedBatches.push({
        inventoryItemId: batchInput.inventoryItemId,
        batchNumber: batchInput.batchNumber,
        productName: batchInput.productName,
        quantityAllocated: batchInput.quantityAllocated,
        unit: batchInput.unit,
        qualityReleaseStatus: releaseStatus,
        inspectionNumber
      });
    }

    const shipmentId = `shp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const shipmentNumber = `SHP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    // 3. Setup Configurable Document Matrix according to route and destination market
    const generatedDocs = this.generateComplianceDocumentChecklist(shipmentId, data.destinationMarket, data.transportMode);

    // 4. Generate Shipment Milestones
    const generatedMilestones = this.generateMilestonesForRoute(
      data.transportMode,
      data.dispatchLocation || 'Entrepôt Central Friguiagbé, Guinée',
      data.destinationPortOrCity,
      data.plannedPickupDate,
      data.estimatedArrivalDate
    );

    // 5. Calculate weights & transparent cost breakdown
    const netWeightKg = verifiedBatches.reduce((acc, b) => acc + (b.unit === 'TON' ? b.quantityAllocated * 1000 : b.quantityAllocated), 0);
    const packaging = data.packagingPallet || {
      palletType: 'EURO_PALLET_1200x800',
      palletCount: Math.ceil(netWeightKg / 500) || 1,
      boxesOrBagsPerPallet: 25,
      totalPackageCount: Math.ceil(netWeightKg / 20) || 50,
      packagingMaterial: 'Emballage export standard certifié',
      netWeightKg,
      grossWeightKg: Math.round(netWeightKg * 1.08),
      tareWeightKg: Math.round(netWeightKg * 0.08),
      cornerProtectors: true,
      strappedAndStretchWrapped: true
    };

    const costs = data.costs || {
      freightCost: data.transportMode === 'AIR_FREIGHT' ? netWeightKg * 28000 : netWeightKg * 4200,
      handlingCost: 2500000,
      customsClearanceCost: data.destinationMarket === 'DOMESTIC_GUINEA' ? 0 : 4500000,
      insuranceCost: 1800000,
      packagingCost: 3200000,
      portTerminalHandlingCost: data.transportMode === 'MARITIME' ? 2800000 : 0,
      otherCosts: 500000,
      totalCost: 0,
      currency: 'GNF',
      costPerKg: 0,
      isLiveCarrierIntegration: false,
      rateNotes: 'Calcul prévisionnel interne basé sur les grilles tarifaires de référence.'
    };
    costs.totalCost = costs.freightCost + costs.handlingCost + costs.customsClearanceCost + costs.insuranceCost + costs.packagingCost + costs.portTerminalHandlingCost + costs.otherCosts;
    costs.costPerKg = Math.round(costs.totalCost / (netWeightKg || 1));

    const newShipmentRecord: any = {
      id: shipmentId,
      organization_id: orgId,
      shipment_number: shipmentNumber,
      order_id: order.id,
      order_number: order.order_number,
      buyer_id: order.buyer_id,
      buyer_name: order.buyer_name,
      destination_market: data.destinationMarket,
      dispatch_location: data.dispatchLocation,
      destination_port_or_city: data.destinationPortOrCity,
      destination_country: data.destinationCountry,
      incoterm: data.incoterm || order.incoterm || 'FOB',
      transport_mode: data.transportMode,
      carrier_name: data.carrierName,
      carrier_contact_person: data.carrierContactPerson,
      carrier_contact_phone: data.carrierContactPhone,
      container_or_vehicle_id: data.containerOrVehicleId,
      seal_number: data.sealNumber,
      linked_batches: verifiedBatches,
      total_net_weight_kg: netWeightKg,
      total_gross_weight_kg: packaging.grossWeightKg,
      temperature_handling: data.temperatureHandling || {
        regime: 'AMBIENT_DRY',
        targetTempC: 22,
        minTempC: 15,
        maxTempC: 30,
        requiresContinuousColdChainLog: false,
        preCoolingRequired: false
      },
      packaging_pallet: packaging,
      costs,
      planned_pickup_date: data.plannedPickupDate,
      estimated_arrival_date: data.estimatedArrivalDate,
      current_status: 'DRAFT_PLANNING',
      total_delay_hours: 0,
      is_dispatch_blocked: isBlocked,
      dispatch_block_reason: blockReason,
      milestones: generatedMilestones,
      documents: generatedDocs,
      responsible_staff_user_id: session.user.id,
      responsible_staff_name: session.user.fullName,
      specialInstructions: data.specialInstructions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    if (!state.shipments) state.shipments = [];
    state.shipments.push(newShipmentRecord);

    // 6. Sync with Master Calendar
    try {
      const calEvent = await CalendarService.createEvent({
        organizationId: orgId,
        title: `Expédition ${shipmentNumber} (${order.buyer_name})`,
        description: `Transport ${data.transportMode} de ${netWeightKg.toLocaleString()} kg vers ${data.destinationPortOrCity}. Statut: Planification.`,
        eventType: 'GENERAL_EVENT',
        status: 'PENDING',
        priority: 'HIGH',
        startDateTime: data.plannedPickupDate,
        endDateTime: data.estimatedArrivalDate,
        allDay: false,
        timezone: 'Africa/Conakry',
        linkedOrderId: order.id,
        linkedShipmentId: shipmentId,
        notes: `Expédition ${shipmentNumber} rattachée à la commande ${order.order_number}`,
        caller: {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
          isPlatformOwner: this.isPlatformOwner(session),
          organizationId: orgId
        }
      });
      newShipmentRecord.linked_calendar_event_id = calEvent.id;
    } catch (calErr) {
      console.warn('[LOGISTICS] Could not create linked calendar milestone:', calErr);
    }

    commitState(state);

    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role,
      action: 'SHIPMENT_CREATED',
      targetEntity: 'SHIPMENT',
      targetEntityId: shipmentId,
      details: {
        shipmentNumber,
        orderNumber: order.order_number,
        buyerName: order.buyer_name,
        netWeightKg,
        transportMode: data.transportMode
      }
    });

    return this.mapDbShipmentToModel(newShipmentRecord, true);
  }

  /**
   * Update shipment milestone and propagate delay recalculations
   */
  public static async updateShipmentMilestone(
    session: AuthSession,
    shipmentId: string,
    milestoneId: string,
    data: {
      status: MilestoneStatus;
      actualDate?: string;
      delayHours?: number;
      notes?: string;
    }
  ): Promise<ShipmentMaster> {
    this.assertCanManageLogistics(session.user.role);
    const state = getState();
    const shipment = (state.shipments || []).find((s: any) => s.id === shipmentId && !s.is_deleted);
    if (!shipment) throw new Error(`Shipment not found: ${shipmentId}`);

    const orgId = this.getOrgId(session);
    if (!this.isPlatformOwner(session) && shipment.organization_id !== orgId) {
      throw new Error(`SECURITY_ERROR: Access denied to shipment.`);
    }

    const milestoneIndex = (shipment.milestones || []).findIndex((m: any) => m.id === milestoneId);
    if (milestoneIndex === -1) throw new Error(`Milestone not found: ${milestoneId}`);

    const milestone = shipment.milestones[milestoneIndex];
    milestone.status = data.status;
    if (data.actualDate) milestone.actualDate = data.actualDate;
    if (data.notes) milestone.notes = data.notes;

    const previousDelay = milestone.delayHours || 0;
    const additionalDelay = Number(data.delayHours || 0);
    milestone.delayHours = additionalDelay;

    // DELAY PROPAGATION:
    // If delay introduced or changed, cascade forward to downstream milestones and recalculate estimatedArrivalDate
    const netDelayDeltaHours = additionalDelay - previousDelay;
    if (netDelayDeltaHours !== 0) {
      shipment.total_delay_hours = (shipment.total_delay_hours || 0) + netDelayDeltaHours;

      // Cascade to subsequent milestones
      for (let i = milestoneIndex + 1; i < shipment.milestones.length; i++) {
        const ms = shipment.milestones[i];
        if (ms.plannedDate) {
          const originalDate = new Date(ms.plannedDate);
          originalDate.setHours(originalDate.getHours() + netDelayDeltaHours);
          ms.plannedDate = originalDate.toISOString();
        }
      }

      // Recalculate estimated arrival date
      const currentArrival = new Date(shipment.estimated_arrival_date);
      currentArrival.setHours(currentArrival.getHours() + netDelayDeltaHours);
      shipment.estimated_arrival_date = currentArrival.toISOString();

      if (shipment.total_delay_hours > 0 && shipment.current_status !== 'DELIVERED') {
        shipment.current_status = 'DELAYED';
      } else if (shipment.total_delay_hours <= 0 && shipment.current_status === 'DELAYED') {
        shipment.current_status = 'DISPATCHED_IN_TRANSIT';
      }
    }

    shipment.updated_at = new Date().toISOString();
    commitState(state);

    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role,
      action: 'SHIPMENT_MILESTONE_UPDATED',
      targetEntity: 'SHIPMENT_MILESTONE',
      targetEntityId: milestoneId,
      details: {
        shipmentNumber: shipment.shipment_number,
        milestoneName: milestone.name,
        newStatus: data.status,
        delayHours: additionalDelay,
        newEstimatedArrival: shipment.estimated_arrival_date
      }
    });

    return this.mapDbShipmentToModel(shipment, true);
  }

  /**
   * Update compliance document review status
   */
  public static async updateDocumentStatus(
    session: AuthSession,
    shipmentId: string,
    documentId: string,
    data: {
      status: DocumentComplianceStatus;
      documentNumber?: string;
      expiryDate?: string;
      rejectionReason?: string;
      notes?: string;
    }
  ): Promise<ShipmentMaster> {
    this.assertCanManageLogistics(session.user.role);
    const state = getState();
    const shipment = (state.shipments || []).find((s: any) => s.id === shipmentId && !s.is_deleted);
    if (!shipment) throw new Error(`Shipment not found: ${shipmentId}`);

    const orgId = this.getOrgId(session);
    if (!this.isPlatformOwner(session) && shipment.organization_id !== orgId) {
      throw new Error(`SECURITY_ERROR: Access denied.`);
    }

    const doc = (shipment.documents || []).find((d: any) => d.id === documentId);
    if (!doc) throw new Error(`Compliance document not found: ${documentId}`);

    doc.status = data.status;
    if (data.documentNumber) doc.documentNumber = data.documentNumber;
    if (data.expiryDate) doc.expiryDate = data.expiryDate;
    if (data.rejectionReason) doc.rejectionReason = data.rejectionReason;
    if (data.notes) doc.notes = data.notes;

    if (data.status === 'APPROVED_VALID') {
      doc.verifiedByUserId = session.user.id;
      doc.verifiedByUserName = session.user.fullName;
      doc.verifiedAt = new Date().toISOString();
    }

    // Check if any critical document was rejected
    if (data.status === 'REJECTED_NON_COMPLIANT') {
      shipment.is_dispatch_blocked = true;
      shipment.dispatch_block_reason = `DISPATCH_HOLD: Document '${doc.title}' has been rejected (${data.rejectionReason || 'Non-conforme'}). Corrective documents required.`;
    }

    shipment.updated_at = new Date().toISOString();
    commitState(state);

    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role,
      action: 'COMPLIANCE_DOCUMENT_UPDATED',
      targetEntity: 'COMPLIANCE_DOCUMENT',
      targetEntityId: documentId,
      details: {
        shipmentNumber: shipment.shipment_number,
        documentType: doc.documentType,
        status: data.status,
        rejectionReason: data.rejectionReason
      }
    });

    return this.mapDbShipmentToModel(shipment, true);
  }

  /**
   * Run scenario planning & risk simulation for delayed or compromised shipments
   */
  public static async simulateRiskScenario(
    session: AuthSession,
    shipmentId: string,
    scenarioType: 'THREE_DAY_TRANSPORT_DELAY' | 'MISSED_VESSEL_CONNECTION' | 'REJECTED_CUSTOMS_DOCUMENT' | 'PACKAGING_SHORTAGE' | 'FREIGHT_COST_INCREASE',
    customParams?: { delayHours?: number; costIncreasePct?: number }
  ): Promise<ScenarioSimulationResult> {
    const shipment = await this.getShipmentById(session, shipmentId);
    const state = getState();
    const order = (state.commercial_orders || []).find((o: any) => o.id === shipment.orderId);

    const originalDeadline = order?.delivery_window_end ? new Date(order.delivery_window_end) : new Date(shipment.estimatedArrivalDate);

    let delayHoursAdded = 0;
    let scenarioName = '';
    let productQualityRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'CRITICAL_SPOILAGE' = 'NONE';
    let estimatedCostImpactGNF = 0;
    let costImpactReason = '';
    let affectedDocuments: string[] = [];
    let mitigation = '';

    const arrivalDate = new Date(shipment.estimatedArrivalDate);

    switch (scenarioType) {
      case 'THREE_DAY_TRANSPORT_DELAY':
        delayHoursAdded = customParams?.delayHours || 72;
        scenarioName = 'Simulation Retard Routier / Douanier de 3 Jours (+72h)';
        arrivalDate.setHours(arrivalDate.getHours() + delayHoursAdded);
        estimatedCostImpactGNF = 4500000; // 1.5M GNF/day immobilization
        costImpactReason = 'Frais d’immobilisation transporteur et surestaries conteneur (3 jours).';
        if (shipment.temperatureHandling.regime === 'REFRIGERATED_COLD_CHAIN') {
          productQualityRisk = 'MEDIUM';
          mitigation = 'Vérifier l’alimentation continue du groupe frigorifique (GenSet). Effectuer un contrôle de fermeté et de taux de sucre à l’arrivée.';
        } else {
          productQualityRisk = 'LOW';
          mitigation = 'Aviser l’acheteur du nouveau créneau de livraison pour réajuster le planning de distribution.';
        }
        break;

      case 'MISSED_VESSEL_CONNECTION':
        delayHoursAdded = 168; // 7 days (next weekly sailing)
        scenarioName = 'Rupture de Correspondance / Navire Manqué (+7 Jours)';
        arrivalDate.setHours(arrivalDate.getHours() + delayHoursAdded);
        estimatedCostImpactGNF = 12500000; // Port storage, plug-in fees, re-booking
        costImpactReason = 'Frais de branchement conteneur frigorifique PAC (7 jours) + pénalité de re-booking maritime.';
        affectedDocuments = ['BILL_OF_LADING', 'PHYTOSANITARY_CERTIFICATE'];
        if (shipment.temperatureHandling.regime === 'REFRIGERATED_COLD_CHAIN') {
          productQualityRisk = 'CRITICAL_SPOILAGE';
          mitigation = 'Risque élevé d’altération sur denrées périssables. Activer la clause de déroutement local ou réaffectation vers le marché national de Conakry.';
        } else {
          productQualityRisk = 'MEDIUM';
          mitigation = 'Solliciter une prorogation du certificat phytosanitaire auprès de la DNPV et émettre un avenant de livraison au contrat d’achat.';
        }
        break;

      case 'REJECTED_CUSTOMS_DOCUMENT':
        delayHoursAdded = 48;
        scenarioName = 'Non-Conformité Documentaire / Rejet Certificat Phytosanitaire';
        arrivalDate.setHours(arrivalDate.getHours() + delayHoursAdded);
        estimatedCostImpactGNF = 3800000;
        costImpactReason = 'Frais de contre-expertise de laboratoire ONCQ et émission d’un certificat rectificatif d’urgence.';
        affectedDocuments = ['PHYTOSANITARY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN_EUR1'];
        productQualityRisk = 'LOW';
        mitigation = 'Transmission immédiate des contre-échantillons scellés au laboratoire agréé sous procédure accélérée 24h.';
        break;

      case 'PACKAGING_SHORTAGE':
        delayHoursAdded = 36;
        scenarioName = 'Rupture de Palettes Normalisées NIMP15 / Emballage';
        arrivalDate.setHours(arrivalDate.getHours() + delayHoursAdded);
        estimatedCostImpactGNF = 2900000;
        costImpactReason = 'Approvisionnement express de 10 palettes traitées thermiquement NIMP15 depuis Conakry.';
        affectedDocuments = ['PACKING_LIST'];
        productQualityRisk = 'NONE';
        mitigation = 'Recours au stock tampon régional de palettes certifiées disponible à l’antenne de Friguiagbé.';
        break;

      case 'FREIGHT_COST_INCREASE':
        delayHoursAdded = 0;
        scenarioName = 'Hausse Surcharge Carburant Maritime / Routier (+15%)';
        const surcharge = Math.round(shipment.costs.freightCost * (customParams?.costIncreasePct ? customParams.costIncreasePct / 100 : 0.15));
        estimatedCostImpactGNF = surcharge;
        costImpactReason = `Application de la surcharge BAF (Bunker Adjustment Factor) de ${customParams?.costIncreasePct || 15}%.`;
        productQualityRisk = 'NONE';
        mitigation = 'Vérifier la clause d’indexation carburant dans le contrat de vente ou imputer la variation sur la marge commerciale brute.';
        break;
    }

    const deadlineBreached = arrivalDate.getTime() > originalDeadline.getTime();

    return {
      scenarioName,
      delayHoursAdded,
      recalculatedArrivalDate: arrivalDate.toISOString(),
      originalBuyerDeadline: originalDeadline.toISOString(),
      deadlineBreached,
      shelfLifeLossDays: Math.round(delayHoursAdded / 24),
      productQualityRisk,
      estimatedCostImpactGNF,
      costImpactReason,
      affectedDocuments,
      recommendedMitigationAction: mitigation
    };
  }

  /**
   * Helper: Generate destination-specific document checklist
   */
  private static generateComplianceDocumentChecklist(
    shipmentId: string,
    market: string,
    transportMode: TransportMode
  ): ComplianceDocumentRecord[] {
    const docs: ComplianceDocumentRecord[] = [
      {
        id: `doc-${Date.now()}-1`,
        shipmentId,
        documentType: 'COMMERCIAL_INVOICE',
        title: 'Facture Commerciale Définitive',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['EUROPEAN_UNION', 'CEDEAO', 'DOMESTIC_GUINEA', 'NORTH_AMERICA'],
        isConfidentialFinancial: true
      },
      {
        id: `doc-${Date.now()}-2`,
        shipmentId,
        documentType: 'PACKING_LIST',
        title: 'Bordereau de Colisage (Packing List)',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['EUROPEAN_UNION', 'CEDEAO', 'DOMESTIC_GUINEA', 'NORTH_AMERICA'],
        isConfidentialFinancial: false
      }
    ];

    if (market === 'EUROPEAN_UNION' || market === 'NORTH_AMERICA') {
      docs.push({
        id: `doc-${Date.now()}-3`,
        shipmentId,
        documentType: 'PHYTOSANITARY_CERTIFICATE',
        title: 'Certificat Phytosanitaire International (CIPV / DNPV)',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['EUROPEAN_UNION', 'NORTH_AMERICA'],
        isConfidentialFinancial: false
      });
      docs.push({
        id: `doc-${Date.now()}-4`,
        shipmentId,
        documentType: 'CERTIFICATE_OF_ORIGIN_EUR1',
        title: 'Certificat de Circulation EUR.1 (Exonération Douanière)',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['EUROPEAN_UNION'],
        isConfidentialFinancial: false
      });
      docs.push({
        id: `doc-${Date.now()}-5`,
        shipmentId,
        documentType: 'LABORATORY_ANALYSIS_CERTIFICATE',
        title: 'Certificat d’Analyse Officiel (Aflatoxines / Teneur en eau / Résidus)',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['EUROPEAN_UNION'],
        isConfidentialFinancial: false
      });
    }

    if (market === 'CEDEAO') {
      docs.push({
        id: `doc-${Date.now()}-6`,
        shipmentId,
        documentType: 'CERTIFICATE_OF_ORIGIN_CEDEAO',
        title: 'Certificat d’Origine Communautaire CEDEAO (Schéma TLS)',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['CEDEAO'],
        isConfidentialFinancial: false
      });
    }

    if (transportMode === 'MARITIME') {
      docs.push({
        id: `doc-${Date.now()}-7`,
        shipmentId,
        documentType: 'BILL_OF_LADING',
        title: 'Connaissement Maritime Original (B/L)',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['EUROPEAN_UNION', 'NORTH_AMERICA', 'MIDDLE_EAST'],
        isConfidentialFinancial: true
      });
    } else if (transportMode === 'AIR_FREIGHT') {
      docs.push({
        id: `doc-${Date.now()}-8`,
        shipmentId,
        documentType: 'AIR_WAYBILL',
        title: 'Lettre de Transport Aérien (LTA / AWB)',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['EUROPEAN_UNION', 'NORTH_AMERICA'],
        isConfidentialFinancial: true
      });
    } else if (transportMode === 'ROAD_FREIGHT') {
      docs.push({
        id: `doc-${Date.now()}-9`,
        shipmentId,
        documentType: 'ROAD_CONSIGNMENT_NOTE_CMR',
        title: 'Lettre de Voiture Routière Internationale (CMR)',
        status: 'REQUIRED_DRAFT',
        requiredForMarkets: ['CEDEAO', 'DOMESTIC_GUINEA'],
        isConfidentialFinancial: false
      });
    }

    return docs;
  }

  /**
   * Helper: Generate milestones for route
   */
  private static generateMilestonesForRoute(
    mode: TransportMode,
    dispatchLocation: string,
    destination: string,
    plannedPickup: string,
    estimatedArrival: string
  ): ShipmentMilestone[] {
    const pickupDate = new Date(plannedPickup);
    const arrivalDate = new Date(estimatedArrival);
    const totalMs = arrivalDate.getTime() - pickupDate.getTime();

    const m1Date = new Date(pickupDate.getTime() + totalMs * 0.1);
    const m2Date = new Date(pickupDate.getTime() + totalMs * 0.3);
    const m3Date = new Date(pickupDate.getTime() + totalMs * 0.7);

    return [
      {
        id: `ms-${Date.now()}-1`,
        code: 'MS-PICKUP',
        name: `Chargement & Conditionnement (${dispatchLocation})`,
        location: dispatchLocation,
        plannedDate: pickupDate.toISOString(),
        status: 'PENDING',
        delayHours: 0,
        responsibleParty: 'Équipe Logistique Expédition'
      },
      {
        id: `ms-${Date.now()}-2`,
        code: 'MS-CUSTOMS',
        name: mode === 'MARITIME' ? 'Arrivée Port & Contrôle Phytosanitaire' : 'Contrôle Documentaire & Départ Convoi',
        location: mode === 'MARITIME' ? 'Port Autonome de Conakry' : dispatchLocation,
        plannedDate: m1Date.toISOString(),
        status: 'PENDING',
        delayHours: 0,
        responsibleParty: 'Agent en Douane & Inspection Phytosanitaire'
      },
      {
        id: `ms-${Date.now()}-3`,
        code: 'MS-IN-TRANSIT',
        name: mode === 'MARITIME' ? 'Départ Navire en Mer' : mode === 'AIR_FREIGHT' ? 'Décollage Vol Cargo' : 'Passage Frontière / En Route',
        location: mode === 'MARITIME' ? 'En Mer (Atlantique)' : 'En Transit',
        plannedDate: m2Date.toISOString(),
        status: 'PENDING',
        delayHours: 0,
        responsibleParty: 'Compagnie de Transport'
      },
      {
        id: `ms-${Date.now()}-4`,
        code: 'MS-DEST-CLEARANCE',
        name: `Arrivée Destination & Dédouanement (${destination})`,
        location: destination,
        plannedDate: m3Date.toISOString(),
        status: 'PENDING',
        delayHours: 0,
        responsibleParty: 'Commissionnaire en Douane Destination'
      },
      {
        id: `ms-${Date.now()}-5`,
        code: 'MS-FINAL-DELIVERY',
        name: `Livraison Finale Acheteur (${destination})`,
        location: destination,
        plannedDate: arrivalDate.toISOString(),
        status: 'PENDING',
        delayHours: 0,
        responsibleParty: 'Transporteur Local / Réceptionnaire'
      }
    ];
  }

  /**
   * Helper: Map DB shipment to Model with RBAC masking
   */
  private static mapDbShipmentToModel(db: any, canViewFinancials: boolean): ShipmentMaster {
    const docs = (db.documents || []).map((d: any) => {
      if (!canViewFinancials && d.isConfidentialFinancial) {
        return {
          ...d,
          fileReferenceHash: '[RESTRICTED_FINANCIAL_ACCESS]',
          notes: '[Document financier à accès restreint]'
        };
      }
      return d;
    });

    const costs = canViewFinancials
      ? db.costs
      : {
          ...db.costs,
          freightCost: 0,
          handlingCost: 0,
          customsClearanceCost: 0,
          insuranceCost: 0,
          totalCost: 0,
          rateNotes: '[Accès financier restreint pour ce rôle]'
        };

    return {
      id: db.id,
      organizationId: db.organization_id,
      isDeleted: db.is_deleted || false,
      shipmentNumber: db.shipment_number,
      orderId: db.order_id,
      orderNumber: db.order_number,
      buyerId: db.buyer_id,
      buyerName: db.buyer_name,
      destinationMarket: db.destination_market,
      dispatchLocation: db.dispatch_location,
      destinationPortOrCity: db.destination_port_or_city,
      destinationCountry: db.destination_country,
      incoterm: db.incoterm,
      transportMode: db.transport_mode,
      carrierName: db.carrier_name,
      carrierContactPerson: db.carrier_contact_person,
      carrierContactPhone: db.carrier_contact_phone,
      containerOrVehicleId: db.container_or_vehicle_id,
      sealNumber: db.seal_number,
      linkedBatches: db.linked_batches || [],
      totalNetWeightKg: db.total_net_weight_kg,
      totalGrossWeightKg: db.total_gross_weight_kg,
      temperatureHandling: db.temperature_handling,
      packagingPallet: db.packaging_pallet,
      costs,
      plannedPickupDate: db.planned_pickup_date,
      actualPickupDate: db.actual_pickup_date,
      estimatedArrivalDate: db.estimated_arrival_date,
      actualArrivalDate: db.actual_arrival_date,
      currentStatus: db.current_status,
      totalDelayHours: db.total_delay_hours || 0,
      isDispatchBlocked: db.is_dispatch_blocked || false,
      dispatchBlockReason: db.dispatch_block_reason,
      milestones: db.milestones || [],
      documents: docs,
      linkedCalendarEventId: db.linked_calendar_event_id,
      responsibleStaffUserId: db.responsible_staff_user_id,
      responsibleStaffName: db.responsible_staff_name,
      externalLogisticsContact: db.external_logistics_contact,
      customsBrokerName: db.customs_broker_name,
      specialInstructions: db.specialInstructions,
      createdAt: db.created_at,
      updatedAt: db.updated_at
    };
  }
}
