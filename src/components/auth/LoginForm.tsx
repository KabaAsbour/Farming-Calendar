import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { PasswordInput } from './PasswordInput.tsx';
import { FormError } from './FormError.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';
import { ForgotPasswordModal } from './ForgotPasswordModal.tsx';
import { RegisterModal } from './RegisterModal.tsx';
import { AuthenticationFooter } from './AuthenticationFooter.tsx';
import { AuthSession } from '../../types/organization.ts';

interface LoginFormProps {
  onSuccess: (session: AuthSession) => void;
  className?: string;
  initialError?: string;
}

export function LoginForm({ onSuccess, className = '', initialError = '' }: LoginFormProps) {
  const { t, i18n } = useTranslation();

  // Clean state: NO hardcoded credentials in the input fields by default
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Validation & UI states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState(
    initialError && !initialError.includes('<') && !initialError.includes('doctype') && !initialError.includes('JSON')
      ? initialError
      : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    if (!email.trim()) {
      setEmailError(t('validation.required', 'This field is required.'));
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(t('auth.invalidEmail', 'Invalid email address.'));
      isValid = false;
    }

    if (!password) {
      setPasswordError(t('validation.required', 'This field is required.'));
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError(t('auth.passwordRequirements', 'At least 8 characters required.'));
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError('');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          i18n.language.startsWith('en')
            ? 'The authentication service is temporarily unavailable. Please retry in a few moments.'
            : 'Le service d\'authentification est momentanément indisponible. Veuillez réessayer dans quelques instants.'
        );
      }

      let json: any;
      try {
        json = await response.json();
      } catch {
        throw new Error(
          i18n.language.startsWith('en')
            ? 'Invalid response from authentication server. Please try again.'
            : 'Réponse inattendue du serveur d\'authentification. Veuillez réessayer.'
        );
      }

      if (!response.ok || !json.success) {
        const errorMsg = json.error?.message;
        if (errorMsg === 'Invalid email or password' || errorMsg?.includes('LOGIN_FAILED')) {
          throw new Error(
            i18n.language.startsWith('en')
              ? 'Invalid email or password. If you do not have an account yet, please click "Register your agribusiness" below.'
              : 'Adresse e-mail ou mot de passe invalide. Si vous n\'avez pas encore de compte, veuillez cliquer sur « Créer une organisation » ci-dessous.'
          );
        }
        throw new Error(
          errorMsg ||
            (i18n.language.startsWith('en')
              ? 'Invalid email or password. Please verify your credentials.'
              : 'Adresse e-mail ou mot de passe invalide. Veuillez vérifier vos identifiants.')
        );
      }

      // If "Remember me" is checked, we can store email (NEVER password)
      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('farming_calendar_remembered_email', email.trim());
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('farming_calendar_remembered_email');
      }

      onSuccess(json.data);
    } catch (err: any) {
      let rawMsg = String(err?.message || '');
      // Never expose raw JSON parse / HTML doctype syntax errors to the user
      if (rawMsg.includes('<') || rawMsg.includes('doctype') || rawMsg.includes('not valid JSON') || rawMsg.includes('SyntaxError')) {
        rawMsg = i18n.language.startsWith('en')
          ? 'Unable to connect to the authentication service. Please check your network connection and try again.'
          : 'Impossible de joindre le serveur d\'authentification. Veuillez vérifier votre connexion et réessayer.';
      }
      setGeneralError(rawMsg || (i18n.language.startsWith('en') ? 'Authentication error' : 'Erreur d\'authentification'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto flex flex-col justify-between h-full min-h-[580px] p-6 sm:p-10 ${className}`}>
      {/* Top Bar with Language Selector */}
      <div className="flex items-center justify-between pb-6">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#858B65]">
          FARMING CALENDAR SAAS
        </span>
        <LanguageSelector variant="minimal" />
      </div>

      {/* Main Login Form Container */}
      <div className="space-y-6 my-auto">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202924] font-sans">
            {t('auth.welcomeBack', 'Welcome Back')}
          </h2>
          <p className="text-sm text-[#66736B] leading-relaxed">
            {t(
              'auth.signInSubtitle',
              'Sign in to continue managing your agricultural business.'
            )}
          </p>
        </div>

        {generalError && (
          <FormError message={generalError} onDismiss={() => setGeneralError('')} />
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email Address */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-[#202924] uppercase tracking-wider font-sans"
            >
              {t('auth.emailLabel', 'Email address')}
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 pointer-events-none text-[#858B65]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder={t('auth.emailPlaceholder', 'name@agribusiness.com')}
                disabled={isSubmitting}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-[#202924] bg-white transition-all outline-hidden placeholder:text-[#66736B]/50 ${
                  emailError
                    ? 'border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                    : 'border-[#E1E7E0] hover:border-[#858B65]/60 focus:border-[#2F7D4A] focus:ring-2 focus:ring-[#2F7D4A]/15 focus:shadow-xs'
                }`}
              />
            </div>
            {emailError && (
              <p className="text-xs text-rose-600 font-medium animate-in fade-in duration-150">
                {emailError}
              </p>
            )}
          </div>

          {/* Password with Show/Hide Toggle */}
          <PasswordInput
            id="login-password"
            label={t('auth.passwordLabel', 'Password')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
            error={passwordError}
            disabled={isSubmitting}
            autoComplete="current-password"
          />

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[#66736B] hover:text-[#202924]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-sm border-[#CDD6CC] text-[#173F35] focus:ring-[#2F7D4A] accent-[#173F35]"
              />
              <span className="font-medium">{t('auth.rememberMe', 'Remember me')}</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-[#2F7D4A] hover:text-[#173F35] font-semibold hover:underline transition-colors focus:outline-hidden"
            >
              {t('auth.forgotPassword', 'Forgot password?')}
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-6 rounded-xl bg-[#173F35] hover:bg-[#2F7D4A] text-[#F7F5ED] font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-[#C6A04A] focus:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#E4C979]" />
                <span>{t('auth.signingIn', 'Signing in...')}</span>
              </>
            ) : (
              <>
                <span>{t('auth.signInButton', 'Sign In')}</span>
                <ArrowRight className="w-4 h-4 text-[#E4C979] group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Account Registration Link */}
        <div className="text-center pt-2 text-xs text-[#66736B]">
          <span>{t('auth.dontHaveAccount', "Don't have an account?")} </span>
          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="text-[#2F7D4A] hover:text-[#173F35] font-bold hover:underline transition-colors focus:outline-hidden"
          >
            {t('auth.registerAgribusiness', 'Register your agribusiness')}
          </button>
        </div>

        </div>

      {/* Discreet Footer */}
      <AuthenticationFooter />

      {/* Modals */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={(newSession) => {
          onSuccess(newSession);
        }}
      />
    </div>
  );
}
