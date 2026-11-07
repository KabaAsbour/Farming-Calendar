import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, Building2, User, Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { PasswordInput } from './PasswordInput.tsx';
import { FormError } from './FormError.tsx';
import { AuthSession } from '../../types/organization.ts';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

export function RegisterModal({ isOpen, onClose, onSuccess }: RegisterModalProps) {
  const { t, i18n } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password.trim() || !organizationName.trim()) {
      setError(t('validation.required', 'All fields are required.'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordRequirements', 'At least 8 characters required.'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          organizationName: organizationName.trim(),
          preferredLanguage: i18n.language.startsWith('en') ? 'en' : 'fr',
          countryCode: 'GN'
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          i18n.language.startsWith('en')
            ? 'The registration service is temporarily unavailable. Please retry in a moment.'
            : 'Le service d\'inscription est momentanément indisponible. Veuillez réessayer.'
        );
      }

      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error(
          i18n.language.startsWith('en')
            ? 'Invalid response from server. Please retry.'
            : 'Réponse inattendue du serveur. Veuillez réessayer.'
        );
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || (i18n.language.startsWith('en') ? 'Registration failed' : 'Échec de l\'inscription'));
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      let rawMsg = String(err?.message || '');
      if (rawMsg.includes('<') || rawMsg.includes('doctype') || rawMsg.includes('not valid JSON') || rawMsg.includes('SyntaxError')) {
        rawMsg = i18n.language.startsWith('en')
          ? 'Unable to connect to the registration service. Please check your connection and retry.'
          : 'Impossible de joindre le service d\'inscription. Veuillez vérifier votre connexion et réessayer.';
      }
      setError(rawMsg || (i18n.language.startsWith('en') ? 'Registration failed' : 'Échec de l\'inscription'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('auth.register', 'Create Account & Organization')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-[#202924]">
        <p className="text-xs text-[#66736B]">
          {i18n.language.startsWith('en')
            ? 'Register your agricultural enterprise to begin planning campaigns, tracking operations, and managing export contracts.'
            : 'Enregistrez votre entreprise agricole pour planifier vos campagnes, suivre vos opérations et piloter vos contrats export.'}
        </p>

        {error && <FormError message={error} onDismiss={() => setError('')} />}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#202924] uppercase tracking-wider font-sans">
            {t('auth.fullName', 'Full Name')}
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#858B65] absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Mamadou Bah"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E1E7E0] text-sm text-[#202924] bg-white hover:border-[#858B65]/60 focus:border-[#2F7D4A] focus:ring-2 focus:ring-[#2F7D4A]/15 outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#202924] uppercase tracking-wider font-sans">
            {t('auth.orgName', 'Organization / Cooperative Name')}
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-[#858B65] absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. Agro-Industrie de Kindia SARL"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E1E7E0] text-sm text-[#202924] bg-white hover:border-[#858B65]/60 focus:border-[#2F7D4A] focus:ring-2 focus:ring-[#2F7D4A]/15 outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#202924] uppercase tracking-wider font-sans">
            {t('auth.email', 'Email Address')}
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#858B65] absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="director@agro-kindia.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E1E7E0] text-sm text-[#202924] bg-white hover:border-[#858B65]/60 focus:border-[#2F7D4A] focus:ring-2 focus:ring-[#2F7D4A]/15 outline-hidden"
            />
          </div>
        </div>

        <PasswordInput
          label={t('auth.password', 'Password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          required
        />

        <div className="pt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="forest"
            size="sm"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{t('auth.registerButton', 'Create Organization')}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
