import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  showIcon?: boolean;
}

export function PasswordInput({
  label,
  error,
  showIcon = true,
  id = 'password-input',
  className = '',
  ...props
}: PasswordInputProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#202924] uppercase tracking-wider font-sans"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {showIcon && (
          <div className="absolute left-3.5 pointer-events-none text-[#858B65]" aria-hidden="true">
            <Lock className="w-4 h-4" />
          </div>
        )}

        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className={`w-full ${showIcon ? 'pl-10' : 'pl-3.5'} pr-11 py-2.5 rounded-xl border text-sm text-[#202924] bg-white transition-all outline-hidden placeholder:text-[#66736B]/50 ${
            error
              ? 'border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
              : 'border-[#E1E7E0] hover:border-[#858B65]/60 focus:border-[#2F7D4A] focus:ring-2 focus:ring-[#2F7D4A]/15 focus:shadow-xs'
          } ${className}`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-2 p-1.5 rounded-lg text-[#66736B] hover:text-[#173F35] hover:bg-[#F0F4EE] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#2F7D4A]/30"
          aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
          aria-pressed={showPassword}
          tabIndex={0}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-rose-600 font-medium animate-in fade-in duration-150">
          {error}
        </p>
      )}
    </div>
  );
}
