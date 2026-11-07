/**
 * FARMING CALENDAR — LOCALIZATION & FORMATTING UTILITIES (PHASE 10)
 * Pure, browser-safe functions for locale-aware date, time, number, and currency formatting,
 * metric units, and localized notification templates.
 */

import { OrganizationPreferences } from '../types/organization.ts';

export type SupportedLanguage = 'fr' | 'en';
export type UnitType = 'kg' | 't' | 'ha' | 'm2' | 'unit' | 'box' | 'liter' | 'days' | 'hours';

export interface UnitDescriptor {
  code: UnitType;
  labelFr: string;
  labelEn: string;
  symbol: string;
  category: 'MASS' | 'AREA' | 'COUNT' | 'VOLUME' | 'TIME';
}

export const SUPPORTED_UNITS: Record<UnitType, UnitDescriptor> = {
  kg: { code: 'kg', labelFr: 'Kilogrammes', labelEn: 'Kilograms', symbol: 'kg', category: 'MASS' },
  t: { code: 't', labelFr: 'Tonnes métriques', labelEn: 'Metric Tons', symbol: 't', category: 'MASS' },
  ha: { code: 'ha', labelFr: 'Hectares', labelEn: 'Hectares', symbol: 'ha', category: 'AREA' },
  m2: { code: 'm2', labelFr: 'Mètres carrés', labelEn: 'Square Meters', symbol: 'm²', category: 'AREA' },
  unit: { code: 'unit', labelFr: 'Unités', labelEn: 'Units', symbol: 'u', category: 'COUNT' },
  box: { code: 'box', labelFr: 'Cartons / Caisses', labelEn: 'Cartons / Crates', symbol: 'ctn', category: 'COUNT' },
  liter: { code: 'liter', labelFr: 'Litres', labelEn: 'Liters', symbol: 'L', category: 'VOLUME' },
  days: { code: 'days', labelFr: 'Jours', labelEn: 'Days', symbol: 'j', category: 'TIME' },
  hours: { code: 'hours', labelFr: 'Heures', labelEn: 'Hours', symbol: 'h', category: 'TIME' },
};

/**
 * Default Guinea baseline configuration
 */
