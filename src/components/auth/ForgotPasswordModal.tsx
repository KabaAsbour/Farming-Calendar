import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Mail, Phone, X, Check } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('auth.forgotModalTitle', 'Password Recovery Protocol')}
      maxWidth="md"
    >
      <div className="space-y-5 text-sm text-[#202924]">
        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#F7F5ED] border border-[#E4C979]/60">
          <ShieldAlert className="w-5 h-5 text-[#C6A04A] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-xs text-[#173F35] uppercase tracking-wider font-mono">
              {t('auth.forgotModalTitle', 'Password Recovery Protocol')}
            </h4>
            <p className="text-xs text-[#66736B] leading-relaxed">
              {t('auth.forgotModalDesc', 'For enterprise security and strict tenant isolation, self-service password resets are mediated by your Organization Administrator or the Platform Security Officer.')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#202924] font-medium leading-relaxed">
            {t('auth.forgotModalInstructions', 'Please contact your organization administrator or IT department with your registered corporate email to generate a secure reset token.')}
          </p>

          <div className="p-3.5 rounded-lg border border-[#E1E7E0] bg-white space-y-2">
            <div className="flex items-center gap-2.5 text-xs text-[#66736B]">
              <Mail className="w-4 h-4 text-[#2F7D4A]" />
              <span className="font-mono text-[11px] text-[#173F35] font-semibold">
                security@farmingcalendar.dev
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#66736B]">
              <Phone className="w-4 h-4 text-[#2F7D4A]" />
              <span className="font-mono text-[11px] text-[#173F35]">
                +224 620 00 00 00 (Support Agrobusiness Guinée & UEMOA)
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="forest"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {t('auth.closeModal', 'Close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
