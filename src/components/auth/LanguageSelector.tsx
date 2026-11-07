import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'light' | 'dark' | 'minimal';
}

export function LanguageSelector({ className = '', variant = 'minimal' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('en') ? 'en' : 'fr';

  const setLanguage = (lang: 'fr' | 'en') => {
    i18n.changeLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('farming_calendar_lang', lang);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 p-1 rounded-lg border text-xs font-medium transition-all ${
      variant === 'dark'
        ? 'bg-[#173F35]/70 border-[#2F7D4A]/50 text-[#EEF4F0]'
        : 'bg-white/80 backdrop-blur-sm border-[#E1E7E0] text-[#202924] shadow-xs'
    } ${className}`} role="region" aria-label="Language selector">
      <Globe className={`w-3.5 h-3.5 ml-1.5 ${variant === 'dark' ? 'text-[#C6A04A]' : 'text-[#858B65]'}`} aria-hidden="true" />
      <div className="flex items-center gap-1" role="group" aria-label="Language options">
        <button
          type="button"
          onClick={() => setLanguage('fr')}
          aria-pressed={currentLang === 'fr'}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            currentLang === 'fr'
              ? 'bg-[#173F35] text-[#F7F5ED] shadow-xs'
              : 'text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE]'
          }`}
        >
          FR
        </button>
        <span className="text-[#CDD6CC] text-xs select-none">/</span>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          aria-pressed={currentLang === 'en'}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            currentLang === 'en'
              ? 'bg-[#173F35] text-[#F7F5ED] shadow-xs'
              : 'text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE]'
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
