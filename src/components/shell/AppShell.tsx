import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  X,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Globe2,
  LogOut,
  ChevronDown,
  Layers,
  Calendar,
  Sprout,
  Building2,
  ShoppingCart,
  Warehouse,
  DollarSign,
  Users,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ChevronRight,
  TrendingUp,
  Sliders,
  Sparkles,
  Truck,
  Settings
} from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo.tsx';
import { CommandPalette } from './CommandPalette.tsx';
import { QuickCreateModal } from './QuickCreateModal.tsx';
import { NotificationDrawer, NotificationItem } from './NotificationDrawer.tsx';
import { AuthSession } from '../../types/organization.ts';

export type AppTab = 
  | 'overview'
  | 'calendar'
  | 'master_calendar'
  | 'agricultural'
  | 'farms'
  | 'commercial'
  | 'operations'
  | 'logistics'
  | 'finance'
  | 'team'
  | 'audit'
  | 'tests'
  | 'design_system'
  | 'settings';

interface AppShellProps {
  session: AuthSession;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onLogout: () => void;
  onSwitchDevAccount?: (email: string) => void;
  children: React.ReactNode;
}

export function AppShell({
  session,
  activeTab,
  onSelectTab,
  onLogout,
  onSwitchDevAccount,
  children
}: AppShellProps) {
  const { t, i18n } = useTranslation();

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Shell Modals & Drawers
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Dark Mode Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Language toggle with persistence
  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('fr') ? 'en' : 'fr';
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('farming_calendar_lang', nextLang);
    }
  };

  const isEn = i18n.language.startsWith('en');
  const [readNotifs, setReadNotifs] = useState<Record<string, boolean>>({ 'n-3': true });

  // Operational Notifications with real-time bilingual support
  const notifications: NotificationItem[] = [
    {
      id: 'n-1',
      type: 'warning',
      title: isEn ? 'Field operation overdue' : 'Opération culturale en retard',
      message: isEn
        ? 'Weeding on plot K-02 (Cassava Bonoua) is 2 days past scheduled execution date.'
        : 'Le désherbage sur la parcelle K-02 (Manioc Bonoua) dépasse sa date prévue de 2 jours.',
      timestamp: isEn ? '2h ago' : 'Il y a 2h',
      targetTab: 'agricultural',
      read: !!readNotifs['n-1']
    },
    {
      id: 'n-2',
      type: 'urgent',
      title: isEn ? 'Critical input low stock alert' : 'Niveau bas sur intrant stratégique',
      message: isEn
        ? 'NPK 15-15-15 fertilizer stock at 150 kg in Kindia warehouse. Reorder required within 48h.'
        : 'Stock d\'engrais NPK 15-15-15 à 150 kg au magasin de Kindia. Réapprovisionnement requis sous 48h.',
      timestamp: isEn ? '4h ago' : 'Il y a 4h',
      targetTab: 'operations',
      read: !!readNotifs['n-2']
    },
    {
      id: 'n-3',
      type: 'success',
      title: isEn ? 'Harvest pass weight validated' : 'Pesée de récolte enregistrée',
      message: isEn
        ? 'Harvest pass of 5.2 metric tons Bird\'s Eye Pepper validated at Dalaba with quality certificate.'
        : 'Cueillette de 5.2 tonnes de Piment Bird\'s Eye validée à Dalaba avec certificat conforme.',
      timestamp: isEn ? 'Yesterday' : 'Hier',
      targetTab: 'master_calendar',
      read: !!readNotifs['n-3']
    }
  ];

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  const markAllNotifsRead = () => {
    setReadNotifs({ 'n-1': true, 'n-2': true, 'n-3': true });
  };

  // Nav Groups Structure with localized labels
  const navGroups = [
    {
      label: isEn ? 'WORKSPACE' : 'ESPACE DE TRAVAIL',
      items: [
        { id: 'overview' as AppTab, title: t('nav.overview', 'Tableau de Bord Exécutif'), icon: <Layers className="w-4 h-4" /> },
        { id: 'master_calendar' as AppTab, title: t('nav.master_calendar', 'Calendrier Maître'), icon: <Sparkles className="w-4 h-4 text-amber-500" />, highlight: true },
        { id: 'calendar' as AppTab, title: t('nav.calendar', 'Calendrier Normal'), icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    {
      label: isEn ? 'AGRICULTURE' : 'AGRICULTURE',
      items: [
        { id: 'agricultural' as AppTab, title: t('nav.agricultural', 'Cœur Agricole & Campagnes'), icon: <Sprout className="w-4 h-4" /> },
        { id: 'farms' as AppTab, title: t('nav.farms', 'Exploitations & Parcelles'), icon: <Building2 className="w-4 h-4" /> },
      ]
    },
    {
      label: isEn ? 'COMMERCIAL & OPERATIONS' : 'COMMERCIAL & OPÉRATIONS',
      items: [
        { id: 'commercial' as AppTab, title: t('nav.commercial', 'Commercial & Acheteurs B2B'), icon: <ShoppingCart className="w-4 h-4" /> },
        { id: 'operations' as AppTab, title: t('nav.operations', 'Stocks, Usinage & Qualité'), icon: <Warehouse className="w-4 h-4" /> },
        { id: 'logistics' as AppTab, title: t('nav.logistics', 'Logistique & Export'), icon: <Truck className="w-4 h-4" /> },
      ]
    },
    {
      label: isEn ? 'FINANCE & ANALYTICS' : 'FINANCE & ANALYTIQUE',
      items: [
        { id: 'finance' as AppTab, title: t('nav.finance', 'Finances, Coûts & Marges'), icon: <DollarSign className="w-4 h-4" /> },
      ]
    },
    {
      label: isEn ? 'MANAGEMENT & TOOLS' : 'GESTION & OUTILS',
      items: [
        { id: 'settings' as AppTab, title: t('nav.settings', 'Préférences Organisation'), icon: <Settings className="w-4 h-4 text-emerald-600" /> },
        { id: 'team' as AppTab, title: t('nav.team', 'Équipe & Permissions (RBAC)'), icon: <Users className="w-4 h-4" /> },
        { id: 'audit' as AppTab, title: t('nav.audit', 'Piste d\'Audit Sécurité'), icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'design_system' as AppTab, title: t('nav.design_system', 'Design System & UI Kit'), icon: <Sliders className="w-4 h-4 text-purple-500" /> },
        { id: 'tests' as AppTab, title: t('nav.tests', 'Banc d\'Essai Automatisé (89)'), icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
      ]
    }
  ];

  return (
    <div className="min-h-screen flex bg-[#F7F8F4] dark:bg-[#0E1612] text-[#202924] dark:text-[#EEF4F0] font-sans antialiased">
      {/* 1. LEFT COLLAPSIBLE SIDEBAR (DESKTOP) */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 border-r border-[#E1E7E0] dark:border-[#24352C] bg-white dark:bg-[#14201A] transition-all duration-200 z-30 select-none ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
          <div className="overflow-hidden">
            <BrandLogo compact={sidebarCollapsed} />
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded-md text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE] dark:text-[#9EB0A5] dark:hover:text-[#EEF4F0] dark:hover:bg-[#1B2B23]"
              title="Réduire la barre latérale"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Group Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {sidebarCollapsed ? (
            // Collapsed Icon View
            <div className="space-y-2">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full p-2.5 rounded-lg flex justify-center text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE] dark:text-[#9EB0A5] dark:hover:bg-[#1B2B23]"
                title="Développer la barre latérale"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {navGroups.flatMap(g => g.items).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={item.title}
                  className={`w-full p-2.5 rounded-lg flex justify-center transition-colors ${
                    activeTab === item.id
                      ? 'bg-[#173F35] text-white shadow-xs'
                      : 'text-[#66736B] dark:text-[#9EB0A5] hover:bg-[#F0F4EE] dark:hover:bg-[#1B2B23] hover:text-[#202924]'
                  }`}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          ) : (
            // Expanded Structured View
            navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <span className="px-3 text-[10px] font-mono font-bold tracking-wider text-[#8A988F] uppercase block mb-1">
                  {group.label}
                </span>

                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                      activeTab === item.id
                        ? 'bg-[#173F35] text-white shadow-xs'
                        : 'text-[#66736B] dark:text-[#9EB0A5] hover:bg-[#F0F4EE] dark:hover:bg-[#1B2B23] hover:text-[#202924] dark:hover:text-[#EEF4F0]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={activeTab === item.id ? 'text-[#77A96B]' : ''}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>
                    {item.highlight && activeTab !== item.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Tenant Isolation & User Footer */}
        <div className="p-3 border-t border-[#E1E7E0] dark:border-[#24352C] bg-[#F7F8F4] dark:bg-[#18261F]/60">
          {!sidebarCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#66736B] dark:text-[#9EB0A5]">
                <span className="truncate">{session.organization.name}</span>
                <span className="font-bold text-[#2F7D4A] dark:text-[#77A96B]">
                  {session.organization.countryCode}
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#202924] dark:text-[#EEF4F0] truncate">
                {session.user.fullName}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-[#E1E7E0] dark:bg-[#283D33] text-[#66736B] dark:text-[#9EB0A5]">
                  {session.user.role}
                </span>
                <button
                  onClick={onLogout}
                  className="text-[10px] text-rose-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={onLogout}
                title="Déconnexion"
                className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#173F35]/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 bg-white dark:bg-[#14201A] border-r border-[#E1E7E0] dark:border-[#24352C] flex flex-col h-full shadow-2xl">
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
              <BrandLogo />
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-[#66736B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {navGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <span className="px-2 text-[10px] font-mono font-bold tracking-wider text-[#8A988F] uppercase block mb-1">
                    {group.label}
                  </span>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                        activeTab === item.id
                          ? 'bg-[#173F35] text-white'
                          : 'text-[#66736B] dark:text-[#9EB0A5]'
                      }`}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP ENTERPRISE NAVIGATION BAR */}
        <header className="h-16 flex-shrink-0 bg-white dark:bg-[#14201A] border-b border-[#E1E7E0] dark:border-[#24352C] px-4 sm:px-6 flex items-center justify-between gap-4 z-20">
          {/* Left: Mobile hamburger & Organization selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE]"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#173F35] dark:text-[#77A96B] font-mono hidden sm:inline-block">
                TENANT:
              </span>
              <span className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] px-2 py-1 rounded-md bg-[#F0F4EE] dark:bg-[#1B2B23] border border-[#E1E7E0] dark:border-[#283D33] truncate max-w-xs">
                {session.organization.name}
              </span>
            </div>
          </div>

          {/* Center: Global Search shortcut button */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs bg-[#F7F8F4] dark:bg-[#18261F] border border-[#CDD6CC] dark:border-[#283D33] text-[#66736B] dark:text-[#9EB0A5] hover:border-[#2F7D4A] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Rechercher campagnes, cultures, acheteurs...</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#283D33]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Actions, Language, Theme, Notifications & User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Create Button */}
            <button
              onClick={() => setQuickCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2F7D4A] hover:bg-[#276a3e] text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nouveau...</span>
            </button>

            {/* Notification Center Bell */}
            <button
              onClick={() => setNotificationOpen(true)}
              className="relative p-2 rounded-lg text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE] dark:text-[#9EB0A5] dark:hover:text-[#EEF4F0] dark:hover:bg-[#1B2B23] transition-colors"
              title="Alertes & Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 rounded-md text-xs font-mono font-semibold text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE] dark:text-[#9EB0A5] dark:hover:text-[#EEF4F0] dark:hover:bg-[#1B2B23] border border-[#E1E7E0] dark:border-[#283D33] flex items-center gap-1"
              title="Changer de langue / Switch Language"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>{i18n.language.startsWith('fr') ? 'FR' : 'EN'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE] dark:text-[#9EB0A5] dark:hover:text-[#EEF4F0] dark:hover:bg-[#1B2B23] transition-colors"
              title={darkMode ? 'Basculer en mode clair' : 'Basculer en mode sombre'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile & Role Pill */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#F0F4EE] dark:hover:bg-[#1B2B23] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#173F35] text-white flex items-center justify-center font-bold text-xs">
                  {session.user.fullName.charAt(0)}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] leading-none">
                    {session.user.fullName.split(' ')[0]}
                  </span>
                  <span className="text-[9.5px] font-mono text-[#8A988F] mt-0.5">
                    {session.user.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8A988F] hidden md:block" />
              </button>

              {/* Dev Accounts Switcher Popover */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#14201A] rounded-xl border border-[#E1E7E0] dark:border-[#24352C] shadow-2xl p-2 z-50 text-xs">
                  <div className="p-2 border-b border-[#E1E7E0] dark:border-[#24352C] mb-1">
                    <div className="font-bold text-[#202924] dark:text-[#EEF4F0]">{session.user.fullName}</div>
                    <div className="text-[10px] text-[#8A988F] truncate">{session.user.email}</div>
                  </div>

                  <div className="pt-2 border-t border-[#E1E7E0] dark:border-[#24352C] mt-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CommandPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab) => onSelectTab(tab as AppTab)}
      />

      <QuickCreateModal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onSelectAction={(actionId) => {
          if (actionId === 'create_campaign') onSelectTab('agricultural');
          else if (actionId === 'create_calendar_event') onSelectTab('calendar');
          else if (actionId === 'record_harvest') onSelectTab('agricultural');
          else if (actionId === 'create_plot') onSelectTab('farms');
          else if (actionId === 'create_order') onSelectTab('commercial');
        }}
      />

      <NotificationDrawer
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={markAllNotifsRead}
        onNavigate={(tab) => onSelectTab(tab as AppTab)}
      />
    </div>
  );
}
