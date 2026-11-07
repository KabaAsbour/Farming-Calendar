/**
 * FARMING CALENDAR — LOCALIZATION & FORMATTING ENGINE (PHASE 10)
 * Server-side localization service with organization preferences persistence,
 * audit trail logging, and re-export of core formatting functions.
 */

import { AuthSession, OrganizationPreferences } from '../types/organization.ts';
import { getState, commitState } from '../db/connection.ts';
import { logAuditEvent } from './audit.service.ts';
import {
  SupportedLanguage,
  UnitType,
  UnitDescriptor,
  SUPPORTED_UNITS,
  getDefaultGuineaPreferences,
  formatCurrency,
  formatCompactCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatUnit,
  formatRelativeTime,
  getNotificationTemplate
} from '../utils/formatters.ts';

// Re-export pure helpers for server and test suite convenience
export type {
  SupportedLanguage,
  UnitType,
  UnitDescriptor
};

export {
  SUPPORTED_UNITS,
  getDefaultGuineaPreferences,
  formatCurrency,
  formatCompactCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatUnit,
  formatRelativeTime,
  getNotificationTemplate
};

export class LocalizationService {
  public static getDefaultGuineaPreferences(organizationId: string): OrganizationPreferences {
    return getDefaultGuineaPreferences(organizationId);
  }

  public static formatCurrency(amount: number, currency: string = 'GNF', locale: SupportedLanguage | string = 'fr'): string {
    return formatCurrency(amount, currency, locale);
  }

  public static formatCompactCurrency(amount: number, currency: string = 'GNF', locale: SupportedLanguage | string = 'fr'): string {
    return formatCompactCurrency(amount, currency, locale);
  }

  public static formatNumber(value: number, decimals: number = 0, locale: SupportedLanguage | string = 'fr'): string {
    return formatNumber(value, decimals, locale);
  }

  public static formatDate(dateInput: string | Date | number, format: 'short' | 'medium' | 'long' | 'full' = 'medium', locale: SupportedLanguage | string = 'fr', timezone: string = 'Africa/Conakry'): string {
    return formatDate(dateInput, format, locale, timezone);
  }

  public static formatDateTime(dateInput: string | Date | number, format: 'short' | 'medium' | 'long' = 'medium', locale: SupportedLanguage | string = 'fr', timezone: string = 'Africa/Conakry'): string {
    return formatDateTime(dateInput, format, locale, timezone);
  }

  public static formatUnit(quantity: number, unit: UnitType | string, locale: SupportedLanguage | string = 'fr', includeLongLabel: boolean = false): string {
    return formatUnit(quantity, unit, locale, includeLongLabel);
  }

  public static formatRelativeTime(dateInput: string | Date, locale: SupportedLanguage | string = 'fr'): string {
    return formatRelativeTime(dateInput, locale);
  }

  public static getNotificationTemplate(type: any, params: any, lang: SupportedLanguage = 'fr') {
    return getNotificationTemplate(type, params, lang);
  }

  /**
   * Retrieves organization preferences from database, falling back to Guinea baseline if not configured
   */
  public static getOrganizationPreferences(session: AuthSession): OrganizationPreferences {
    const orgId = session.organization?.id || session.user?.activeOrganizationId;
    const state = getState();
    const prefs = (state.organization_preferences || []).find((p: any) => p.organizationId === orgId);
    if (prefs) {
      return prefs;
    }
    return this.getDefaultGuineaPreferences(orgId);
  }

  /**
   * Updates organization localization preferences (Requires ORG_ADMIN or PLATFORM_OWNER)
   */
  public static updateOrganizationPreferences(
    session: AuthSession,
    updates: Partial<Omit<OrganizationPreferences, 'id' | 'organizationId' | 'createdAt'>>
  ): OrganizationPreferences {
    const role = session.user?.role;
    if (role !== 'ORG_ADMIN' && role !== 'PLATFORM_OWNER') {
      throw new Error(`SECURITY_ERROR: Role ${role} is not permitted to modify organization localization preferences.`);
    }

    const orgId = session.organization?.id || session.user?.activeOrganizationId;
    const state = getState();
    if (!state.organization_preferences) {
      state.organization_preferences = [];
    }

    const existingIdx = state.organization_preferences.findIndex((p: any) => p.organizationId === orgId);
    let updated: OrganizationPreferences;

    if (existingIdx >= 0) {
      updated = {
        ...state.organization_preferences[existingIdx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      state.organization_preferences[existingIdx] = updated;
    } else {
      updated = {
        ...this.getDefaultGuineaPreferences(orgId),
        ...updates,
        updatedAt: new Date().toISOString()
      };
      state.organization_preferences.push(updated);
    }

    commitState(state);

    logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      userRole: session.user.role,
      userEmail: session.user.email,
      action: 'ORGANIZATION_PREFERENCES_UPDATED',
      targetEntity: 'ORGANIZATION_PREFERENCES',
      targetEntityId: updated.id,
      details: { updates }
    });

    return updated;
  }
}