export function getDefaultGuineaPreferences(organizationId: string): OrganizationPreferences {
  return {
    id: `pref-${organizationId}`,
    organizationId,
    preferredLanguage: 'fr',
    preferredCurrency: 'GNF',
    preferredTimezone: 'Africa/Conakry',
    preferredUnitSystem: 'METRIC',
    numberFormatLocale: 'fr-GN',
    dateFormat: 'DD/MM/YYYY',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Formats a monetary amount into a clean, locale-aware string.
 * GNF has 0 decimal places. USD, EUR, XOF follow standard international formatting.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'GNF',
  locale: SupportedLanguage | string = 'fr'
): string {
  const lang = locale.startsWith('en') ? 'en' : 'fr';
  const numLocale = lang === 'en' ? 'en-US' : 'fr-GN';

  if (currency === 'GNF') {
    // GNF uses zero decimal places
    const formattedNum = Math.round(amount).toLocaleString(numLocale);
    return `${formattedNum} GNF`;
  }

  if (currency === 'XOF') {
    const formattedNum = Math.round(amount).toLocaleString(numLocale);
    return lang === 'fr' ? `${formattedNum} FCFA` : `${formattedNum} XOF`;
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat(numLocale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  if (currency === 'EUR') {
    return new Intl.NumberFormat(numLocale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  return `${amount.toLocaleString(numLocale)} ${currency}`;
}

/**
 * Formats a large amount in compact humanized form (e.g. 1.5 M GNF or 1,5 M GNF)
 */
export function formatCompactCurrency(
  amount: number,
  currency: string = 'GNF',
  locale: SupportedLanguage | string = 'fr'
): string {
  const lang = locale.startsWith('en') ? 'en' : 'fr';
  const numLocale = lang === 'en' ? 'en-US' : 'fr-FR';

  if (Math.abs(amount) >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    const formatted = billions.toLocaleString(numLocale, { maximumFractionDigits: 2 });
    return `${formatted} ${lang === 'fr' ? 'Mrd' : 'B'} ${currency}`;
  }

  if (Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions.toLocaleString(numLocale, { maximumFractionDigits: 1 });
    return `${formatted} M ${currency}`;
  }

  return formatCurrency(amount, currency, locale);
}

/**
 * Formats a number with locale-appropriate decimal and thousand separators
 */
export function formatNumber(
  value: number,
  decimals: number = 0,
  locale: SupportedLanguage | string = 'fr'
): string {
  const lang = locale.startsWith('en') ? 'en' : 'fr';
  const numLocale = lang === 'en' ? 'en-US' : 'fr-FR';
  return value.toLocaleString(numLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formats a date into a localized string
 */
export function formatDate(
  dateInput: string | Date | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: SupportedLanguage | string = 'fr',
  timezone: string = 'Africa/Conakry'
): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const lang = locale.startsWith('en') ? 'en-US' : 'fr-FR';

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone },
    medium: { day: 'numeric', month: 'short', year: 'numeric', timeZone: timezone },
    long: { day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone }
  };

  return new Intl.DateTimeFormat(lang, optionsMap[format] || optionsMap.medium).format(d);
}

/**
 * Formats date and time together with timezone awareness
 */
export function formatDateTime(
  dateInput: string | Date | number,
  format: 'short' | 'medium' | 'long' = 'medium',
  locale: SupportedLanguage | string = 'fr',
  timezone: string = 'Africa/Conakry'
): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const lang = locale.startsWith('en') ? 'en-US' : 'fr-FR';

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone },
    medium: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone },
    long: { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: timezone }
  };

  return new Intl.DateTimeFormat(lang, optionsMap[format] || optionsMap.medium).format(d);
}

/**
 * Displays quantity with localized unit label (e.g. 1 500 kg or 1,500 kg)
 */
export function formatUnit(
  quantity: number,
  unit: UnitType | string,
  locale: SupportedLanguage | string = 'fr',
  includeLongLabel: boolean = false
): string {
  const lang = locale.startsWith('en') ? 'en' : 'fr';
  const numLocale = lang === 'en' ? 'en-US' : 'fr-FR';
  const formattedQty = quantity.toLocaleString(numLocale);

  const descriptor = SUPPORTED_UNITS[unit as UnitType];
  if (!descriptor) {
    return `${formattedQty} ${unit}`;
  }

  if (includeLongLabel) {
    const label = lang === 'en' ? descriptor.labelEn : descriptor.labelFr;
    return `${formattedQty} ${descriptor.symbol} (${label})`;
  }

  return `${formattedQty} ${descriptor.symbol}`;
}

/**
 * Formats a relative timestamp (e.g. "Il y a 2 heures" or "2 hours ago")
 */
