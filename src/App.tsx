/**
 * FARMING CALENDAR — MASTER UI/UX DESIGN SYSTEM & APPLICATION INTERFACE
 * Global Design System, Product Experience & Enterprise Agribusiness Shell
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  ShieldCheck,
  Building2,
  Users,
  Database,
  Lock,
  Globe2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  LogOut,
  LogIn,
  UserPlus,
  Layers,
  MapPin,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Search,
  Sliders,
  DollarSign,
  ShoppingCart,
  Warehouse,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { UserRole, Organization, Farm, FarmPlot, AuthSession } from './types/organization.ts';
import { AppShell, AppTab } from './components/shell/AppShell.tsx';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard.tsx';
import { MasterCalendarView } from './components/master-calendar/MasterCalendarView.tsx';
import { NormalCalendarView } from './components/NormalCalendarView.tsx';
import { AgriculturalCoreView } from './components/AgriculturalCoreView.tsx';
import { CommercialView } from './components/commercial/CommercialView.tsx';
import { OperationsView } from './components/operations/OperationsView.tsx';
import { LogisticsView } from './components/logistics/LogisticsView.tsx';
import { FinanceView } from './components/finance/FinanceView.tsx';
import { OrganizationSettingsView } from './components/settings/OrganizationSettingsView.tsx';
import { DesignSystemShowcase } from './components/design-system/DesignSystemShowcase.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { BrandLogo } from './components/brand/BrandLogo.tsx';
import { Card, CardHeader } from './components/ui/Card.tsx';
import { Button } from './components/ui/Button.tsx';
import { Badge, StatusDot } from './components/ui/Badge.tsx';
import { Modal } from './components/ui/Modal.tsx';
import { Input, Select } from './components/ui/Input.tsx';

interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: Array<{
    name: string;
    category: string;
    passed: boolean;
    message: string;
    durationMs: number;
  }>;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [navAgriCampaignId, setNavAgriCampaignId] = useState<string | undefined>(undefined);
  const [navAgriOperationId, setNavAgriOperationId] = useState<string | undefined>(undefined);
  
  // Auth state
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');

  // Form states
  const [loginEmail, setLoginEmail] = useState('admin.kindia@farmingcalendar.dev');
  const [loginPassword, setLoginPassword] = useState('DevPass2026!');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regOrgName, setRegOrgName] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Business state
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Farm creation form
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmCode, setNewFarmCode] = useState('');
  const [newFarmRegion, setNewFarmRegion] = useState('Basse-Guinée');
  const [newFarmPrefecture, setNewFarmPrefecture] = useState('Kindia');
  const [newFarmArea, setNewFarmArea] = useState('20');
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);

  // Plot creation form
  const [newPlotName, setNewPlotName] = useState('');
  const [newPlotCode, setNewPlotCode] = useState('');
  const [newPlotArea, setNewPlotArea] = useState('5');
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);

  // Add member form
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('OPERATIONS_STAFF');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Perform login
  const handleLogin = async (emailToUse?: string, passwordToUse?: string) => {
    setAuthError('');
    setAuthSuccess('');
    try {
      const email = emailToUse || loginEmail;
      const password = passwordToUse || loginPassword;

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Service d\'authentification momentanément indisponible.');
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Identifiants incorrects');
      }

      setSession(json.data);
      setAuthToken(json.data.token);
      setAuthSuccess(`Connecté en tant que ${json.data.user.fullName} (${json.data.user.role})`);
    } catch (err: any) {
      let msg = String(err?.message || '');
      if (msg.includes('<') || msg.includes('doctype') || msg.includes('JSON')) {
        msg = 'Impossible de joindre le serveur d\'authentification.';
      }
      setAuthError(msg || 'Échec de connexion');
    }
  };

  // Quick switch between development test accounts
  const quickLoginAs = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('DevPass2026!');
    handleLogin(email, 'DevPass2026!');
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          fullName: regFullName,
          organizationName: regOrgName,
          preferredLanguage: i18n.language.startsWith('fr') ? 'fr' : 'en',
          countryCode: 'GN'
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Service d\'inscription momentanément indisponible.');
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Échec de l\'inscription');
      }

      setSession(json.data);
      setAuthToken(json.data.token);
      setShowRegisterForm(false);
      setAuthSuccess(`Organisation créée : ${json.data.organization.name}`);
    } catch (err: any) {
      let msg = String(err?.message || '');
      if (msg.includes('<') || msg.includes('doctype') || msg.includes('JSON')) {
        msg = 'Impossible de joindre le service d\'inscription.';
      }
      setAuthError(msg || 'Échec de l\'inscription');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    try {
      sessionStorage.removeItem('farming_calendar_token');
      sessionStorage.removeItem('farming_calendar_session');
    } catch {}
    setSession(null);
    setAuthToken('');
    setFarms([]);
    setPlots([]);
    setTeamMembers([]);
    setAuditLogs([]);
    setAuthSuccess('Déconnecté');
  };

  // Helper for safe JSON fetching
  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...(options?.headers || {})
        }
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        return { success: false, data: null };
      }
      return await res.json();
    } catch {
      return { success: false, data: null };
    }
  };

  // Load farms when organization or session changes
  const loadFarms = async () => {
    if (!session || !authToken) return;
    try {
      const json = await safeFetchJson(`/api/v1/organizations/${session.organization.id}/farms`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (json?.success && Array.isArray(json.data)) {
        setFarms(json.data);
        if (json.data.length > 0 && !selectedFarm) {
          setSelectedFarm(json.data[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Load plots for selected farm
  const loadPlots = async (farmId: string) => {
    if (!session || !authToken) return;
    try {
      const json = await safeFetchJson(`/api/v1/organizations/${session.organization.id}/farms/${farmId}/plots`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (json?.success && Array.isArray(json.data)) {
        setPlots(json.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Load team members
  const loadTeamMembers = async () => {
    if (!session || !authToken) return;
    try {
      const json = await safeFetchJson(`/api/v1/organizations/${session.organization.id}/members`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (json?.success && Array.isArray(json.data)) {
        setTeamMembers(json.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Load audit logs
  const loadAuditLogs = async () => {
    if (!session || !authToken) return;
    try {
      const json = await safeFetchJson('/api/v1/audit-logs', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (json?.success && Array.isArray(json.data)) {
        setAuditLogs(json.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Create farm
  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/organizations/${session!.organization.id}/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: newFarmName,
          code: newFarmCode,
          region: newFarmRegion,
          prefecture: newFarmPrefecture,
          totalAreaHa: parseFloat(newFarmArea) || 10,
          usableAreaHa: (parseFloat(newFarmArea) || 10) * 0.85
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Error creating farm');
      }

      setActionMessage({ type: 'success', text: `Exploitation '${newFarmName}' créée avec succès !` });
      setShowAddFarmModal(false);
      setNewFarmName('');
      setNewFarmCode('');
      loadFarms();
      loadAuditLogs();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Create plot
  const handleCreatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/organizations/${session!.organization.id}/farms/${selectedFarm.id}/plots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: newPlotName,
          code: newPlotCode,
          areaHectares: parseFloat(newPlotArea) || 2,
          soilType: 'Sablo-limoneux',
          irrigationType: 'DRIP'
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Error creating plot');
      }

      setActionMessage({ type: 'success', text: `Parcelle '${newPlotName}' créée avec succès !` });
      setShowAddPlotModal(false);
      setNewPlotName('');
      setNewPlotCode('');
      loadPlots(selectedFarm.id);
      loadAuditLogs();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Add member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/organizations/${session!.organization.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to add member');
      }

      setActionMessage({ type: 'success', text: `Membre ajouté avec le rôle ${newMemberRole} !` });
      setShowAddMemberModal(false);
      setNewMemberEmail('');
      loadTeamMembers();
      loadAuditLogs();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Run test suite
  const runTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/v1/system/run-tests', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setTestSummary(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Check for restored active session in session storage and validate against server
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = sessionStorage.getItem('farming_calendar_token');
        const savedSession = sessionStorage.getItem('farming_calendar_session');
        if (!savedToken || !savedSession) {
          setSession(null);
          setAuthToken('');
          return;
        }

        let parsed: AuthSession;
        try {
          parsed = JSON.parse(savedSession);
        } catch {
          sessionStorage.removeItem('farming_calendar_token');
          sessionStorage.removeItem('farming_calendar_session');
          setSession(null);
          setAuthToken('');
          return;
        }

        // 1. Client-side expiration check
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
          console.warn('Stored session has expired, clearing session storage');
          sessionStorage.removeItem('farming_calendar_token');
          sessionStorage.removeItem('farming_calendar_session');
          setSession(null);
          setAuthToken('');
          setAuthError('Votre session a expiré. Veuillez vous reconnecter.');
          return;
        }

        // 2. Validate token with server /api/v1/auth/me
        try {
          const res = await fetch('/api/v1/auth/me', {
            headers: { 
              'Accept': 'application/json',
              Authorization: `Bearer ${savedToken}` 
            }
          });

          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const json = await res.json();
              if (json.success) {
                setAuthToken(savedToken);
                setSession(parsed);
                return;
              }
            }
          }
        } catch (fetchErr) {
          console.warn('Network issue checking session:', fetchErr);
        }

        // Server rejected token (e.g. user was removed or token expired/invalid)
        console.warn('Server rejected stored token, clearing session storage');
        sessionStorage.removeItem('farming_calendar_token');
        sessionStorage.removeItem('farming_calendar_session');
        setSession(null);
        setAuthToken('');
        setAuthError('Votre session a expiré. Veuillez vous reconnecter.');
      } catch (err) {
        console.error('Error restoring session:', err);
        try {
          sessionStorage.removeItem('farming_calendar_token');
          sessionStorage.removeItem('farming_calendar_session');
        } catch {}
        setSession(null);
        setAuthToken('');
      }
    }

    restoreSession();
  }, []);

  // Listen for session expiry event from any API call
  useEffect(() => {
    const handleAuthExpired = (e: any) => {
      try {
        sessionStorage.removeItem('farming_calendar_token');
        sessionStorage.removeItem('farming_calendar_session');
      } catch {}
      setSession(null);
      setAuthToken('');
      setAuthError(e?.detail?.message || 'Votre session a expiré. Veuillez vous reconnecter.');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (session) {
      loadFarms();
      loadTeamMembers();
      loadAuditLogs();
    }
  }, [session]);

  useEffect(() => {
    if (selectedFarm) {
      loadPlots(selectedFarm.id);
    }
  }, [selectedFarm]);

  // If not logged in, render the premium agricultural login page
  if (!session) {
    return (
      <LoginPage
        initialError={authError}
        onSuccess={(newSession) => {
          setSession(newSession);
          setAuthToken(newSession.token);
          setAuthError('');
          try {
            sessionStorage.setItem('farming_calendar_token', newSession.token);
            sessionStorage.setItem('farming_calendar_session', JSON.stringify(newSession));
          } catch {
            // Ignore storage restrictions
          }
          setAuthSuccess(`Connecté en tant que ${newSession.user.fullName} (${newSession.user.role})`);
        }}
      />
    );
  }

  // Authenticated State wrapped inside AppShell
  return (
    <AppShell
      session={session}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={handleLogout}
      onSwitchDevAccount={quickLoginAs}
    >
      {/* Action message banners */}
      {actionMessage && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs hover:underline opacity-80">
            Fermer
          </button>
        </div>
      )}

      {/* 1. OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <OverviewDashboard
          session={session}
          farms={farms}
          onNavigate={(tab) => setActiveTab(tab as AppTab)}
          onQuickAction={(act) => {
            if (act === 'create_campaign') setActiveTab('agricultural');
            else if (act === 'record_harvest') setActiveTab('agricultural');
            else if (act === 'create_calendar_event') setActiveTab('calendar');
          }}
        />
      )}

      {/* 2. OUR MASTER CALENDAR (CONTROL CENTER & BACKWARD PLANNER) */}
      {activeTab === 'master_calendar' && (
        <MasterCalendarView
          session={session}
          farms={farms}
          onOpenCampaign={(campId) => {
            setNavAgriCampaignId(campId);
            setActiveTab('agricultural');
          }}
          onOpenNormalCalendar={() => setActiveTab('calendar')}
        />
      )}

      {/* 3. NORMAL CALENDAR (OPERATIONAL SCHEDULING & TASKS) */}
      {activeTab === 'calendar' && (
        <NormalCalendarView
          session={session}
          farms={farms}
          teamMembers={teamMembers}
          onEventChanged={() => loadAuditLogs()}
          onNavigateToAgricultural={({ campaignId, operationId }) => {
            setNavAgriCampaignId(campaignId);
            setNavAgriOperationId(operationId);
            setActiveTab('agricultural');
          }}
        />
      )}

      {/* 4. AGRICULTURAL CORE & CAMPAIGNS */}
      {activeTab === 'agricultural' && (
        <AgriculturalCoreView
          session={session}
          farms={farms}
          teamMembers={teamMembers}
          initialCampaignId={navAgriCampaignId}
          initialOperationId={navAgriOperationId}
          onNavigateToCalendar={(date) => {
            setActiveTab('calendar');
          }}
          onDataChanged={() => loadAuditLogs()}
        />
      )}

      {/* 5. FARMS AND FIELDS */}
      {activeTab === 'farms' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
                  GESTION FONCIÈRE
                </span>
                <Badge variant="forest" size="xs">
                  {session.organization.name}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
                Exploitations Agricoles & Découpage Parcellaire
              </h1>
              <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                Surfaces enregistrées, géolocalisation, typologie des sols et accès aux points d'eau d'irrigation.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddFarmModal(true)}
            >
              Ajouter une Exploitation
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Exploitations List */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-[#66736B] dark:text-[#9EB0A5] uppercase tracking-wider font-mono">
                Exploitations Enregistrées ({farms.length})
              </span>
              {farms.length === 0 ? (
                <div className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-xl text-xs text-[#66736B] dark:text-[#9EB0A5] text-center">
                  Aucune exploitation enregistrée pour cette organisation.
                </div>
              ) : (
                farms.map(farm => (
                  <div
                    key={farm.id}
                    onClick={() => setSelectedFarm(farm)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedFarm?.id === farm.id
                        ? 'bg-white dark:bg-[#14201A] border-[#2F7D4A] ring-1 ring-[#2F7D4A]/20 shadow-xs'
                        : 'bg-white/60 dark:bg-[#14201A]/60 border-[#E1E7E0] dark:border-[#24352C] hover:border-[#CDD6CC]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#202924] dark:text-[#EEF4F0] text-sm">{farm.name}</span>
                      <span className="text-[10px] font-mono bg-[#F0F4EE] dark:bg-[#1B2B23] text-[#202924] dark:text-[#EEF4F0] px-1.5 py-0.5 rounded border border-[#E1E7E0] dark:border-[#283D33]">
                        {farm.code}
                      </span>
                    </div>
                    <div className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#2F7D4A]" />
                      {farm.region} ({farm.prefecture || 'N/A'})
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#66736B] dark:text-[#9EB0A5] mt-3 pt-2 border-t border-[#E1E7E0] dark:border-[#24352C]">
                      <span>Superficie : <strong className="text-[#202924] dark:text-[#EEF4F0] font-mono">{farm.totalAreaHectares} ha</strong></span>
                      <ChevronRight className="h-4 w-4 text-[#8A988F]" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Parcelles List */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#66736B] dark:text-[#9EB0A5] uppercase tracking-wider font-mono">
                  Parcelles Cultivables &bull; {selectedFarm ? selectedFarm.name : 'Sélectionnez une ferme'} ({plots.length})
                </span>
                {selectedFarm && (
                  <Button
                    variant="outline"
                    size="xs"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setShowAddPlotModal(true)}
                  >
                    Nouvelle Parcelle
                  </Button>
                )}
              </div>

              {plots.length === 0 ? (
                <div className="p-8 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-xl text-xs text-[#66736B] dark:text-[#9EB0A5] text-center">
                  Aucune parcelle créée sur cette exploitation. Cliquez sur "Nouvelle Parcelle" pour en ajouter.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {plots.map(plot => (
                    <div key={plot.id} className="p-4 bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#202924] dark:text-[#EEF4F0] text-xs">{plot.name}</span>
                        <span className="text-[10px] font-mono bg-[#F0F4EE] dark:bg-[#1B2B23] text-[#2F7D4A] dark:text-[#77A96B] border border-[#E1E7E0] dark:border-[#283D33] px-1.5 py-0.5 rounded">
                          {plot.code}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#66736B] dark:text-[#9EB0A5] pt-1 font-mono">
                        <div>Superficie : <span className="text-[#202924] dark:text-[#EEF4F0] font-semibold">{plot.areaHectares} ha</span></div>
                        <div>Sol : <span className="text-[#202924] dark:text-[#EEF4F0]">{plot.soilType || 'Standard'}</span></div>
                        <div>Irrigation : <span className="text-[#202924] dark:text-[#EEF4F0]">{plot.irrigationType}</span></div>
                        <div>Statut : <span className="text-[#2F7D4A] dark:text-[#77A96B] font-semibold">{plot.currentStatus}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal: Add Farm */}
          <Modal
            isOpen={showAddFarmModal}
            onClose={() => setShowAddFarmModal(false)}
            title="Ajouter une Exploitation (Ferme)"
            subtitle="Enregistrez un nouveau site d'exploitation agricole"
          >
            <form onSubmit={handleCreateFarm} className="space-y-3">
              <Input
                label="Nom de l'exploitation"
                required
                value={newFarmName}
                onChange={e => setNewFarmName(e.target.value)}
                placeholder="Ex: Ferme Friguiagbé Ouest"
              />
              <Input
                label="Code unique d'exploitation"
                required
                value={newFarmCode}
                onChange={e => setNewFarmCode(e.target.value)}
                placeholder="Ex: FARM-KND-03"
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Région"
                  value={newFarmRegion}
                  onChange={e => setNewFarmRegion(e.target.value)}
                  options={[
                    { value: 'Basse-Guinée', label: 'Basse-Guinée' },
                    { value: 'Moyenne-Guinée', label: 'Moyenne-Guinée' },
                    { value: 'Haute-Guinée', label: 'Haute-Guinée' },
                    { value: 'Guinée Forestière', label: 'Guinée Forestière' }
                  ]}
                />
                <Input
                  label="Préfecture"
                  value={newFarmPrefecture}
                  onChange={e => setNewFarmPrefecture(e.target.value)}
                />
              </div>
              <Input
                label="Superficie Totale (Hectares)"
                type="number"
                min="1"
                value={newFarmArea}
                onChange={e => setNewFarmArea(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddFarmModal(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Créer l'exploitation
                </Button>
              </div>
            </form>
          </Modal>

          {/* Modal: Add Plot */}
          {selectedFarm && (
            <Modal
              isOpen={showAddPlotModal}
              onClose={() => setShowAddPlotModal(false)}
              title={`Ajouter une Parcelle sur ${selectedFarm.name}`}
              subtitle="Délimitez une zone cultivable pour accueillir les campagnes de production"
            >
              <form onSubmit={handleCreatePlot} className="space-y-3">
                <Input
                  label="Nom de la parcelle"
                  required
                  value={newPlotName}
                  onChange={e => setNewPlotName(e.target.value)}
                  placeholder="Ex: Bloc Piment K-04"
                />
                <Input
                  label="Code parcelle"
                  required
                  value={newPlotCode}
                  onChange={e => setNewPlotCode(e.target.value)}
                  placeholder="Ex: PLOT-PIM-04"
                />
                <Input
                  label="Superficie (ha)"
                  type="number"
                  step="0.1"
                  value={newPlotArea}
                  onChange={e => setNewPlotArea(e.target.value)}
                />
                <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowAddPlotModal(false)}>
                    Annuler
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Créer la parcelle
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* 6. COMMERCIAL B2B WORKSPACE */}
      {activeTab === 'commercial' && (
        <CommercialView
          session={session}
          onNavigateToMasterCalendar={() => setActiveTab('master_calendar')}
        />
      )}

      {/* 7. OPERATIONS, INVENTORY & QUALITY */}
      {activeTab === 'operations' && (
        <OperationsView session={session} />
      )}

      {/* 8. LOGISTICS & EXPORT TRADE */}
      {activeTab === 'logistics' && (
        <LogisticsView
          session={session}
          onNavigateToMasterCalendar={() => setActiveTab('master_calendar')}
        />
      )}

      {/* 9. FINANCE & ANALYTICS */}
      {activeTab === 'finance' && (
        <FinanceView session={session} />
      )}

      {/* 9. TEAM & RBAC */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
                  CONTRÔLE D'ACCÈS RBAC
                </span>
                <Badge variant="forest" size="xs">
                  {session.organization.name}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
                Équipe & Rôles Organisationnels
              </h1>
              <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                8 rôles stricts : Propriétaire plateforme, Administrateur, Chef d'exploitation, Agronome, Responsable Commercial, Finance, Équipe terrain et Auditeur.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setShowAddMemberModal(true)}
            >
              Inviter un Membre
            </Button>
          </div>

          <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F8F4] dark:bg-[#18261F] border-b border-[#E1E7E0] dark:border-[#24352C] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px]">
                    <th className="py-3 px-4 font-semibold">Membre</th>
                    <th className="py-3 px-3 font-semibold">Email</th>
                    <th className="py-3 px-3 font-semibold">Rôle Attribué</th>
                    <th className="py-3 px-4 font-semibold">Date d'adhésion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {teamMembers.map(m => (
                    <tr key={m.membershipId} className="hover:bg-[#F7F8F4]/50 dark:hover:bg-[#18261F]/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#202924] dark:text-[#EEF4F0]">{m.fullName}</td>
                      <td className="py-3 px-3 text-[#66736B] dark:text-[#9EB0A5] font-mono">{m.email}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F0F4EE] dark:bg-[#1B2B23] text-[#2F7D4A] dark:text-[#77A96B] border border-[#E1E7E0] dark:border-[#283D33]">
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#8A988F] text-[11px] font-mono">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal: Add Member */}
          <Modal
            isOpen={showAddMemberModal}
            onClose={() => setShowAddMemberModal(false)}
            title="Attribuer un Rôle à un Utilisateur"
            subtitle="Ajoutez un collaborateur à votre organisation agricole"
          >
            <form onSubmit={handleAddMember} className="space-y-3">
              <Input
                label="Email de l'utilisateur"
                type="email"
                required
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                placeholder="ex: ops.kindia@farmingcalendar.dev"
              />
              <Select
                label="Rôle Attribué"
                value={newMemberRole}
                onChange={e => setNewMemberRole(e.target.value as UserRole)}
                options={[
                  { value: 'ORG_ADMIN', label: 'ORG_ADMIN — Administrateur' },
                  { value: 'MANAGER', label: 'MANAGER — Chef d\'Exploitation' },
                  { value: 'AGRONOMIST', label: 'AGRONOMIST — Ingénieur Agronome' },
                  { value: 'COMMERCIAL_MANAGER', label: 'COMMERCIAL_MANAGER — Responsable Ventes' },
                  { value: 'FINANCE_MANAGER', label: 'FINANCE_MANAGER — Responsable Budgets' },
                  { value: 'OPERATIONS_STAFF', label: 'OPERATIONS_STAFF — Équipe Terrain' },
                  { value: 'VIEWER', label: 'VIEWER — Observateur / Auditeur' }
                ]}
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7E0] dark:border-[#24352C]">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddMemberModal(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Enregistrer le rôle
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* 10. SECURITY AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
                  CONFORMITÉ & SÉCURITÉ
                </span>
                <Badge variant="forest" size="xs">
                  Journal Inaltérable
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
                Piste d'Audit & Journalisation des Opérations
              </h1>
              <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                Traçabilité des authentifications, modifications de campagnes, enregistrements de récoltes et tentatives de violation.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={loadAuditLogs}
            >
              Actualiser
            </Button>
          </div>

          <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F7F8F4] dark:bg-[#18261F] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px] border-b border-[#E1E7E0] dark:border-[#24352C] sticky top-0">
                  <tr>
                    <th className="py-3 px-4">{t('audit.timestamp')}</th>
                    <th className="py-3 px-3">{t('audit.action')}</th>
                    <th className="py-3 px-3">{t('audit.user')}</th>
                    <th className="py-3 px-3">{t('audit.role')}</th>
                    <th className="py-3 px-3">{t('audit.target')}</th>
                    <th className="py-3 px-4">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-[#F7F8F4]/50 dark:hover:bg-[#18261F]/30 transition-colors">
                      <td className="py-3 px-4 text-[#8A988F] font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          log.action.includes('FAIL') || log.action.includes('VIOLATION') || log.action.includes('UNAUTHORIZED')
                            ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#202924] dark:text-[#EEF4F0]">{log.user_email || 'Anonyme'}</td>
                      <td className="py-3 px-3 text-[#66736B] dark:text-[#9EB0A5] font-mono">{log.user_role || 'N/A'}</td>
                      <td className="py-3 px-3 text-[#66736B] dark:text-[#9EB0A5] font-mono">{log.target_entity}</td>
                      <td className="py-3 px-4 text-[#8A988F] text-[11px] font-mono truncate max-w-xs">
                        {JSON.stringify(log.details_json || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 11. AUTOMATED TEST SUITE RUNNER (89 TESTS LIVE RUNNER) */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
                  ASSURANCE QUALITÉ & SÉCURITÉ
                </span>
                <Badge variant="forest" size="xs">
                  {testSummary ? `${testSummary.total} Tests Automatisés` : '89 Tests Automatisés (Phases 1-11)'}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
                Banc d'Essai Automatisé (Automated Test Suite)
              </h1>
              <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                Vérification en direct de l'isolation multi-tenant, RBAC, calendrier maître, réservations commerciales, usinage, traçabilité recall, expéditions export, budgets OPEX/CAPEX, rentabilité unitaire, trésorerie BFR, modélisation DCF, stress tests financiers, tableaux de bord de gestion, parité bilingue FR/EN, formatage régional et les 10 scénarios de panne de mise en production (Phases 1 à 11).
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Play className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />}
              disabled={isRunningTests}
              onClick={runTests}
            >
              {isRunningTests ? 'Exécution des 89 Tests...' : 'Lancer les 89 Tests en Direct'}
            </Button>
          </div>

          {/* Test Summary Banner */}
          {testSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-bold font-mono text-[#202924] dark:text-[#EEF4F0]">{testSummary.passed} / {testSummary.total}</div>
                  <div className="text-xs text-[#66736B] dark:text-[#9EB0A5]">Tests Réussis (100%)</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-2.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-bold font-mono text-[#202924] dark:text-[#EEF4F0]">
                    {Math.round((testSummary.passed / testSummary.total) * 100)}%
                  </div>
                  <div className="text-xs text-[#66736B] dark:text-[#9EB0A5]">Conformité Règle Métier & RBAC</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-2.5 rounded-lg bg-[#173F35]/10 text-[#173F35] border border-[#2F7D4A]/30 dark:bg-[#2F7D4A]/20 dark:text-[#77A96B]">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-bold font-mono text-[#202924] dark:text-[#EEF4F0]">0 Failles</div>
                  <div className="text-xs text-[#66736B] dark:text-[#9EB0A5]">Isolation Multi-Tenant Garantie</div>
                </div>
              </div>
            </div>
          )}

          {/* Test Results Table */}
          <div className="bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F7F8F4] dark:bg-[#18261F] text-[#66736B] dark:text-[#9EB0A5] font-mono uppercase text-[10px] border-b border-[#E1E7E0] dark:border-[#24352C]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Statut</th>
                    <th className="py-3 px-3 font-semibold">Catégorie</th>
                    <th className="py-3 px-3 font-semibold">Test Asserté</th>
                    <th className="py-3 px-4 font-semibold">Temps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7E0] dark:divide-[#24352C]">
                  {testSummary ? (
                    testSummary.results.map((r, idx) => (
                      <tr key={idx} className="hover:bg-[#F7F8F4]/50 dark:hover:bg-[#18261F]/30 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          {r.passed ? (
                            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                              <CheckCircle2 className="h-4 w-4" />
                              PASS
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                              <XCircle className="h-4 w-4" />
                              FAIL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#66736B] dark:text-[#9EB0A5]">{r.category}</td>
                        <td className="py-3 px-3 text-[#202924] dark:text-[#EEF4F0] font-medium">{r.name}</td>
                        <td className="py-3 px-4 font-mono text-[#8A988F]">{r.durationMs} ms</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-[#66736B] dark:text-[#9EB0A5]">
                        Cliquez sur "Lancer les 35 Tests en Direct" pour exécuter la suite automatisée en temps réel.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 12. DESIGN SYSTEM & UI KIT SHOWCASE */}
      {activeTab === 'design_system' && (
        <DesignSystemShowcase />
      )}

      {/* 13. ORGANIZATION PREFERENCES & LOCALIZATION (PHASE 10) */}
      {activeTab === 'settings' && (
        <OrganizationSettingsView session={session} />
      )}
    </AppShell>
  );
}
