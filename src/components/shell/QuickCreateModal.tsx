import React from 'react';
import { Modal } from '../ui/Modal.tsx';
import { Sprout, Calendar, Package, Building2, ShoppingCart, Users, ArrowRight } from 'lucide-react';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
}

export function QuickCreateModal({ isOpen, onClose, onSelectAction }: QuickCreateModalProps) {
  const actions = [
    {
      id: 'create_campaign',
      title: 'Créer une Campagne de Production',
      desc: 'Planifier une nouvelle culture, variété, parcelle et calendrier prévisionnel.',
      icon: <Sprout className="w-5 h-5 text-[#2F7D4A]" />,
      badge: 'Cœur Agricole'
    },
    {
      id: 'create_calendar_event',
      title: 'Ajouter un Événement ou Tâche',
      desc: 'Fixer une intervention terrain, réunion d\'équipe ou maintenance matériel.',
      icon: <Calendar className="w-5 h-5 text-sky-600" />,
      badge: 'Calendrier Normal'
    },
    {
      id: 'record_harvest',
      title: 'Enregistrer une Récolte Partielle',
      desc: 'Saisir les rendements réels, pesées, lot et contrôle qualité après cueillette.',
      icon: <Package className="w-5 h-5 text-amber-600" />,
      badge: 'Traçabilité'
    },
    {
      id: 'create_plot',
      title: 'Ajouter une Parcelle Agricole',
      desc: 'Définir la superficie, type de sol, coordonnées GPS et accès à l\'eau.',
      icon: <Building2 className="w-5 h-5 text-[#173F35] dark:text-[#77A96B]" />,
      badge: 'Foncier'
    },
    {
      id: 'create_order',
      title: 'Saisir une Commande Acheteur',
      desc: 'Allouer des volumes de production engagés vers des acheteurs ou exportateurs.',
      icon: <ShoppingCart className="w-5 h-5 text-emerald-600" />,
      badge: 'Commercial'
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Création Rapide / Quick Actions"
      subtitle="Sélectionnez une action opérationnelle à initialiser immédiatement"
      maxWidth="lg"
    >
      <div className="grid grid-cols-1 gap-2.5">
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={() => {
              onSelectAction(act.id);
              onClose();
            }}
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#E1E7E0] dark:border-[#24352C] bg-white dark:bg-[#1B2B23] hover:border-[#2F7D4A] dark:hover:border-[#77A96B] hover:shadow-xs transition-all text-left group"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-[#F0F4EE] dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#283D33] flex-shrink-0 group-hover:scale-105 transition-transform">
                {act.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#202924] dark:text-[#EEF4F0]">
                    {act.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F0F4EE] dark:bg-[#14201A] text-[#66736B] dark:text-[#9EB0A5] border border-[#E1E7E0] dark:border-[#283D33]">
                    {act.badge}
                  </span>
                </div>
                <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
                  {act.desc}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8A988F] group-hover:text-[#2F7D4A] dark:group-hover:text-[#77A96B] group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </Modal>
  );
}