export function formatRelativeTime(
  dateInput: string | Date,
  locale: SupportedLanguage | string = 'fr'
): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const lang = locale.startsWith('en') ? 'en' : 'fr';
  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);

  if (diffSec < 60) {
    return lang === 'fr' ? 'À l\'instant' : 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return lang === 'fr' ? `Il y a ${diffMin} min` : `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return lang === 'fr' ? `Il y a ${diffHours} h` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return lang === 'fr' ? 'Hier' : 'Yesterday';
  }
  if (diffDays < 30) {
    return lang === 'fr' ? `Il y a ${diffDays} j` : `${diffDays}d ago`;
  }
  return formatDate(d, 'short', locale);
}

/**
 * Generates bilingual notification and email templates for critical agribusiness events
 */
export function getNotificationTemplate(
  type: 'TASK_OVERDUE' | 'INPUT_SHORTAGE' | 'HARVEST_LOGGED' | 'SHIPMENT_DELAY' | 'QUALITY_QUARANTINE' | 'BUDGET_OVERRUN',
  params: {
    entityCode?: string;
    plotName?: string;
    cropName?: string;
    quantity?: number;
    unit?: string;
    delayHours?: number;
    destination?: string;
    costAmount?: number;
    currency?: string;
  },
  lang: SupportedLanguage = 'fr'
): { subject: string; body: string } {
  const currency = params.currency || 'GNF';

  switch (type) {
    case 'TASK_OVERDUE':
      return {
        subject: lang === 'fr' ? 'Alerte : Opération culturale en retard' : 'Alert: Field operation overdue',
        body: lang === 'fr'
          ? `L'opération prévue sur la parcelle ${params.plotName || 'non spécifiée'} accuse un retard critique. Veuillez mettre à jour le planning.`
          : `Scheduled operation on plot ${params.plotName || 'unspecified'} is critically overdue. Please update the schedule.`
      };

    case 'INPUT_SHORTAGE':
      return {
        subject: lang === 'fr' ? 'Avertissement : Niveau bas sur intrant stratégique' : 'Warning: Critical input low stock alert',
        body: lang === 'fr'
          ? `Le stock disponible pour ${params.entityCode || 'l\'intrant'} est tombé à ${formatUnit(params.quantity || 0, params.unit || 'kg', lang)}. Réapprovisionnement requis sous 48h.`
          : `Available inventory for ${params.entityCode || 'the input'} has dropped to ${formatUnit(params.quantity || 0, params.unit || 'kg', lang)}. Reorder required within 48h.`
      };

    case 'HARVEST_LOGGED':
      return {
        subject: lang === 'fr' ? 'Notification : Nouvelle passe de récolte validée' : 'Notice: New harvest pass validated',
        body: lang === 'fr'
          ? `Une récolte de ${formatUnit(params.quantity || 0, params.unit || 'kg', lang)} de ${params.cropName || 'produit'} a été pesée et consignée pour la campagne ${params.entityCode || ''}.`
          : `Harvest pass of ${formatUnit(params.quantity || 0, params.unit || 'kg', lang)} of ${params.cropName || 'crop'} was weighed and registered for campaign ${params.entityCode || ''}.`
      };

    case 'SHIPMENT_DELAY':
      return {
        subject: lang === 'fr' ? 'Urgent : Retard prédictif sur expédition export' : 'Urgent: Forward delay on export shipment',
        body: lang === 'fr'
          ? `L'expédition ${params.entityCode || ''} vers ${params.destination || 'destination'} accuse un retard forward de ${params.delayHours || 0} heures. Risque d'impact sur l'ETA.`
          : `Shipment ${params.entityCode || ''} bound for ${params.destination || 'destination'} has accumulated ${params.delayHours || 0} forward delay hours. ETA impacted.`
      };

    case 'QUALITY_QUARANTINE':
      return {
        subject: lang === 'fr' ? 'Blocage Sanitaire : Lot placé sous quarantaine' : 'Sanitary Hold: Lot placed in quarantine',
        body: lang === 'fr'
          ? `Le lot ${params.entityCode || ''} a été placé en quarantaine sanitaire après contrôle non-conforme. Il est strictement interdit au chargement logistique jusqu'à contre-expertise.`
          : `Lot ${params.entityCode || ''} failed sanitary inspection and is placed in quarantine. It is strictly blocked from logistics dispatch pending re-testing.`
      };

    case 'BUDGET_OVERRUN':
      return {
        subject: lang === 'fr' ? 'Alerte Financière : Dépassement budgétaire' : 'Financial Alert: Budget overrun threshold exceeded',
        body: lang === 'fr'
          ? `Les dépenses sur la campagne ${params.entityCode || ''} excèdent le budget alloué. Montant engagé : ${formatCurrency(params.costAmount || 0, currency, lang)}.`
          : `Expenditure on campaign ${params.entityCode || ''} exceeds allocated budget. Committed amount: ${formatCurrency(params.costAmount || 0, currency, lang)}.`
      };
  }
}
