import React, { useState, useEffect } from 'react';
import { Search, Calendar, Sprout, Building2, Users, ShoppingCart, Warehouse, DollarSign, Layers, CheckCircle2, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onAction?: (actionId: string) => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    { id: 'overview', title: 'Dashboard & Vue d\'Ensemble', group: 'Navigation', icon: <Layers className="w-4 h-4 text-[#2F7D4A]" />, tab: 'overview' },
    { id: 'master_calendar', title: 'Notre Calendrier Maître (Gantt & Backward Planning)', group: 'Navigation', icon: <Calendar className="w-4 h-4 text-[#77A96B]" />, tab: 'master_calendar' },
    { id: 'calendar', title: 'Calendrier Normal & Tâches Quotidiennes', group: 'Navigation', icon: <Calendar className="w-4 h-4 text-sky-500" />, tab: 'calendar' },
    { id: 'agricultural', title: 'Cœur Agricole & Campagnes de Production', group: 'Navigation', icon: <Sprout className="w-4 h-4 text-[#2F7D4A]" />, tab: 'agricultural' },
    { id: 'farms', title: 'Exploitations & Parcelles (Kindia / Fouta)', group: 'Navigation', icon: <Building2 className="w-4 h-4 text-amber-500" />, tab: 'farms' },
    { id: 'commercial', title: 'Commercial: Acheteurs B2B & Commandes', group: 'Navigation', icon: <ShoppingCart className="w-4 h-4 text-emerald-600" />, tab: 'commercial' },
    { id: 'operations', title: 'Opérations: Usinage, Stocks & Traçabilité', group: 'Navigation', icon: <Warehouse className="w-4 h-4 text-indigo-500" />, tab: 'operations' },
    { id: 'finance', title: 'Finance: Budgets, Coûts & Marges', group: 'Navigation', icon: <DollarSign className="w-4 h-4 text-emerald-500" />, tab: 'finance' },
    { id: 'team', title: 'Équipes & Rôles (RBAC)', group: 'Navigation', icon: <Users className="w-4 h-4 text-slate-500" />, tab: 'team' },
    { id: 'design_system', title: 'Design System & Guide des Composants', group: 'Outils', icon: <Layers className="w-4 h-4 text-purple-500" />, tab: 'design_system' },
    { id: 'tests', title: 'Banc d\'Essai Automatisé (35 Tests)', group: 'Outils', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, tab: 'tests' },
  ];

  const filtered = query.trim() === ''
    ? items
    : items.filter(it => it.title.toLowerCase().includes(query.toLowerCase()) || it.group.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-[#173F35]/40 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-white dark:bg-[#14201A] rounded-2xl border border-[#E1E7E0] dark:border-[#283D33] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center px-4 border-b border-[#E1E7E0] dark:border-[#24352C] bg-[#F7F8F4] dark:bg-[#18261F]">
          <Search className="w-5 h-5 text-[#66736B] dark:text-[#9EB0A5] mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une campagne, un acheteur, un module... (ou Échap)"
            autoFocus
            className="w-full py-4 text-sm bg-transparent border-0 focus:outline-none text-[#202924] dark:text-[#EEF4F0] placeholder-[#8A988F]"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#E1E7E0] dark:bg-[#283D33] text-[#66736B] dark:text-[#9EB0A5]">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#66736B] dark:text-[#9EB0A5]">
              Aucun résultat pour "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.tab);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-left text-xs sm:text-sm text-[#202924] dark:text-[#EEF4F0] hover:bg-[#F0F4EE] dark:hover:bg-[#1B2B23] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-[#F7F8F4] dark:bg-[#18261F] border border-[#E1E7E0] dark:border-[#283D33]">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-medium text-[#202924] dark:text-[#EEF4F0]">{item.title}</div>
                      <div className="text-[10px] text-[#66736B] dark:text-[#9EB0A5]">{item.group}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8A988F] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
