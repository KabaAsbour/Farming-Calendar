import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalModal } from './LegalModal.tsx';

interface AuthenticationFooterProps {
  className?: string;
}

export function AuthenticationFooter({ className = '' }: AuthenticationFooterProps) {
  const { t } = useTranslation();
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <>
      <footer
        className={`pt-6 pb-4 text-center text-xs text-[#66736B] border-t border-[#E1E7E0]/60 ${className}`}
        role="contentinfo"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11.5px]">
          <span>© {new Date().getFullYear()} FARMING CALENDAR</span>
          <span className="text-[#CDD6CC] select-none" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActiveModal('privacy')}
            className="hover:text-[#173F35] hover:underline focus:outline-hidden focus:text-[#173F35] transition-colors"
          >
            {t('auth.privacyPolicy', 'Privacy Policy')}
          </button>
          <span className="text-[#CDD6CC] select-none" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActiveModal('terms')}
            className="hover:text-[#173F35] hover:underline focus:outline-hidden focus:text-[#173F35] transition-colors"
          >
            {t('auth.termsOfService', 'Terms of Service')}
          </button>
        </div>
      </footer>

      <LegalModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </>
  );
}
