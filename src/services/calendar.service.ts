import crypto from 'crypto';
import { getState, commitState } from '../db/connection.ts';
import {
  NormalCalendarItem,
  NormalEventType,
  EventStatus,
  EventPriority,
  RecurrenceRuleDetails,
  CalendarFilterParams,
  CalendarAttachment
} from '../types/calendar.ts';
import { UserRole } from '../types/organization.ts';
import { logAuditEvent } from './audit.service.ts';
import { notificationService } from './notification.service.ts';

export class CalendarService {
  /**
   * Helper: expands recurring rules to generate occurrences within a date window
   */
  private static expandRecurringEvent(
    event: any,
    windowStart: Date,
    windowEnd: Date,
    exceptions: any[]
  ): NormalCalendarItem[] {
    const results: NormalCalendarItem[] = [];
    const rule: RecurrenceRuleDetails = event.recurrence_rule;
    if (!rule || !rule.frequency) {
      return [event];
    }

    const eventStart = new Date(event.start_datetime);
    const eventEnd = new Date(event.end_datetime);
    const durationMs = eventEnd.getTime() - eventStart.getTime();

    const maxCount = rule.count || 365;
    const ruleEndDate = rule.endDate ? new Date(rule.endDate) : windowEnd;
    const effectiveEnd = ruleEndDate < windowEnd ? ruleEndDate : windowEnd;
    const exdates = new Set(rule.exdates || []);

    let current = new Date(eventStart);
    let count = 0;

    while (current <= effectiveEnd && count < maxCount) {
      const occurrenceDateStr = current.toISOString().substring(0, 10);
      const occurrenceStart = new Date(current);
      const occurrenceEnd = new Date(current.getTime() + durationMs);

      // Check if this occurrence falls within requested window
      if (occurrenceEnd >= windowStart && occurrenceStart <= windowEnd) {
        // Check if an exception record overrides this occurrence
        const exception = exceptions.find(
          e => e.parent_event_id === event.id && e.recurrence_exception_date === occurrenceDateStr
        );

        if (exception) {
          results.push(this.mapDbItem(exception));
        } else if (!exdates.has(occurrenceDateStr)) {
          // Generate synthetic occurrence with pointer to parent
          results.push({
            ...this.mapDbItem(event),
            id: `${event.id}_${occurrenceDateStr}`,
            startDateTime: occurrenceStart.toISOString(),
            endDateTime: occurrenceEnd.toISOString(),
            recurrence: {
              ...rule,
              parentEventId: event.id,
              exceptionDate: occurrenceDateStr
            }
          });
        }
      }

      // Step forward by recurrence rule interval
      const interval = rule.interval || 1;
      if (rule.frequency === 'DAILY') {
        current.setDate(current.getDate() + interval);
      } else if (rule.frequency === 'WEEKLY') {
        current.setDate(current.getDate() + 7 * interval);
      } else if (rule.frequency === 'BIWEEKLY') {
        current.setDate(current.getDate() + 14 * interval);
      } else if (rule.frequency === 'MONTHLY') {
        current.setMonth(current.getMonth() + interval);
      } else if (rule.frequency === 'YEARLY') {
        current.setFullYear(current.getFullYear() + interval);
      } else {
        break;
      }

      count++;
    }

    return results;
  }

  private static mapDbItem(row: any): NormalCalendarItem {
    const state = getState();
    const assignedUser = row.assigned_to_user_id
      ? state.users.find(u => u.id === row.assigned_to_user_id)
      : null;
    const farm = row.farm_id ? state.farms.find(f => f.id === row.farm_id) : null;
    const plot = row.plot_id ? state.plots.find(p => p.id === row.plot_id) : null;
    const createdByUser = row.created_by_user_id
      ? state.users.find(u => u.id === row.created_by_user_id)
      : null;
    const updatedByUser = row.updated_by_user_id
      ? state.users.find(u => u.id === row.updated_by_user_id)
      : null;

    return {
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      description: row.description,
      eventType: row.event_type as NormalEventType,
      status: row.status as EventStatus,
      priority: row.priority as EventPriority,
      startDateTime: row.start_datetime,
      endDateTime: row.end_datetime,
      allDay: !!row.all_day,
      timezone: row.timezone || 'Africa/Conakry',
      assignedToUserId: row.assigned_to_user_id,
      assignedUserName: assignedUser?.full_name,
      assignedUserEmail: assignedUser?.email,
      dueDate: row.due_date,
      farmId: row.farm_id,
      farmName: farm?.name,
      plotId: row.plot_id,
      plotName: plot?.name,
      linkedCampaignId: row.linked_campaign_id,
      linkedCropCycleId: row.linked_crop_cycle_id,
      linkedMasterOperationId: row.linked_master_operation_id,
      linkedOrderId: row.linked_order_id,
      linkedShipmentId: row.linked_shipment_id,
      recurrence: row.recurrence_rule,
      remindersMinutesBefore: row.reminders,
      notes: row.notes,
      attachments: row.attachments || [],
      colorHex: row.color_hex,
      tags: row.tags || [],
      createdByUserId: row.created_by_user_id,
      createdByUserName: createdByUser?.full_name,
      updatedByUserId: row.updated_by_user_id,
      updatedByUserName: updatedByUser?.full_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: !!row.is_deleted
    };
  }

