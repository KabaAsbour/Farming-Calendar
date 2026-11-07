import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('farming_calendar_lang');
    if (saved === 'fr' || saved === 'en') return saved;
  }
  return 'fr'; // Default baseline for Guinea / West Africa
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    returnNull: false,
    returnEmptyString: false,
    parseMissingKeyHandler: (key: string) => {
      // Graceful fallback: clean up key code if missing
      const parts = key.split('.');
      const last = parts[parts.length - 1];
      return last.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
    }
  });

// Automatically persist language selection on change
i18n.on('languageChanged', (lng: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('farming_calendar_lang', lng);
  }
});

export default i18n;
