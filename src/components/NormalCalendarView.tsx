/**
 * FARMING CALENDAR — Normal Calendar Module
 * Supporting 5 views: Day, Week, Month, Year, and Agenda/List
 * Supports CRUD, recurring expansion, occurrence exceptions, filters, RBAC, tenant isolation,
 * document attachments, related agricultural/commercial records, sorting, and pagination.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  User,
  MapPin,
  Tag,
  Paperclip,
  Trash2,
  Edit3,
  CalendarCheck,
  Building2,
  Bell,
  X,
  FileText,
  Link as LinkIcon,
  Layers,
  ArrowUpDown,
  Download,
  Ban,
  Check,
  Sprout
} from 'lucide-react';
import {
  NormalCalendarItem,
  NormalEventType,
  EventPriority,
  EventStatus,
  RecurrenceFrequency,
  CalendarAttachment
} from '../types/calendar.ts';
import { Farm, AuthSession, UserRole } from '../types/organization.ts';

interface NormalCalendarViewProps {
  session: AuthSession;
  farms: Farm[];
  teamMembers: any[];
  onEventChanged?: () => void;
  onNavigateToAgricultural?: (params: { campaignId?: string; operationId?: string }) => void;
}

export function NormalCalendarView({
  session,
  farms,
  teamMembers,
  onEventChanged,
  onNavigateToAgricultural
}: NormalCalendarViewProps) {
  const { t, i18n } = useTranslation();

  // Active Calendar View
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'year' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Data state
  const [events, setEvents] = useState<NormalCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NormalCalendarItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showRecurrencePrompt, setShowRecurrencePrompt] = useState<{ mode: 'edit' | 'delete'; event: NormalCalendarItem } | null>(null);

  // Filters & Sorting & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFarmId, setFilterFarmId] = useState<string>('ALL');
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('ALL');
  const [filterRelatedType, setFilterRelatedType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'priority' | 'status' | 'title'>('date_asc');
  const [agendaPage, setAgendaPage] = useState<number>(1);
  const [agendaLimit, setAgendaLimit] = useState<number>(10);

  // Form state (Create & Edit)
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<NormalEventType>('TASK');
  const [formPriority, setFormPriority] = useState<EventPriority>('MEDIUM');
  const [formStatus, setFormStatus] = useState<EventStatus>('PENDING');
  const [formStartDate, setFormStartDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEndTime, setFormEndTime] = useState('09:00');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formDueDate, setFormDueDate] = useState('');
  const [formTimezone, setFormTimezone] = useState('Africa/Conakry');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formFarmId, setFormFarmId] = useState('');
  const [formPlotId, setFormPlotId] = useState('');
  const [formRelatedType, setFormRelatedType] = useState<string>('NONE');
  const [formRelatedId, setFormRelatedId] = useState<string>('');
  const [formRecurrenceFreq, setFormRecurrenceFreq] = useState<RecurrenceFrequency | 'NONE'>('NONE');
  const [formRecurrenceInterval, setFormRecurrenceInterval] = useState(1);
  const [formReminders, setFormReminders] = useState<number[]>([60]);
  const [formNotes, setFormNotes] = useState('');
  const [formAttachments, setFormAttachments] = useState<CalendarAttachment[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [formError, setFormError] = useState('');
  const [editUpdateMode, setEditUpdateMode] = useState<'SERIES' | 'OCCURRENCE'>('SERIES');

  // Fetch events for current window
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Calculate broad window around currentDate to accommodate Month/Year views
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0);

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });

      if (filterCategory !== 'ALL') params.append('eventType', filterCategory);
      if (filterPriority !== 'ALL') params.append('priority', filterPriority);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterFarmId !== 'ALL') params.append('farmId', filterFarmId);
      if (filterAssigneeId !== 'ALL') params.append('assignedUserId', filterAssigneeId);
      if (filterRelatedType !== 'ALL') params.append('relatedRecordType', filterRelatedType);
      if (searchQuery.trim().length > 0) params.append('searchQuery', searchQuery.trim());
      params.append('sortBy', sortBy);

      const res = await fetch(
        `/api/v1/organizations/${session.organization.id}/calendar/events?${params.toString()}`,
        {
          headers: {
            'Accept': 'application/json',
            Authorization: `Bearer ${session.token}`
          }
        }
      );
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        return;
      }
      const json = await res.json();
      if (json.success) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [
    currentDate,
    filterCategory,
    filterPriority,
    filterStatus,
    filterFarmId,
    filterAssigneeId,
    filterRelatedType,
    searchQuery,
    sortBy
  ]);

  // Reset agenda page when filter changes
  useEffect(() => {
    setAgendaPage(1);
  }, [filterCategory, filterPriority, filterStatus, filterFarmId, filterAssigneeId, filterRelatedType, searchQuery]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (currentView === 'day') next.setDate(next.getDate() - 1);
    else if (currentView === 'week') next.setDate(next.getDate() - 7);
    else if (currentView === 'month') next.setMonth(next.getMonth() - 1);
    else if (currentView === 'year') next.setFullYear(next.getFullYear() - 1);
    else next.setDate(next.getDate() - 7);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (currentView === 'day') next.setDate(next.getDate() + 1);
    else if (currentView === 'week') next.setDate(next.getDate() + 7);
    else if (currentView === 'month') next.setMonth(next.getMonth() + 1);
    else if (currentView === 'year') next.setFullYear(next.getFullYear() + 1);
    else next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open Create Modal
  const openCreateModal = (initialDate?: Date) => {
    const dateToUse = initialDate || currentDate;
    const yyyy = dateToUse.getFullYear();
    const mm = String(dateToUse.getMonth() + 1).padStart(2, '0');
    const dd = String(dateToUse.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    setFormTitle('');
    setFormDescription('');
    setFormCategory('TASK');
    setFormPriority('MEDIUM');
    setFormStatus('PENDING');
    setFormStartDate(dateStr);
    setFormStartTime('08:00');
    setFormEndDate(dateStr);
    setFormEndTime('09:30');
    setFormAllDay(false);
    setFormDueDate('');
    setFormTimezone('Africa/Conakry');
    setFormAssigneeId(session.user.id);
    setFormFarmId(farms[0]?.id || '');
    setFormPlotId('');
    setFormRelatedType('NONE');
    setFormRelatedId('');
    setFormRecurrenceFreq('NONE');
    setFormRecurrenceInterval(1);
    setFormReminders([60]);
    setFormNotes('');
    setFormAttachments([]);
    setNewAttachmentName('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (event: NormalCalendarItem) => {
    const sDate = new Date(event.startDateTime);
    const eDate = new Date(event.endDateTime);

    const sYyyy = sDate.getFullYear();
    const sMm = String(sDate.getMonth() + 1).padStart(2, '0');
    const sDd = String(sDate.getDate()).padStart(2, '0');
    const sDateStr = `${sYyyy}-${sMm}-${sDd}`;
    const sTimeStr = sDate.toISOString().substring(11, 16);

    const eYyyy = eDate.getFullYear();
    const eMm = String(eDate.getMonth() + 1).padStart(2, '0');
    const eDd = String(eDate.getDate()).padStart(2, '0');
    const eDateStr = `${eYyyy}-${eMm}-${eDd}`;
    const eTimeStr = eDate.toISOString().substring(11, 16);

    setFormTitle(event.title || '');
    setFormDescription(event.description || '');
    setFormCategory(event.eventType);
    setFormPriority(event.priority);
    setFormStatus(event.status);
    setFormStartDate(sDateStr);
    setFormStartTime(sTimeStr);
    setFormEndDate(eDateStr);
    setFormEndTime(eTimeStr);
    setFormAllDay(!!event.allDay);
    setFormDueDate(event.dueDate ? event.dueDate.substring(0, 10) : '');
    setFormTimezone(event.timezone || 'Africa/Conakry');
    setFormAssigneeId(event.assignedToUserId || '');
    setFormFarmId(event.farmId || '');
    setFormPlotId(event.plotId || '');

    // Detect related type
    if (event.linkedCampaignId) {
      setFormRelatedType('CAMPAIGN');
      setFormRelatedId(event.linkedCampaignId);
    } else if (event.linkedCropCycleId) {
      setFormRelatedType('CROP_CYCLE');
      setFormRelatedId(event.linkedCropCycleId);
    } else if (event.linkedMasterOperationId) {
      setFormRelatedType('MASTER_OPERATION');
      setFormRelatedId(event.linkedMasterOperationId);
    } else if (event.linkedOrderId) {
      setFormRelatedType('ORDER');
      setFormRelatedId(event.linkedOrderId);
    } else if (event.linkedShipmentId) {
      setFormRelatedType('SHIPMENT');
      setFormRelatedId(event.linkedShipmentId);
    } else {
      setFormRelatedType('NONE');
      setFormRelatedId('');
    }

    setFormRecurrenceFreq(event.recurrence?.frequency || 'NONE');
    setFormRecurrenceInterval(event.recurrence?.interval || 1);
    setFormReminders(event.remindersMinutesBefore || [60]);
    setFormNotes(event.notes || '');
    setFormAttachments(event.attachments || []);
    setNewAttachmentName('');
    setEditUpdateMode('SERIES');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Helper to construct linked parameters
  const getLinkedRecordParams = (relType: string, relId: string) => {
    const params: Record<string, string | null> = {
      linkedCampaignId: null,
      linkedCropCycleId: null,
      linkedMasterOperationId: null,
      linkedOrderId: null,
      linkedShipmentId: null
    };
    if (relType === 'CAMPAIGN' && relId.trim()) params.linkedCampaignId = relId.trim();
    if (relType === 'CROP_CYCLE' && relId.trim()) params.linkedCropCycleId = relId.trim();
    if (relType === 'MASTER_OPERATION' && relId.trim()) params.linkedMasterOperationId = relId.trim();
    if (relType === 'ORDER' && relId.trim()) params.linkedOrderId = relId.trim();
    if (relType === 'SHIPMENT' && relId.trim()) params.linkedShipmentId = relId.trim();
    return params;
  };

  // Submit Create Event
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      const startDateTime = formAllDay
        ? `${formStartDate}T00:00:00Z`
        : `${formStartDate}T${formStartTime}:00Z`;
      const endDateTime = formAllDay
        ? `${formEndDate}T23:59:59Z`
        : `${formEndDate}T${formEndTime}:00Z`;

      const recurrence =
        formRecurrenceFreq !== 'NONE'
          ? {
              frequency: formRecurrenceFreq,
              interval: formRecurrenceInterval
            }
          : undefined;

      const linked = getLinkedRecordParams(formRelatedType, formRelatedId);

      const res = await fetch(`/api/v1/organizations/${session.organization.id}/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          eventType: formCategory,
          priority: formPriority,
          status: formStatus,
          startDateTime,
          endDateTime,
          allDay: formAllDay,
          timezone: formTimezone,
          dueDate: formDueDate ? `${formDueDate}T23:59:59Z` : undefined,
          assignedToUserId: formAssigneeId || undefined,
          farmId: formFarmId || undefined,
          plotId: formPlotId || undefined,
          ...linked,
          recurrence,
          remindersMinutesBefore: formReminders,
          notes: formNotes,
          attachments: formAttachments
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Error creating event');
      }

      setIsCreateModalOpen(false);
      fetchEvents();
      if (onEventChanged) onEventChanged();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Submit Edit Event
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setFormError('');

    try {
      const realId = selectedEvent.id.includes('_') ? selectedEvent.id.split('_')[0] : selectedEvent.id;
      const occurrenceDate = selectedEvent.id.includes('_') ? selectedEvent.id.split('_')[1] : undefined;

      const startDateTime = formAllDay
        ? `${formStartDate}T00:00:00Z`
        : `${formStartDate}T${formStartTime}:00Z`;
      const endDateTime = formAllDay
        ? `${formEndDate}T23:59:59Z`
        : `${formEndDate}T${formEndTime}:00Z`;

      const linked = getLinkedRecordParams(formRelatedType, formRelatedId);

      const updates: any = {
        title: formTitle,
        description: formDescription,
        eventType: formCategory,
        priority: formPriority,
        status: formStatus,
        startDateTime,
        endDateTime,
        allDay: formAllDay,
        timezone: formTimezone,
        dueDate: formDueDate ? `${formDueDate}T23:59:59Z` : undefined,
        assignedToUserId: formAssigneeId || undefined,
        farmId: formFarmId || undefined,
        plotId: formPlotId || undefined,
        ...linked,
        remindersMinutesBefore: formReminders,
        notes: formNotes,
        attachments: formAttachments
      };

      const res = await fetch(
        `/api/v1/organizations/${session.organization.id}/calendar/events/${realId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`
          },
          body: JSON.stringify({
            updates,
            updateMode: editUpdateMode,
            occurrenceDate
          })
        }
      );

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Error updating event');
      }

      setIsEditModalOpen(false);
      setSelectedEvent(json.data);
      fetchEvents();
      if (onEventChanged) onEventChanged();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Quick Status Toggle (e.g. mark completed, cancelled, in progress)
  const handleQuickStatusChange = async (event: NormalCalendarItem, newStatus: EventStatus) => {
    try {
      const realId = event.id.includes('_') ? event.id.split('_')[0] : event.id;
      const res = await fetch(
        `/api/v1/organizations/${session.organization.id}/calendar/events/${realId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );
      const json = await res.json();
      if (json.success) {
        fetchEvents();
        if (selectedEvent && (selectedEvent.id === event.id || selectedEvent.id.startsWith(realId))) {
          setSelectedEvent({ ...selectedEvent, status: newStatus });
        }
        if (onEventChanged) onEventChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add attachment handler
  const handleAddAttachment = () => {
    if (!newAttachmentName.trim()) return;
    const item: CalendarAttachment = {
      id: crypto.randomUUID(),
      name: newAttachmentName.trim(),
      url: `/docs/attachments/${Date.now()}-${newAttachmentName.trim().replace(/\s+/g, '_')}`,
      uploadedAt: new Date().toISOString(),
      sizeBytes: Math.floor(Math.random() * 800000) + 100000
    };
    setFormAttachments([...formAttachments, item]);
    setNewAttachmentName('');
  };

  // Remove attachment handler
  const handleRemoveAttachment = (attachmentId: string) => {
    setFormAttachments(formAttachments.filter(a => a.id !== attachmentId));
  };

  // Delete event with recurrence support
  const executeDelete = async (event: NormalCalendarItem, deleteMode: 'SERIES' | 'OCCURRENCE' = 'SERIES') => {
    const realId = event.id.includes('_') ? event.id.split('_')[0] : event.id;
    const occurrenceDate = event.id.includes('_') ? event.id.split('_')[1] : undefined;

    try {
      const res = await fetch(
        `/api/v1/organizations/${session.organization.id}/calendar/events/${realId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`
          },
          body: JSON.stringify({
            deleteMode,
            occurrenceDate
          })
        }
      );
      const json = await res.json();
      if (json.success) {
        setSelectedEvent(null);
        setShowRecurrencePrompt(null);
        fetchEvents();
        if (onEventChanged) onEventChanged();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Priority color badges
  const getPriorityBadge = (p: EventPriority) => {
    switch (p) {
      case 'URGENT': return 'bg-rose-950 text-rose-300 border-rose-700';
      case 'HIGH': return 'bg-amber-950 text-amber-300 border-amber-700';
      case 'MEDIUM': return 'bg-sky-950 text-sky-300 border-sky-700';
      case 'LOW': return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Status color badges
  const getStatusBadge = (s: EventStatus) => {
    switch (s) {
      case 'COMPLETED': return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'IN_PROGRESS': return 'bg-sky-950 text-sky-300 border-sky-700';
      case 'CANCELLED': return 'bg-slate-900 text-slate-400 border-slate-700 line-through';
      case 'POSTPONED': return 'bg-amber-950 text-amber-300 border-amber-700';
      case 'PENDING':
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Event category color badges
  const getCategoryColor = (cat: NormalEventType) => {
    switch (cat) {
      case 'MAINTENANCE': return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
      case 'INSPECTION': return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
      case 'MEETING': return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
      case 'DEADLINE': return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
      case 'TASK': return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
      default: return 'border-slate-700 bg-slate-800 text-slate-300';
    }
  };

  // Format header title according to view
  const formattedHeaderTitle = useMemo(() => {
    const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';
    if (currentView === 'day') {
      return currentDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (currentView === 'week') {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(start.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return `${monday.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} — ${sunday.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (currentView === 'month') {
      return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    if (currentView === 'year') {
      return currentDate.getFullYear().toString();
    }
    return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [currentDate, currentView, i18n.language]);

  // Calendar Days computation for Month View
  const monthCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }

    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Agenda View pagination
  const paginatedAgendaEvents = useMemo(() => {
    const startIdx = (agendaPage - 1) * agendaLimit;
    return events.slice(startIdx, startIdx + agendaLimit);
  }, [events, agendaPage, agendaLimit]);

  const totalAgendaPages = Math.ceil(events.length / agendaLimit) || 1;

  // Can current user write or edit?
  const canUserWrite = session.user.role !== 'VIEWER';
  const canUserDelete = session.user.role !== 'VIEWER' && session.user.role !== 'OPERATIONS_STAFF';

  return (
    <div className="space-y-4">
      {/* Top Header & View Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
              title="Précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              {t('calendar.today')}
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
              title="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white capitalize tracking-tight">
            {formattedHeaderTitle}
          </h2>
        </div>

        {/* View Switcher & Action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setCurrentView('day')}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentView === 'day' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('calendar.views.day')}
            </button>
            <button
              onClick={() => setCurrentView('week')}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentView === 'week' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('calendar.views.week')}
            </button>
            <button
              onClick={() => setCurrentView('month')}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentView === 'month' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('calendar.views.month')}
            </button>
            <button
              onClick={() => setCurrentView('year')}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentView === 'year' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('calendar.views.year')}
            </button>
            <button
              onClick={() => setCurrentView('agenda')}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentView === 'agenda' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('calendar.views.agenda')}
            </button>
          </div>

          {/* New Event Button */}
          {canUserWrite && (
            <button
              onClick={() => openCreateModal()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{t('calendar.newEvent')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-2.5 text-xs shadow-md">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('calendar.searchPlaceholder')}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">{t('calendar.filterCategory')}:</span>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">{t('calendar.all')}</option>
            <option value="TASK">{t('calendar.types.TASK')}</option>
            <option value="DEADLINE">{t('calendar.types.DEADLINE')}</option>
            <option value="MEETING">{t('calendar.types.MEETING')}</option>
            <option value="MAINTENANCE">{t('calendar.types.MAINTENANCE')}</option>
            <option value="INSPECTION">{t('calendar.types.INSPECTION')}</option>
            <option value="GENERAL_EVENT">{t('calendar.types.GENERAL_EVENT')}</option>
          </select>
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">{t('calendar.filterPriority')}:</span>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">{t('calendar.all')}</option>
            <option value="LOW">{t('calendar.priorities.LOW')}</option>
            <option value="MEDIUM">{t('calendar.priorities.MEDIUM')}</option>
            <option value="HIGH">{t('calendar.priorities.HIGH')}</option>
            <option value="URGENT">{t('calendar.priorities.URGENT')}</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">{t('calendar.filterStatus')}:</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">{t('calendar.all')}</option>
            <option value="PENDING">{t('calendar.statuses.PENDING')}</option>
            <option value="IN_PROGRESS">{t('calendar.statuses.IN_PROGRESS')}</option>
            <option value="COMPLETED">{t('calendar.statuses.COMPLETED')}</option>
            <option value="CANCELLED">{t('calendar.statuses.CANCELLED')}</option>
          </select>
        </div>

        {/* Farm filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">{t('calendar.filterFarm')}:</span>
          <select
            value={filterFarmId}
            onChange={e => setFilterFarmId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 max-w-[150px] truncate"
          >
            <option value="ALL">{t('calendar.all')}</option>
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Related Record Type filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">{t('calendar.filterRelated')}:</span>
          <select
            value={filterRelatedType}
            onChange={e => setFilterRelatedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">{t('calendar.all')}</option>
            <option value="CAMPAIGN">{t('calendar.relatedTypes.CAMPAIGN')}</option>
            <option value="CROP_CYCLE">{t('calendar.relatedTypes.CROP_CYCLE')}</option>
            <option value="MASTER_OPERATION">{t('calendar.relatedTypes.MASTER_OPERATION')}</option>
            <option value="ORDER">{t('calendar.relatedTypes.ORDER')}</option>
            <option value="SHIPMENT">{t('calendar.relatedTypes.SHIPMENT')}</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: MONTH VIEW */}
      {currentView === 'month' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-slate-950 border-b border-slate-800 text-center py-2.5 text-xs font-mono font-semibold text-slate-400">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Jeu</div>
            <div>Ven</div>
            <div className="text-emerald-400">Sam</div>
            <div className="text-emerald-400">Dim</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/60 bg-slate-950/40">
            {monthCalendarDays.map((slot, idx) => {
              const dayStr = slot.date.toISOString().substring(0, 10);
              const isToday = new Date().toDateString() === slot.date.toDateString();

              // Find events on this day
              const dayEvents = events.filter(e => {
                const eStartStr = e.startDateTime.substring(0, 10);
                const eEndStr = e.endDateTime.substring(0, 10);
                return dayStr >= eStartStr && dayStr <= eEndStr;
              });

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-1.5 flex flex-col justify-between transition-colors ${
                    slot.isCurrentMonth ? 'bg-slate-900/50' : 'bg-slate-950/80 text-slate-600'
                  } ${isToday ? 'ring-1 ring-emerald-500/50 bg-emerald-950/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-medium rounded-full h-5 w-5 flex items-center justify-center ${
                        isToday
                          ? 'bg-emerald-600 text-white font-bold'
                          : slot.isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {slot.date.getDate()}
                    </span>

                    {canUserWrite && slot.isCurrentMonth && (
                      <button
                        onClick={() => openCreateModal(slot.date)}
                        className="opacity-40 hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-white transition-opacity"
                        title="Ajouter un événement"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Events list in cell */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map(e => (
                      <div
                        key={e.id}
                        onClick={() => setSelectedEvent(e)}
                        className={`px-1.5 py-0.5 rounded text-[10px] truncate border cursor-pointer transition-all hover:scale-[1.02] ${getCategoryColor(
                          e.eventType
                        )} ${e.status === 'COMPLETED' ? 'line-through opacity-60' : ''} ${e.status === 'CANCELLED' ? 'line-through opacity-40 bg-slate-900' : ''}`}
                        title={`${e.title} (${e.status})`}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div
                        onClick={() => {
                          setCurrentDate(slot.date);
                          setCurrentView('day');
                        }}
                        className="text-[10px] text-emerald-400 font-mono text-center hover:underline cursor-pointer"
                      >
                        +{dayEvents.length - 3} de plus
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: WEEK VIEW */}
      {currentView === 'week' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* 7 Days Columns */}
          <div className="grid grid-cols-7 divide-x divide-slate-800 text-xs">
            {Array.from({ length: 7 }).map((_, i) => {
              const startOfWeek = new Date(currentDate);
              const day = startOfWeek.getDay();
              const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
              const dayDate = new Date(startOfWeek.setDate(diff + i));
              const dayStr = dayDate.toISOString().substring(0, 10);
              const isToday = new Date().toDateString() === dayDate.toDateString();

              const dayEvents = events.filter(e => {
                const s = e.startDateTime.substring(0, 10);
                const end = e.endDateTime.substring(0, 10);
                return dayStr >= s && dayStr <= end;
              });

              return (
                <div key={i} className="min-h-[420px] flex flex-col">
                  {/* Header */}
                  <div className={`p-2.5 text-center border-b border-slate-800 ${isToday ? 'bg-emerald-950/30' : 'bg-slate-950'}`}>
                    <div className="text-[11px] font-mono text-slate-400 uppercase">
                      {dayDate.toLocaleDateString(i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-base font-bold font-mono mt-0.5 ${isToday ? 'text-emerald-400' : 'text-white'}`}>
                      {dayDate.getDate()}
                    </div>
                    {canUserWrite && (
                      <button
                        onClick={() => openCreateModal(dayDate)}
                        className="mt-1 text-[10px] text-slate-400 hover:text-emerald-400 font-mono flex items-center justify-center gap-0.5 mx-auto"
                      >
                        <Plus className="h-2.5 w-2.5" /> Ajouter
                      </button>
                    )}
                  </div>

                  {/* Events list */}
                  <div className="flex-1 p-2 space-y-2 bg-slate-950/40">
                    {dayEvents.map(e => (
                      <div
                        key={e.id}
                        onClick={() => setSelectedEvent(e)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer hover:border-slate-500 transition-all ${getCategoryColor(
                          e.eventType
                        )} ${e.status === 'COMPLETED' ? 'line-through opacity-70' : ''} ${e.status === 'CANCELLED' ? 'line-through opacity-40' : ''}`}
                      >
                        <div className="font-semibold text-white truncate">{e.title}</div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>{e.allDay ? 'Journée entière' : e.startDateTime.substring(11, 16)}</span>
                          <span className={`px-1 rounded text-[9px] font-mono border ${getPriorityBadge(e.priority)}`}>
                            {e.priority}
                          </span>
                        </div>
                        {e.farmName && (
                          <div className="text-[10px] text-slate-400 truncate mt-1 flex items-center gap-1">
                            <Building2 className="h-2.5 w-2.5 text-emerald-400" />
                            {e.farmName}
                          </div>
                        )}
                      </div>
                    ))}
                    {dayEvents.length === 0 && (
                      <div className="h-full flex items-center justify-center text-slate-600 text-[11px] italic py-8">
                        Aucune tâche
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: DAY VIEW (WITH HOURLY SCHEDULE) */}
      {currentView === 'day' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white capitalize">
                {currentDate.toLocaleDateString(i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              <p className="text-xs text-slate-400 font-mono">Fuseau horaire : Africa/Conakry (GMT)</p>
            </div>
            {canUserWrite && (
              <button
                onClick={() => openCreateModal(currentDate)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 w-fit"
              >
                <Plus className="h-4 w-4" />
                Ajouter à cette date
              </button>
            )}
          </div>

          {(() => {
            const dayStr = currentDate.toISOString().substring(0, 10);
            const dayEvents = events.filter(e => {
              const s = e.startDateTime.substring(0, 10);
              const end = e.endDateTime.substring(0, 10);
              return dayStr >= s && dayStr <= end;
            });

            const allDayEvents = dayEvents.filter(e => e.allDay);
            const timedEvents = dayEvents.filter(e => !e.allDay);

            return (
              <div className="space-y-4">
                {/* All-Day section if present */}
                {allDayEvents.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <div className="text-[11px] font-mono text-emerald-400 font-semibold mb-2 uppercase">
                      {t('calendar.allDaySection')} ({allDayEvents.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allDayEvents.map(e => (
                        <div
                          key={e.id}
                          onClick={() => setSelectedEvent(e)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer hover:border-slate-500 ${getCategoryColor(
                            e.eventType
                          )}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{e.title}</span>
                            <span className={`px-1 rounded text-[9px] font-mono border ${getPriorityBadge(e.priority)}`}>
                              {e.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hourly Schedule View */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 font-semibold uppercase mb-2">
                    {t('calendar.hourlySchedule')}
                  </div>

                  {Array.from({ length: 14 }).map((_, hourIdx) => {
                    const hour = hourIdx + 6; // 06:00 to 19:00
                    const hourStr = String(hour).padStart(2, '0') + ':00';
                    const nextHourStr = String(hour + 1).padStart(2, '0') + ':00';

                    // Events falling into this hour
                    const slotEvents = timedEvents.filter(e => {
                      const eTime = e.startDateTime.substring(11, 16);
                      return eTime >= hourStr && eTime < nextHourStr;
                    });

                    return (
                      <div key={hour} className="flex items-start gap-3 py-1.5 border-b border-slate-900 last:border-0">
                        <span className="text-[11px] font-mono text-slate-500 w-12 shrink-0 pt-1">
                          {hourStr}
                        </span>

                        <div className="flex-1 min-h-[30px] flex flex-wrap gap-2 items-center">
                          {slotEvents.map(e => (
                            <div
                              key={e.id}
                              onClick={() => setSelectedEvent(e)}
                              className={`p-2 rounded-lg border text-xs cursor-pointer hover:border-slate-500 flex-1 min-w-[240px] flex items-center justify-between ${getCategoryColor(
                                e.eventType
                              )} ${e.status === 'COMPLETED' ? 'line-through opacity-70' : ''}`}
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-white">{e.title}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <span>{e.startDateTime.substring(11, 16)} — {e.endDateTime.substring(11, 16)}</span>
                                  {e.farmName && <span>&bull; {e.farmName}</span>}
                                  {e.assignedUserName && <span>&bull; {e.assignedUserName}</span>}
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${getPriorityBadge(e.priority)}`}>
                                {e.priority}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {dayEvents.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-lg border border-slate-800">
                    {t('calendar.noEvents')}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW 4: YEAR VIEW */}
      {currentView === 'year' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="text-xs text-slate-400">
            Aperçu annuel des 12 mois. Cliquez sur un mois pour ouvrir sa planification détaillée.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, monthIdx) => {
              const monthDate = new Date(currentDate.getFullYear(), monthIdx, 1);
              const monthEvents = events.filter(e => {
                const eDate = new Date(e.startDateTime);
                return eDate.getFullYear() === currentDate.getFullYear() && eDate.getMonth() === monthIdx;
              });

              return (
                <div
                  key={monthIdx}
                  onClick={() => {
                    setCurrentDate(monthDate);
                    setCurrentView('month');
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-emerald-500/50 cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="font-semibold text-white text-xs capitalize">
                      {monthDate.toLocaleDateString(i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US', { month: 'long' })}
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800">
                      {monthEvents.length} événements
                    </span>
                  </div>

                  <div className="space-y-1">
                    {monthEvents.slice(0, 3).map(e => (
                      <div key={e.id} className="text-[10px] truncate text-slate-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>{e.title}</span>
                      </div>
                    ))}
                    {monthEvents.length === 0 && (
                      <div className="text-[10px] text-slate-600 italic">Aucune tâche planifiée</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: AGENDA / LIST VIEW (WITH SORTING & PAGINATION) */}
      {currentView === 'agenda' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="font-mono text-slate-300 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-400" />
              <span>ORDRE DU JOUR / LISTE CHRONOLOGIQUE ({events.length} TÂCHES)</span>
            </div>

            {/* Sorting control */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                {t('calendar.sortBy')}:
              </span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="date_asc">{t('calendar.sortOptions.dateAsc')}</option>
                <option value="date_desc">{t('calendar.sortOptions.dateDesc')}</option>
                <option value="priority">{t('calendar.sortOptions.priority')}</option>
                <option value="status">{t('calendar.sortOptions.status')}</option>
                <option value="title">{t('calendar.sortOptions.title')}</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-3">
                <p>{t('calendar.noEvents')}</p>
                {canUserWrite && (
                  <button
                    onClick={() => openCreateModal()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
                  >
                    {t('calendar.newEvent')}
                  </button>
                )}
              </div>
            ) : (
              paginatedAgendaEvents.map(e => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEvent(e)}
                  className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getCategoryColor(e.eventType)}`}>
                        {e.eventType}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getPriorityBadge(e.priority)}`}>
                        {e.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getStatusBadge(e.status)}`}>
                        {e.status}
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-semibold">
                        {new Date(e.startDateTime).toLocaleDateString(i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-xs font-mono text-slate-400">
                        {e.allDay ? 'Toute la journée' : `${e.startDateTime.substring(11, 16)}`}
                      </span>
                    </div>

                    <h4 className={`text-sm font-semibold text-white ${e.status === 'COMPLETED' ? 'line-through text-slate-500' : ''} ${e.status === 'CANCELLED' ? 'line-through text-slate-500' : ''}`}>
                      {e.title}
                    </h4>
                    {e.description && <p className="text-xs text-slate-400 line-clamp-2">{e.description}</p>}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      {e.farmName && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Building2 className="h-3 w-3 text-emerald-400" />
                          {e.farmName}
                        </span>
                      )}
                      {e.assignedUserName && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <User className="h-3 w-3 text-sky-400" />
                          {e.assignedUserName}
                        </span>
                      )}
                      {e.dueDate && (
                        <span className="flex items-center gap-1 text-amber-400 font-mono text-[10px]">
                          <Clock className="h-3 w-3" />
                          Échéance : {new Date(e.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {e.recurrence && (
                        <span className="flex items-center gap-1 text-purple-400 font-mono text-[10px]">
                          <RotateCcw className="h-3 w-3" />
                          {e.recurrence.frequency}
                        </span>
                      )}
                      {e.linkedCampaignId && (
                        <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800">
                          <LinkIcon className="h-2.5 w-2.5" />
                          {e.linkedCampaignId}
                        </span>
                      )}
                      {e.attachments && e.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                          <Paperclip className="h-3 w-3 text-slate-400" />
                          {e.attachments.length} fichier(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {e.status !== 'COMPLETED' && e.status !== 'CANCELLED' && (
                      <button
                        onClick={ev => {
                          ev.stopPropagation();
                          handleQuickStatusChange(e, 'COMPLETED');
                        }}
                        className="px-2.5 py-1 text-xs bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Achever
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {events.length > 0 && (
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>{t('calendar.itemsPerPage')}:</span>
                <select
                  value={agendaLimit}
                  onChange={e => {
                    setAgendaLimit(parseInt(e.target.value, 10));
                    setAgendaPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  Affichage {Math.min((agendaPage - 1) * agendaLimit + 1, events.length)} - {Math.min(agendaPage * agendaLimit, events.length)} sur {events.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={agendaPage <= 1}
                  onClick={() => setAgendaPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono text-xs">
                  {t('calendar.page')} {agendaPage} / {totalAgendaPages}
                </span>
                <button
                  disabled={agendaPage >= totalAgendaPages}
                  onClick={() => setAgendaPage(p => Math.min(totalAgendaPages, p + 1))}
                  className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE EVENT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-emerald-400" />
                {t('calendar.newEvent')}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded text-rose-200 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.title')} *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Taille d'entretien des manguiers, Traitement bio..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.description')}</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Détails opérationnels, instructions pour l'équipe..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.category')}</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as NormalEventType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="TASK">{t('calendar.types.TASK')}</option>
                    <option value="DEADLINE">{t('calendar.types.DEADLINE')}</option>
                    <option value="MEETING">{t('calendar.types.MEETING')}</option>
                    <option value="MAINTENANCE">{t('calendar.types.MAINTENANCE')}</option>
                    <option value="INSPECTION">{t('calendar.types.INSPECTION')}</option>
                    <option value="GENERAL_EVENT">{t('calendar.types.GENERAL_EVENT')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.priority')}</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as EventPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="LOW">{t('calendar.priorities.LOW')}</option>
                    <option value="MEDIUM">{t('calendar.priorities.MEDIUM')}</option>
                    <option value="HIGH">{t('calendar.priorities.HIGH')}</option>
                    <option value="URGENT">{t('calendar.priorities.URGENT')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.status')}</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as EventStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="PENDING">{t('calendar.statuses.PENDING')}</option>
                    <option value="IN_PROGRESS">{t('calendar.statuses.IN_PROGRESS')}</option>
                    <option value="COMPLETED">{t('calendar.statuses.COMPLETED')}</option>
                    <option value="CANCELLED">{t('calendar.statuses.CANCELLED')}</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.start')} *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={e => setFormStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                    {!formAllDay && (
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={e => setFormStartTime(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.end')} *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={e => setFormEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                    {!formAllDay && (
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-900">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllDay}
                      onChange={e => setFormAllDay(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700"
                    />
                    <span>{t('calendar.fields.allDay')}</span>
                  </label>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{t('calendar.fields.dueDate')}:</span>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={e => setFormDueDate(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {t('calendar.fields.timezone')} : {formTimezone}
                  </span>
                </div>
              </div>

              {/* Assignee & Farm Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.assignee')}</label>
                  <select
                    value={formAssigneeId}
                    onChange={e => setFormAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="">-- Non assigné --</option>
                    {teamMembers.map(m => (
                      <option key={m.userId} value={m.userId}>
                        {m.fullName} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.farm')}</label>
                  <select
                    value={formFarmId}
                    onChange={e => setFormFarmId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="">-- Aucune exploitation rattachée --</option>
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Related Business Record Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.relatedRecord')}</label>
                  <select
                    value={formRelatedType}
                    onChange={e => setFormRelatedType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="NONE">{t('calendar.relatedTypes.NONE')}</option>
                    <option value="CAMPAIGN">{t('calendar.relatedTypes.CAMPAIGN')}</option>
                    <option value="CROP_CYCLE">{t('calendar.relatedTypes.CROP_CYCLE')}</option>
                    <option value="MASTER_OPERATION">{t('calendar.relatedTypes.MASTER_OPERATION')}</option>
                    <option value="ORDER">{t('calendar.relatedTypes.ORDER')}</option>
                    <option value="SHIPMENT">{t('calendar.relatedTypes.SHIPMENT')}</option>
                  </select>
                </div>

                {formRelatedType !== 'NONE' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Code / Identifiant de référence</label>
                    <input
                      type="text"
                      value={formRelatedId}
                      onChange={e => setFormRelatedId(e.target.value)}
                      placeholder="Ex: CAMP-2026-MANGUE, ORD-EU-882..."
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Recurrence Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.recurrence')}</label>
                  <select
                    value={formRecurrenceFreq}
                    onChange={e => setFormRecurrenceFreq(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="NONE">{t('calendar.frequencies.NONE')}</option>
                    <option value="DAILY">{t('calendar.frequencies.DAILY')}</option>
                    <option value="WEEKLY">{t('calendar.frequencies.WEEKLY')}</option>
                    <option value="BIWEEKLY">{t('calendar.frequencies.BIWEEKLY')}</option>
                    <option value="MONTHLY">{t('calendar.frequencies.MONTHLY')}</option>
                    <option value="YEARLY">{t('calendar.frequencies.YEARLY')}</option>
                  </select>
                </div>
                {formRecurrenceFreq !== 'NONE' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Intervalle de répétition</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formRecurrenceInterval}
                      onChange={e => setFormRecurrenceInterval(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.notes')}</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Notes de terrain, matériel requis, consignes particulières..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Attachments Section */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <label className="block text-xs text-slate-400">{t('calendar.fields.attachments')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAttachmentName}
                    onChange={e => setNewAttachmentName(e.target.value)}
                    placeholder="Ex: Certificat Phytosanitaire GlobalGAP, Analyse de Sol Coyah..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter
                  </button>
                </div>

                {formAttachments.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {formAttachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        <span className="flex items-center gap-1.5 text-slate-300 truncate">
                          <Paperclip className="h-3 w-3 text-slate-400" />
                          {att.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notice regarding notifications */}
              <div className="text-[11px] text-amber-400/80 bg-amber-950/20 p-2.5 rounded border border-amber-900/30 flex items-start gap-2">
                <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{t('calendar.notificationNotice')}</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-2 rounded text-xs bg-slate-800 text-slate-300 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT EVENT */}
      {isEditModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-emerald-400" />
                {t('calendar.editEvent')}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded text-rose-200 text-xs">
                {formError}
              </div>
            )}

            {/* Recurrence Choice if event is recurring */}
            {selectedEvent.recurrence && (
              <div className="p-3 bg-purple-950/30 border border-purple-800/60 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('calendar.seriesPromptTitle')}
                </div>
                <div className="flex gap-4 text-xs">
                  <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="updateMode"
                      value="OCCURRENCE"
                      checked={editUpdateMode === 'OCCURRENCE'}
                      onChange={() => setEditUpdateMode('OCCURRENCE')}
                    />
                    <span>{t('calendar.thisOccurrence')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="updateMode"
                      value="SERIES"
                      checked={editUpdateMode === 'SERIES'}
                      onChange={() => setEditUpdateMode('SERIES')}
                    />
                    <span>{t('calendar.entireSeries')}</span>
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.title')} *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.description')}</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.category')}</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as NormalEventType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="TASK">{t('calendar.types.TASK')}</option>
                    <option value="DEADLINE">{t('calendar.types.DEADLINE')}</option>
                    <option value="MEETING">{t('calendar.types.MEETING')}</option>
                    <option value="MAINTENANCE">{t('calendar.types.MAINTENANCE')}</option>
                    <option value="INSPECTION">{t('calendar.types.INSPECTION')}</option>
                    <option value="GENERAL_EVENT">{t('calendar.types.GENERAL_EVENT')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.priority')}</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as EventPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="LOW">{t('calendar.priorities.LOW')}</option>
                    <option value="MEDIUM">{t('calendar.priorities.MEDIUM')}</option>
                    <option value="HIGH">{t('calendar.priorities.HIGH')}</option>
                    <option value="URGENT">{t('calendar.priorities.URGENT')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.status')}</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as EventStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="PENDING">{t('calendar.statuses.PENDING')}</option>
                    <option value="IN_PROGRESS">{t('calendar.statuses.IN_PROGRESS')}</option>
                    <option value="COMPLETED">{t('calendar.statuses.COMPLETED')}</option>
                    <option value="CANCELLED">{t('calendar.statuses.CANCELLED')}</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.start')} *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={e => setFormStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                    {!formAllDay && (
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={e => setFormStartTime(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.end')} *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={e => setFormEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                    {!formAllDay && (
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-900">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllDay}
                      onChange={e => setFormAllDay(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700"
                    />
                    <span>{t('calendar.fields.allDay')}</span>
                  </label>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{t('calendar.fields.dueDate')}:</span>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={e => setFormDueDate(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {t('calendar.fields.timezone')} : {formTimezone}
                  </span>
                </div>
              </div>

              {/* Assignee & Farm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.assignee')}</label>
                  <select
                    value={formAssigneeId}
                    onChange={e => setFormAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="">-- Non assigné --</option>
                    {teamMembers.map(m => (
                      <option key={m.userId} value={m.userId}>
                        {m.fullName} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.farm')}</label>
                  <select
                    value={formFarmId}
                    onChange={e => setFormFarmId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="">-- Aucune exploitation rattachée --</option>
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Related Business Record Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.relatedRecord')}</label>
                  <select
                    value={formRelatedType}
                    onChange={e => setFormRelatedType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="NONE">{t('calendar.relatedTypes.NONE')}</option>
                    <option value="CAMPAIGN">{t('calendar.relatedTypes.CAMPAIGN')}</option>
                    <option value="CROP_CYCLE">{t('calendar.relatedTypes.CROP_CYCLE')}</option>
                    <option value="MASTER_OPERATION">{t('calendar.relatedTypes.MASTER_OPERATION')}</option>
                    <option value="ORDER">{t('calendar.relatedTypes.ORDER')}</option>
                    <option value="SHIPMENT">{t('calendar.relatedTypes.SHIPMENT')}</option>
                  </select>
                </div>

                {formRelatedType !== 'NONE' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Code / Identifiant de référence</label>
                    <input
                      type="text"
                      value={formRelatedId}
                      onChange={e => setFormRelatedId(e.target.value)}
                      placeholder="Ex: CAMP-2026-MANGUE, ORD-EU-882..."
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('calendar.fields.notes')}</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Attachments Section */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <label className="block text-xs text-slate-400">{t('calendar.fields.attachments')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAttachmentName}
                    onChange={e => setNewAttachmentName(e.target.value)}
                    placeholder="Ex: Certificat Phytosanitaire GlobalGAP, Rapport..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter
                  </button>
                </div>

                {formAttachments.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {formAttachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        <span className="flex items-center gap-1.5 text-slate-300 truncate">
                          <Paperclip className="h-3 w-3 text-slate-400" />
                          {att.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-2 rounded text-xs bg-slate-800 text-slate-300 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EVENT DETAILS */}
      {selectedEvent && !isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getCategoryColor(selectedEvent.eventType)}`}>
                    {selectedEvent.eventType}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getPriorityBadge(selectedEvent.priority)}`}>
                    {selectedEvent.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getStatusBadge(selectedEvent.status)}`}>
                    {selectedEvent.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-2">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedEvent.description && (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                {selectedEvent.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Début :</span>
                <div className="text-slate-200">
                  {selectedEvent.allDay
                    ? `${selectedEvent.startDateTime.substring(0, 10)} (Toute la journée)`
                    : new Date(selectedEvent.startDateTime).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Fin :</span>
                <div className="text-slate-200">
                  {selectedEvent.allDay
                    ? selectedEvent.endDateTime.substring(0, 10)
                    : new Date(selectedEvent.endDateTime).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Responsable :</span>
                <div className="text-slate-200">{selectedEvent.assignedUserName || 'Non assigné'}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Exploitation :</span>
                <div className="text-slate-200">{selectedEvent.farmName || 'Général'}</div>
              </div>

              {selectedEvent.dueDate && (
                <div className="col-span-2 border-t border-slate-900 pt-1.5">
                  <span className="text-[10px] text-amber-500 uppercase block mb-0.5">Date d'échéance :</span>
                  <div className="text-amber-300">{new Date(selectedEvent.dueDate).toLocaleDateString()}</div>
                </div>
              )}

              {/* Linked business records */}
              {(selectedEvent.linkedCampaignId || selectedEvent.linkedCropCycleId || selectedEvent.linkedMasterOperationId || selectedEvent.linkedOrderId || selectedEvent.linkedShipmentId) && (
                <div className="col-span-2 border-t border-slate-900 pt-1.5">
                  <span className="text-[10px] text-emerald-400 uppercase block mb-0.5">Liaison Agrobusiness :</span>
                  <div className="text-emerald-300 flex items-center gap-1.5">
                    <LinkIcon className="h-3 w-3" />
                    {selectedEvent.linkedCampaignId && <span>Campagne : {selectedEvent.linkedCampaignId}</span>}
                    {selectedEvent.linkedCropCycleId && <span>Cycle Cultural ID : {selectedEvent.linkedCropCycleId}</span>}
                    {selectedEvent.linkedMasterOperationId && <span>Opération : {selectedEvent.linkedMasterOperationId}</span>}
                    {selectedEvent.linkedOrderId && <span>Commande : {selectedEvent.linkedOrderId}</span>}
                    {selectedEvent.linkedShipmentId && <span>Expédition : {selectedEvent.linkedShipmentId}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Recurrence Rule Details */}
            {selectedEvent.recurrence && (
              <div className="text-xs bg-purple-950/20 p-2.5 rounded-lg border border-purple-900/40 font-mono text-purple-300 flex items-center gap-2">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>
                  Récurrence : {selectedEvent.recurrence.frequency} (intervalle : {selectedEvent.recurrence.interval || 1})
                </span>
              </div>
            )}

            {/* Field Notes */}
            {selectedEvent.notes && (
              <div className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">Notes de terrain :</span>
                <div className="text-slate-300 whitespace-pre-wrap">{selectedEvent.notes}</div>
              </div>
            )}

            {/* Attachments list */}
            {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
              <div className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Pièces jointes & Documents ({selectedEvent.attachments.length}) :</span>
                {selectedEvent.attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                    <span className="flex items-center gap-2 text-slate-300 truncate">
                      <FileText className="h-3.5 w-3.5 text-emerald-400" />
                      {att.name}
                    </span>
                    <a
                      href={att.url}
                      onClick={e => {
                        e.preventDefault();
                        alert(`Téléchargement simulé de la pièce jointe : ${att.name}`);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono text-[10px]"
                    >
                      <Download className="h-3 w-3" />
                      Voir
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Audit info */}
            <div className="text-[11px] text-slate-500 font-mono border-t border-slate-800/80 pt-2 flex flex-wrap justify-between gap-2">
              <span>Créé par : {selectedEvent.createdByUserName || 'Système'}</span>
              <span>Créé le : {new Date(selectedEvent.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {canUserDelete && (
                  <button
                    onClick={() => {
                      if (selectedEvent.recurrence?.frequency) {
                        setShowRecurrencePrompt({ mode: 'delete', event: selectedEvent });
                      } else {
                        executeDelete(selectedEvent, 'SERIES');
                      }
                    }}
                    className="px-3 py-1.5 rounded text-xs bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </button>
                )}

                {canUserWrite && (
                  <button
                    onClick={() => openEditModal(selectedEvent)}
                    className="px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </button>
                )}

                {onNavigateToAgricultural && (selectedEvent.linkedCampaignId || selectedEvent.linkedMasterOperationId) && (
                  <button
                    onClick={() => {
                      onNavigateToAgricultural({
                        campaignId: selectedEvent.linkedCampaignId,
                        operationId: selectedEvent.linkedMasterOperationId
                      });
                      setSelectedEvent(null);
                    }}
                    className="px-3 py-1.5 rounded text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Sprout className="h-3.5 w-3.5" />
                    {t('agricultural.operations.openOperation') || 'Ouvrir dans le Cœur Agricole'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Cancel action */}
                {selectedEvent.status !== 'CANCELLED' && canUserWrite && (
                  <button
                    onClick={() => handleQuickStatusChange(selectedEvent, 'CANCELLED')}
                    className="px-2.5 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Annuler
                  </button>
                )}

                {/* Complete or Re-open */}
                {selectedEvent.status !== 'COMPLETED' ? (
                  <button
                    onClick={() => handleQuickStatusChange(selectedEvent, 'COMPLETED')}
                    className="px-3.5 py-1.5 rounded text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('calendar.markCompleted')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleQuickStatusChange(selectedEvent, 'IN_PROGRESS')}
                    className="px-3 py-1.5 rounded text-xs bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Rouvrir
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECURRENCE CHOICE PROMPT */}
      {showRecurrencePrompt && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-400" />
              {t('calendar.seriesPromptTitle')}
            </h3>
            <p className="text-xs text-slate-300">{t('calendar.seriesPromptText')}</p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  if (showRecurrencePrompt.mode === 'delete') {
                    executeDelete(showRecurrencePrompt.event, 'OCCURRENCE');
                  }
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-white flex items-center justify-between"
              >
                <span>{t('calendar.thisOccurrence')}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  if (showRecurrencePrompt.mode === 'delete') {
                    executeDelete(showRecurrencePrompt.event, 'SERIES');
                  }
                }}
                className="w-full text-left p-3 rounded-lg border border-rose-900/40 hover:bg-rose-950/40 text-xs font-semibold text-rose-300 flex items-center justify-between"
              >
                <span>{t('calendar.entireSeries')}</span>
                <ChevronRight className="h-4 w-4 text-rose-400" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRecurrencePrompt(null)}
                className="px-3 py-1.5 rounded text-xs bg-slate-800 text-slate-400 hover:text-white"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