  /**
   * List calendar events with date boundaries, recurring expansion, and filters
   */
  static async listEvents(
    orgId: string,
    filters: CalendarFilterParams,
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<NormalCalendarItem[]> {
    if (!caller.isPlatformOwner && orgId !== caller.organizationId) {
      throw new Error('Access denied: cross-tenant access prohibited');
    }

    const state = getState();
    const windowStart = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const windowEnd = filters.endDate
      ? new Date(filters.endDate)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const orgEvents = (state.normal_calendar_events || []).filter(
      e => e.organization_id === orgId && !e.is_deleted
    );

    const masterEvents = orgEvents.filter(e => !e.is_exception);
    const exceptions = orgEvents.filter(e => e.is_exception);

    let allExpanded: NormalCalendarItem[] = [];

    for (const master of masterEvents) {
      if (master.recurrence_rule && master.recurrence_rule.frequency) {
        const expanded = this.expandRecurringEvent(master, windowStart, windowEnd, exceptions);
        allExpanded.push(...expanded);
      } else {
        const start = new Date(master.start_datetime);
        const end = new Date(master.end_datetime);
        if (end >= windowStart && start <= windowEnd) {
          allExpanded.push(this.mapDbItem(master));
        }
      }
    }

    // Apply Filters
    if (filters.status && filters.status !== 'ALL') {
      allExpanded = allExpanded.filter(e => e.status === filters.status);
    }
    if (filters.eventType && filters.eventType !== 'ALL') {
      allExpanded = allExpanded.filter(e => e.eventType === filters.eventType);
    }
    if (filters.priority && filters.priority !== 'ALL') {
      allExpanded = allExpanded.filter(e => e.priority === filters.priority);
    }
    if (filters.assignedUserId && filters.assignedUserId !== 'ALL') {
      allExpanded = allExpanded.filter(e => e.assignedToUserId === filters.assignedUserId);
    }
    if (filters.farmId && filters.farmId !== 'ALL') {
      allExpanded = allExpanded.filter(e => e.farmId === filters.farmId);
    }
    if (filters.plotId && filters.plotId !== 'ALL') {
      allExpanded = allExpanded.filter(e => e.plotId === filters.plotId);
    }
    if (filters.relatedRecordType && filters.relatedRecordType !== 'ALL') {
      if (filters.relatedRecordType === 'CAMPAIGN') {
        allExpanded = allExpanded.filter(e => !!e.linkedCampaignId);
      } else if (filters.relatedRecordType === 'CROP_CYCLE') {
        allExpanded = allExpanded.filter(e => !!e.linkedCropCycleId);
      } else if (filters.relatedRecordType === 'MASTER_OPERATION') {
        allExpanded = allExpanded.filter(e => !!e.linkedMasterOperationId);
      } else if (filters.relatedRecordType === 'ORDER') {
        allExpanded = allExpanded.filter(e => !!e.linkedOrderId);
      } else if (filters.relatedRecordType === 'SHIPMENT') {
        allExpanded = allExpanded.filter(e => !!e.linkedShipmentId);
      }
    }
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase();
      allExpanded = allExpanded.filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    // Sort order
    const sortBy = filters.sortBy || 'date_asc';
    allExpanded.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime();
      }
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
    });

    return allExpanded;
  }

  /**
   * Get single event by ID
   */
  static async getEventById(
    id: string,
    caller: { isPlatformOwner: boolean; organizationId: string }
  ): Promise<NormalCalendarItem> {
    const state = getState();
    // In case of synthetic occurrence ID "realId_YYYY-MM-DD"
    const realId = id.includes('_') ? id.split('_')[0] : id;

    const event = (state.normal_calendar_events || []).find(
      e => e.id === realId && !e.is_deleted
    );

    if (!event) {
      throw new Error('Event not found');
    }

    if (!caller.isPlatformOwner && event.organization_id !== caller.organizationId) {
      throw new Error('Access denied: cross-tenant access prohibited');
    }

    return this.mapDbItem(event);
  }

  /**
   * Create a new normal calendar event
   */
  static async createEvent(
    first: any,
    second?: any
  ): Promise<NormalCalendarItem> {
    let params: any;

    if (second && first?.user) {
      const session = first;
      const body = second;
      params = {
        organizationId: session.organization?.id || session.user?.activeOrganizationId,
        title: body.title,
        description: body.description,
        eventType: body.eventType,
        status: body.status || 'PENDING',
        priority: body.priority || 'MEDIUM',
        startDateTime: body.startDatetime || body.startDateTime,
        endDateTime: body.endDatetime || body.endDateTime,
        allDay: body.allDay,
        timezone: body.timezone,
        assignedToUserId: body.assignedToUserId,
        farmId: body.farmId,
        plotId: body.plotId,
        remindersMinutesBefore: body.reminders || body.remindersMinutesBefore,
        caller: {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
          isPlatformOwner: session.user.role === 'PLATFORM_OWNER',
          organizationId: session.organization?.id || session.user?.activeOrganizationId
        }
      };
    } else {
      params = first;
    }
    // Permission check: VIEWER is strictly read-only
    if (params.caller.role === 'VIEWER') {
      throw new Error('Insufficient permissions: VIEWER role cannot create events');
    }

    // Tenant Isolation
    if (!params.caller.isPlatformOwner && params.organizationId !== params.caller.organizationId) {
      throw new Error('Access denied: cross-tenant event creation prohibited');
    }

    if (!params.title || params.title.trim().length === 0) {
      throw new Error('Event title is required');
    }

    const start = new Date(params.startDateTime);
    const end = new Date(params.endDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid start or end date/time');
    }
    if (end < start) {
      throw new Error('End date/time cannot be before start date/time');
    }

    const state = getState();
    if (!state.normal_calendar_events) {
      state.normal_calendar_events = [];
    }

    // Validate farm and plot belonging to organization if provided
    if (params.farmId) {
      const farm = state.farms.find(f => f.id === params.farmId && !f.is_deleted);
      if (!farm) throw new Error('Referenced farm does not exist');
      if (farm.organization_id !== params.organizationId) {
        throw new Error('Referenced farm belongs to another organization (Tenant isolation violation)');
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newDbRecord = {
      id,
      organization_id: params.organizationId,
      title: params.title.trim(),
      description: params.description?.trim(),
      event_type: params.eventType || 'TASK',
      status: params.status || 'PENDING',
      priority: params.priority || 'MEDIUM',
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      all_day: !!params.allDay,
      timezone: params.timezone || 'Africa/Conakry',
      assigned_to_user_id: params.assignedToUserId || null,
      due_date: params.dueDate ? new Date(params.dueDate).toISOString() : null,
      farm_id: params.farmId || null,
      plot_id: params.plotId || null,
      linked_campaign_id: params.linkedCampaignId || null,
      linked_crop_cycle_id: params.linkedCropCycleId || null,
      linked_master_operation_id: params.linkedMasterOperationId || null,
      linked_order_id: params.linkedOrderId || null,
      linked_shipment_id: params.linkedShipmentId || null,
      recurrence_rule: params.recurrence || null,
      reminders: params.remindersMinutesBefore || [],
      notes: params.notes || null,
      attachments: params.attachments || [],
      color_hex: params.colorHex || null,
      tags: params.tags || [],
      created_by_user_id: params.caller.userId,
      updated_by_user_id: params.caller.userId,
      created_at: now,
      updated_at: now,
      is_deleted: false,
      is_exception: false
    };

    state.normal_calendar_events.push(newDbRecord);
    commitState(state);

    // If reminders requested, pass to notification service (which logs pending state)
    if (params.remindersMinutesBefore && params.remindersMinutesBefore.length > 0 && params.assignedToUserId) {
      const assignedUser = state.users.find(u => u.id === params.assignedToUserId);
      if (assignedUser) {
        await notificationService.sendEmail(
          assignedUser.email,
          `Rappel Tâche : ${newDbRecord.title}`,
          `Tâche planifiée pour le ${start.toLocaleString()} (${newDbRecord.timezone})`
        );
      }
    }

    await logAuditEvent({
      organizationId: params.organizationId,
      userId: params.caller.userId,
      userEmail: params.caller.email,
      userRole: params.caller.role,
      action: 'CALENDAR_EVENT_CREATED',
      targetEntity: 'NORMAL_CALENDAR_EVENT',
      targetEntityId: id,
      details: { title: newDbRecord.title, type: newDbRecord.event_type, start: newDbRecord.start_datetime }
    });

    return this.mapDbItem(newDbRecord);
  }

  /**
   * Update an existing event or create an occurrence exception for recurring series
   */
  static async updateEvent(params: {
    id: string;
    updates: Partial<{
      title: string;
      description: string;
      eventType: NormalEventType;
      status: EventStatus;
      priority: EventPriority;
      startDateTime: string;
      endDateTime: string;
      allDay: boolean;
      timezone: string;
      assignedToUserId: string;
      dueDate: string;
      farmId: string;
      plotId: string;
      linkedCampaignId: string;
      linkedCropCycleId: string;
      linkedMasterOperationId: string;
      linkedOrderId: string;
      linkedShipmentId: string;
      remindersMinutesBefore: number[];
      notes: string;
      attachments: CalendarAttachment[];
      colorHex: string;
      tags: string[];
    }>;
    updateMode?: 'SERIES' | 'OCCURRENCE';
    occurrenceDate?: string;
    caller: {
      userId: string;
      email: string;
      role: UserRole;
      isPlatformOwner: boolean;
      organizationId: string;
    };
  }): Promise<NormalCalendarItem> {
    if (params.caller.role === 'VIEWER') {
      throw new Error('Insufficient permissions: VIEWER role cannot edit events');
    }

    const state = getState();
    const realId = params.id.includes('_') ? params.id.split('_')[0] : params.id;
    const event = (state.normal_calendar_events || []).find(e => e.id === realId && !e.is_deleted);

    if (!event) throw new Error('Event not found');

    if (!params.caller.isPlatformOwner && event.organization_id !== params.caller.organizationId) {
      throw new Error('Access denied: cross-tenant event update prohibited');
    }

    // Role enforcement: OPERATIONS_STAFF can only update status and notes
    if (params.caller.role === 'OPERATIONS_STAFF') {
      const allowedKeys = ['status', 'notes'];
      const attemptedKeys = Object.keys(params.updates);
      const invalidKeys = attemptedKeys.filter(k => !allowedKeys.includes(k));
      if (invalidKeys.length > 0) {
        throw new Error(
          `OPERATIONS_STAFF may only update status or notes. Modification of [${invalidKeys.join(', ')}] is restricted.`
        );
      }
    }

    const now = new Date().toISOString();

    // Mode: Update single occurrence of recurring event -> create exception
    if (
      params.updateMode === 'OCCURRENCE' &&
      params.occurrenceDate &&
      event.recurrence_rule &&
      event.recurrence_rule.frequency
    ) {
      // Exclude occurrence date from master
      if (!event.recurrence_rule.exdates) {
        event.recurrence_rule.exdates = [];
      }
      if (!event.recurrence_rule.exdates.includes(params.occurrenceDate)) {
        event.recurrence_rule.exdates.push(params.occurrenceDate);
      }

      // Create new exception record
      const exceptionId = crypto.randomUUID();
      const exceptionRecord: any = {
        ...event,
        id: exceptionId,
        parent_event_id: event.id,
        is_exception: true,
        recurrence_exception_date: params.occurrenceDate,
        recurrence_rule: null, // exception is not itself recurring
        updated_by_user_id: params.caller.userId,
        updated_at: now
      };

      if (params.updates.title !== undefined) exceptionRecord.title = params.updates.title.trim();
      if (params.updates.description !== undefined) exceptionRecord.description = params.updates.description?.trim();
      if (params.updates.eventType !== undefined) exceptionRecord.event_type = params.updates.eventType;
      if (params.updates.status !== undefined) exceptionRecord.status = params.updates.status;
      if (params.updates.priority !== undefined) exceptionRecord.priority = params.updates.priority;
      if (params.updates.startDateTime !== undefined) exceptionRecord.start_datetime = params.updates.startDateTime;
      if (params.updates.endDateTime !== undefined) exceptionRecord.end_datetime = params.updates.endDateTime;
      if (params.updates.allDay !== undefined) exceptionRecord.all_day = params.updates.allDay;
      if (params.updates.timezone !== undefined) exceptionRecord.timezone = params.updates.timezone;
      if (params.updates.assignedToUserId !== undefined) exceptionRecord.assigned_to_user_id = params.updates.assignedToUserId;
      if (params.updates.dueDate !== undefined) exceptionRecord.due_date = params.updates.dueDate;
      if (params.updates.farmId !== undefined) exceptionRecord.farm_id = params.updates.farmId;
      if (params.updates.plotId !== undefined) exceptionRecord.plot_id = params.updates.plotId;
      if (params.updates.linkedCampaignId !== undefined) exceptionRecord.linked_campaign_id = params.updates.linkedCampaignId;
      if (params.updates.linkedCropCycleId !== undefined) exceptionRecord.linked_crop_cycle_id = params.updates.linkedCropCycleId;
      if (params.updates.linkedMasterOperationId !== undefined) exceptionRecord.linked_master_operation_id = params.updates.linkedMasterOperationId;
      if (params.updates.linkedOrderId !== undefined) exceptionRecord.linked_order_id = params.updates.linkedOrderId;
      if (params.updates.linkedShipmentId !== undefined) exceptionRecord.linked_shipment_id = params.updates.linkedShipmentId;
      if (params.updates.remindersMinutesBefore !== undefined) exceptionRecord.reminders = params.updates.remindersMinutesBefore;
      if (params.updates.notes !== undefined) exceptionRecord.notes = params.updates.notes;
      if (params.updates.attachments !== undefined) exceptionRecord.attachments = params.updates.attachments;
      if (params.updates.colorHex !== undefined) exceptionRecord.color_hex = params.updates.colorHex;
      if (params.updates.tags !== undefined) exceptionRecord.tags = params.updates.tags;

      state.normal_calendar_events.push(exceptionRecord);
      commitState(state);

      await logAuditEvent({
        organizationId: event.organization_id,
        userId: params.caller.userId,
        userEmail: params.caller.email,
        userRole: params.caller.role,
        action: 'CALENDAR_EVENT_OCCURRENCE_EDITED',
        targetEntity: 'NORMAL_CALENDAR_EVENT',
        targetEntityId: exceptionId,
        details: { parentEventId: event.id, occurrenceDate: params.occurrenceDate }
      });

      return this.mapDbItem(exceptionRecord);
    }

    // Mode: Update Series or standard non-recurring event
    if (params.updates.title !== undefined) event.title = params.updates.title.trim();
    if (params.updates.description !== undefined) event.description = params.updates.description?.trim();
    if (params.updates.eventType !== undefined) event.event_type = params.updates.eventType;
    if (params.updates.status !== undefined) event.status = params.updates.status;
    if (params.updates.priority !== undefined) event.priority = params.updates.priority;
    if (params.updates.startDateTime !== undefined) event.start_datetime = params.updates.startDateTime;
    if (params.updates.endDateTime !== undefined) event.end_datetime = params.updates.endDateTime;
    if (params.updates.allDay !== undefined) event.all_day = params.updates.allDay;
    if (params.updates.timezone !== undefined) event.timezone = params.updates.timezone;
    if (params.updates.assignedToUserId !== undefined) event.assigned_to_user_id = params.updates.assignedToUserId;
    if (params.updates.dueDate !== undefined) event.due_date = params.updates.dueDate;
    if (params.updates.farmId !== undefined) event.farm_id = params.updates.farmId;
    if (params.updates.plotId !== undefined) event.plot_id = params.updates.plotId;
    if (params.updates.linkedCampaignId !== undefined) event.linked_campaign_id = params.updates.linkedCampaignId;
    if (params.updates.linkedCropCycleId !== undefined) event.linked_crop_cycle_id = params.updates.linkedCropCycleId;
    if (params.updates.linkedMasterOperationId !== undefined) event.linked_master_operation_id = params.updates.linkedMasterOperationId;
    if (params.updates.linkedOrderId !== undefined) event.linked_order_id = params.updates.linkedOrderId;
    if (params.updates.linkedShipmentId !== undefined) event.linked_shipment_id = params.updates.linkedShipmentId;
    if (params.updates.remindersMinutesBefore !== undefined) event.reminders = params.updates.remindersMinutesBefore;
    if (params.updates.notes !== undefined) event.notes = params.updates.notes;
    if (params.updates.attachments !== undefined) event.attachments = params.updates.attachments;
    if (params.updates.colorHex !== undefined) event.color_hex = params.updates.colorHex;
    if (params.updates.tags !== undefined) event.tags = params.updates.tags;

    event.updated_by_user_id = params.caller.userId;
    event.updated_at = now;

    commitState(state);

    await logAuditEvent({
      organizationId: event.organization_id,
      userId: params.caller.userId,
      userEmail: params.caller.email,
      userRole: params.caller.role,
      action: 'CALENDAR_EVENT_UPDATED',
      targetEntity: 'NORMAL_CALENDAR_EVENT',
      targetEntityId: event.id,
      details: { updates: params.updates }
    });

    return this.mapDbItem(event);
  }

  /**
   * Delete an event (or an occurrence of recurring series)
   */
  static async deleteEvent(params: {
    id: string;
    deleteMode?: 'SERIES' | 'OCCURRENCE';
    occurrenceDate?: string;
    caller: {
      userId: string;
      email: string;
      role: UserRole;
      isPlatformOwner: boolean;
      organizationId: string;
    };
  }): Promise<{ success: boolean; message: string }> {
    if (params.caller.role === 'VIEWER' || params.caller.role === 'OPERATIONS_STAFF') {
      throw new Error(`Insufficient permissions: ${params.caller.role} cannot delete calendar events`);
    }

    const state = getState();
    const realId = params.id.includes('_') ? params.id.split('_')[0] : params.id;
    const event = (state.normal_calendar_events || []).find(e => e.id === realId && !e.is_deleted);

    if (!event) throw new Error('Event not found');

    if (!params.caller.isPlatformOwner && event.organization_id !== params.caller.organizationId) {
      throw new Error('Access denied: cross-tenant event deletion prohibited');
    }

    // Delete single occurrence of recurring event -> add to exdates
    if (
      params.deleteMode === 'OCCURRENCE' &&
      params.occurrenceDate &&
      event.recurrence_rule &&
      event.recurrence_rule.frequency
    ) {
      if (!event.recurrence_rule.exdates) {
        event.recurrence_rule.exdates = [];
      }
      if (!event.recurrence_rule.exdates.includes(params.occurrenceDate)) {
        event.recurrence_rule.exdates.push(params.occurrenceDate);
      }
      commitState(state);

      await logAuditEvent({
        organizationId: event.organization_id,
        userId: params.caller.userId,
        userEmail: params.caller.email,
        userRole: params.caller.role,
        action: 'CALENDAR_EVENT_OCCURRENCE_DELETED',
        targetEntity: 'NORMAL_CALENDAR_EVENT',
        targetEntityId: event.id,
        details: { occurrenceDate: params.occurrenceDate }
      });

      return { success: true, message: 'Occurrence deleted from series' };
    }

    // Standard series or single event deletion
    event.is_deleted = true;
    event.updated_by_user_id = params.caller.userId;
    event.updated_at = new Date().toISOString();

    commitState(state);

    await logAuditEvent({
      organizationId: event.organization_id,
      userId: params.caller.userId,
      userEmail: params.caller.email,
      userRole: params.caller.role,
      action: 'CALENDAR_EVENT_DELETED',
      targetEntity: 'NORMAL_CALENDAR_EVENT',
      targetEntityId: event.id,
      details: { title: event.title }
    });

    return { success: true, message: 'Event successfully deleted' };
  }

  /**
   * Cancel an event
   */
  static async cancelEvent(first: any, second?: any, third?: any): Promise<NormalCalendarItem> {
    let session: any;
    let eventId: string;
    let reason: string = '';

    if (first?.user) {
      session = first;
      eventId = second;
      reason = third || '';
    } else {
      eventId = first;
      reason = second || '';
    }

    const caller = session ? {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      isPlatformOwner: session.user.role === 'PLATFORM_OWNER',
      organizationId: session.organization?.id || session.user?.activeOrganizationId
    } : undefined;

    return this.updateEvent({
      id: eventId,
      updates: {
        status: 'CANCELLED',
        notes: reason ? `Annulé: ${reason}` : undefined
      },
      caller: caller as any
    });
  }
}

