import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';

interface LegalModalProps {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  if (!type) return null;

  return (
    <Modal
      isOpen={Boolean(type)}
      onClose={onClose}
      title={
        type === 'privacy'
          ? t('auth.privacyModalTitle', 'FARMING CALENDAR — Privacy & Data Protection')
          : t('auth.termsModalTitle', 'FARMING CALENDAR — Terms of Enterprise Service')
      }
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs text-[#202924] max-h-[60vh] overflow-y-auto pr-2 leading-relaxed">
        {type === 'privacy' ? (
          <>
            <div className="flex items-center gap-2 p-3 bg-[#F7F5ED] rounded-lg border border-[#E1E7E0]">
              <ShieldCheck className="w-5 h-5 text-[#2F7D4A] shrink-0" />
              <p className="font-medium text-[#173F35]">
                {isEn
                  ? 'Guaranteed agricultural data confidentiality, tenancy isolation, and sovereign farm mapping under OHADA and international agribusiness privacy standards.'
                  : 'Confidentialité garantie des données agronomiques, isolation stricte multi-tenants et souveraineté foncière selon les standards OHADA et RGPD.'}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[#173F35] uppercase text-[11px] font-mono">
                {isEn ? '1. Agribusiness Data Sovereignty' : '1. Souveraineté des Données Agricoles'}
              </h4>
              <p className="text-[#66736B]">
                {isEn
                  ? 'All crop itineraries, yield estimates, plot coordinates, financial books, and B2B contracts remain the exclusive property of your organization. No cross-tenant data pooling or unconsented algorithmic trading is permitted.'
                  : 'Tous les itinéraires techniques, estimations de rendement, parcelles géoréférencées, écritures comptables et contrats acheteurs demeurent la propriété exclusive de votre entreprise agricole.'}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[#173F35] uppercase text-[11px] font-mono">
                {isEn ? '2. Cryptographic Security & Audit Logs' : '2. Sécurité Cryptographique & Piste d Audit'}
              </h4>
              <p className="text-[#66736B]">
                {isEn
                  ? 'Authentication tokens use signed HMAC-SHA256 signatures with automated session expiration. All operational transitions (quarantine release, supply reservations, bill of lading dispatches) generate immutable audit logs with timestamp, role, and IP address.'
                  : 'Les jetons d identification utilisent des signatures HMAC-SHA256 avec expiration contrôlée. Toutes les opérations de quarantaine, réservations et expéditions génèrent un journal d audit infalsifiable.'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 bg-[#F7F5ED] rounded-lg border border-[#E1E7E0]">
              <FileText className="w-5 h-5 text-[#C6A04A] shrink-0" />
              <p className="font-medium text-[#173F35]">
                {isEn
                  ? 'Enterprise Terms of Service governing multi-farm operations, export compliance, and commercial supply reservations.'
                  : 'Conditions Générales d Utilisation régissant la planification agricole, les réservations commerciales et les flux logistiques export.'}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[#173F35] uppercase text-[11px] font-mono">
                {isEn ? '1. Agronomic Liability & Forward Planning' : '1. Responsabilité Agronomique & Rétroplanning'}
              </h4>
              <p className="text-[#66736B]">
                {isEn
                  ? 'The platform calculates backward production schedules and yield forecasts based on standard GDD (Growing Degree Days), historical crop itineraries, and meteorological models. Users retain responsibility for verifying localized soil, irrigation, and field phytosanitary interventions.'
                  : 'La plateforme modélise le rétroplanning et les prévisions de récolte sur la base des itinéraires techniques et des données climatiques. L exploitant demeure responsable des décisions agronomiques in situ.'}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[#173F35] uppercase text-[11px] font-mono">
                {isEn ? '2. Quality Assurance & Quarantine Enforcement' : '2. Assurance Qualité & Respect de la Quarantaine'}
              </h4>
              <p className="text-[#66736B]">
                {isEn
                  ? 'Any batch flagged as REJECTED during phytosanitary or chemical residue inspection is automatically blocked by logistics dispatch controls to guarantee compliance with international food safety standards (GlobalG.A.P., HACCP).'
                  : 'Tout lot déclaré REJETÉ lors des analyses phytosanitaires est automatiquement bloqué à l expédition logistique pour satisfaire aux exigences GlobalG.A.P. et HACCP.'}
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end pt-3">
          <Button variant="forest" size="sm" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
