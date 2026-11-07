import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe2,
  DollarSign,
  Clock,
  Scale,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { AuthSession, OrganizationPreferences } from '../../types/organization.ts';
import { ClientLocalizationService } from '../../services/client-api.ts';
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatUnit,
  getDefaultGuineaPreferences,
  SUPPORTED_UNITS
} from '../../utils/formatters.ts';
import { Card, CardHeader } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';

interface OrganizationSettingsViewProps {
  session: AuthSession;
  onPreferencesUpdated?: (prefs: OrganizationPreferences) => void;
}

export function OrganizationSettingsView({
  session,
  onPreferencesUpdated
}: OrganizationSettingsViewProps) {
  const { t, i18n } = useTranslation();
  const isAdmin = session.user.role === 'ORG_ADMIN' || session.user.role === 'PLATFORM_OWNER';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<OrganizationPreferences>({
    id: '',
    organizationId: session.organization?.id || '',
    preferredLanguage: 'fr',
    preferredCurrency: 'GNF',
    preferredTimezone: 'Africa/Conakry',
    preferredUnitSystem: 'METRIC',
    numberFormatLocale: 'fr-GN',
    dateFormat: 'DD/MM/YYYY',
    isDeleted: false,
    createdAt: '',
    updatedAt: ''
  });

  useEffect(() => {
    loadPreferences();
  }, [session]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await ClientLocalizationService.getPreferences(session);
      setFormData(prefs);
    } catch (err: any) {
      console.warn('Could not load preferences from server, using defaults', err);
      const defaults = getDefaultGuineaPreferences(session.organization?.id || '');
      setFormData(defaults);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const updated = await ClientLocalizationService.updatePreferences(session, {
        preferredLanguage: formData.preferredLanguage,
        preferredCurrency: formData.preferredCurrency,
        preferredTimezone: formData.preferredTimezone,
        preferredUnitSystem: formData.preferredUnitSystem,
        numberFormatLocale: formData.preferredLanguage === 'en' ? 'en-US' : 'fr-GN',
        dateFormat: formData.dateFormat
      });

      setFormData(updated);

      // If user changed language, sync active i18n language
      if (i18n.language !== updated.preferredLanguage) {
        i18n.changeLanguage(updated.preferredLanguage);
      }

      setSuccessMessage(t('settings.savedSuccess', 'Préférences enregistrées avec succès.'));
      if (onPreferencesUpdated) onPreferencesUpdated(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de l\'enregistrement des préférences.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToGuinea = () => {
    const orgId = session.organization?.id || '';
    const defaults = getDefaultGuineaPreferences(orgId);
    setFormData(defaults);
  };

  // Live formatting preview calculations
  const sampleAmount = 12500000;
  const sampleQuantity = 4500;
  const sampleDate = new Date();

  const previewCurrency = formatCurrency(
    sampleAmount,
    formData.preferredCurrency,
    formData.preferredLanguage
  );

  const previewCompactCurrency = formatCompactCurrency(
    sampleAmount,
    formData.preferredCurrency,
    formData.preferredLanguage
  );

  const previewDate = formatDate(
    sampleDate,
    'full',
    formData.preferredLanguage,
    formData.preferredTimezone
  );

  const previewUnit = formatUnit(
    sampleQuantity,
    'kg',
    formData.preferredLanguage,
    true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
              {t('settings.preferredLanguage', 'LOCALISATION & PARAMÈTRES')}
            </span>
            <Badge variant="forest" size="xs">
              {formData.preferredLanguage === 'fr' ? 'Français (Guinée)' : 'English (Intl)'}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
            {t('settings.title', 'Préférences de l\'Organisation & Localisation')}
          </h1>
          <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">
            {t('settings.subtitle', 'Configurez la langue d\'affichage, la devise comptable par défaut, le fuseau horaire et les unités de mesure.')}
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={handleResetToGuinea}
            >
              {t('settings.guineaDefault', 'Baseline Guinée (GNF/FR)')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              disabled={saving}
              onClick={() => handleSave()}
            >
              {saving ? t('common.loading', 'Enregistrement...') : t('settings.savePreferences', 'Enregistrer')}
            </Button>
          </div>
        ) : (
          <Badge variant="warning" size="sm">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Lecture Seule (Rôle {session.user.role})</span>
            </span>
          </Badge>
        )}
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="hover:underline font-bold text-[10px]">
            {t('common.close', 'Fermer')}
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="hover:underline font-bold text-[10px]">
            {t('common.close', 'Fermer')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title={t('settings.preferredLanguage', 'Langue & Région')}
              subtitle="Sélectionnez la langue d'interface et les conventions typographiques régionales."
            />
            <div className="p-5 space-y-5">
              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-2 flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-[#173F35] dark:text-[#77A96B]" />
                  <span>{t('settings.preferredLanguage', 'Langue d\'Affichage')}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setFormData({ ...formData, preferredLanguage: 'fr' })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      formData.preferredLanguage === 'fr'
                        ? 'border-[#173F35] dark:border-[#77A96B] bg-[#F0F4EE] dark:bg-[#1B2B23] ring-2 ring-[#173F35]/20 dark:ring-[#77A96B]/20'
                        : 'border-[#E1E7E0] dark:border-[#283D33] hover:border-[#A2B3A7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">Français (Guinée & Afrique de l'Ouest)</span>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">FR</span>
                    </div>
                    <p className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-1">
                      Conventions comptables OHADA, calendrier agricole guinéen, séparateurs décimaux standards.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setFormData({ ...formData, preferredLanguage: 'en' })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      formData.preferredLanguage === 'en'
                        ? 'border-[#173F35] dark:border-[#77A96B] bg-[#F0F4EE] dark:bg-[#1B2B23] ring-2 ring-[#173F35]/20 dark:ring-[#77A96B]/20'
                        : 'border-[#E1E7E0] dark:border-[#283D33] hover:border-[#A2B3A7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">English (International Agribusiness)</span>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">EN</span>
                    </div>
                    <p className="text-[11px] text-[#66736B] dark:text-[#9EB0A5] mt-1">
                      International commercial trade contracts, export certifications, English reports.
                    </p>
                  </button>
                </div>
              </div>

              {/* Currency Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#173F35] dark:text-[#77A96B]" />
                  <span>{t('settings.preferredCurrency', 'Devise Comptable Principale')}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { code: 'GNF', label: 'Franc Guinéen', sub: 'Standard national' },
                    { code: 'USD', label: 'US Dollar', sub: 'Export & Fret' },
                    { code: 'EUR', label: 'Euro (€)', sub: 'Marché Européen' },
                    { code: 'XOF', label: 'Franc CFA', sub: 'UEMOA / CEDEAO' }
                  ].map((cur) => (
                    <button
                      key={cur.code}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setFormData({ ...formData, preferredCurrency: cur.code as any })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formData.preferredCurrency === cur.code
                          ? 'border-[#173F35] dark:border-[#77A96B] bg-[#F0F4EE] dark:bg-[#1B2B23] ring-1 ring-[#173F35]'
                          : 'border-[#E1E7E0] dark:border-[#283D33] hover:border-[#A2B3A7]'
                      }`}
                    >
                      <div className="font-mono font-bold text-sm text-[#202924] dark:text-[#EEF4F0]">{cur.code}</div>
                      <div className="text-[11px] font-medium text-[#66736B] dark:text-[#9EB0A5]">{cur.label}</div>
                      <div className="text-[9.5px] text-[#8A988F] mt-0.5">{cur.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone & Measurement Units */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#173F35] dark:text-[#77A96B]" />
                    <span>{t('settings.preferredTimezone', 'Fuseau Horaire de Référence')}</span>
                  </label>
                  <select
                    disabled={!isAdmin}
                    value={formData.preferredTimezone}
                    onChange={(e) => setFormData({ ...formData, preferredTimezone: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[#CDD6CC] dark:border-[#334A3E] bg-white dark:bg-[#14201A] px-3 py-2 text-[#202924] dark:text-[#EEF4F0] focus:ring-2 focus:ring-[#173F35] focus:outline-hidden"
                  >
                    <option value="Africa/Conakry">Africa/Conakry (GMT +00:00 — Guinée)</option>
                    <option value="Africa/Dakar">Africa/Dakar (GMT +00:00 — Sénégal)</option>
                    <option value="Africa/Abidjan">Africa/Abidjan (GMT +00:00 — Côte d'Ivoire)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST — Acheteurs EU)</option>
                    <option value="America/New_York">America/New_York (EST/EDT — Acheteurs US)</option>
                    <option value="UTC">UTC (Temps Universel Coordonné)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1.5 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-[#173F35] dark:text-[#77A96B]" />
                    <span>{t('settings.preferredUnitSystem', 'Système d\'Unités')}</span>
                  </label>
                  <select
                    disabled={!isAdmin}
                    value={formData.preferredUnitSystem}
                    onChange={(e) => setFormData({ ...formData, preferredUnitSystem: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-[#CDD6CC] dark:border-[#334A3E] bg-white dark:bg-[#14201A] px-3 py-2 text-[#202924] dark:text-[#EEF4F0] focus:ring-2 focus:ring-[#173F35] focus:outline-hidden"
                  >
                    <option value="METRIC">Système Métrique International (kg, t, ha, m², L)</option>
                    <option value="IMPERIAL">Système Impérial (lb, ton, acre, sq ft)</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Business Data Integrity Notice */}
          <div className="p-4 rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs flex items-start gap-3">
            <Info className="w-5 h-5 flex-shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
            <div>
              <div className="font-bold">Préservation Stricte des Données Métier & Saisies Utilisateurs</div>
              <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                Le changement de langue modifie instantanément l'interface, les libellés de statuts, les messages de validation et les rapports exportés. Conformément aux exigences, les noms de fermes, raisons sociales des acheteurs, codes de parcelles et notes de terrain ne sont <strong>jamais modifiés ou altérés</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Preview Card (1 col) */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Aperçu du Rendu Régional"
              subtitle="Formatage instantané avec vos paramètres actifs"
            />
            <div className="p-4 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-[#F7F8F4] dark:bg-[#18261F] border border-[#E1E7E0] dark:border-[#283D33] space-y-2">
                <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5]">Formatage Monétaire :</div>
                <div className="text-base font-bold font-mono text-[#173F35] dark:text-[#77A96B]">
                  {previewCurrency}
                </div>
                <div className="text-[10px] text-[#8A988F]">
                  Forme compacte : <strong className="font-mono">{previewCompactCurrency}</strong>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F8F4] dark:bg-[#18261F] border border-[#E1E7E0] dark:border-[#283D33] space-y-1">
                <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5]">Date Complète (Fuseau {formData.preferredTimezone}) :</div>
                <div className="font-medium text-[#202924] dark:text-[#EEF4F0] capitalize">
                  {previewDate}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F8F4] dark:bg-[#18261F] border border-[#E1E7E0] dark:border-[#283D33] space-y-1">
                <div className="text-[11px] text-[#66736B] dark:text-[#9EB0A5]">Affichage des Volumes & Unités :</div>
                <div className="font-medium text-[#202924] dark:text-[#EEF4F0]">
                  {previewUnit}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E1E7E0] dark:border-[#283D33]">
                <div className="text-[10px] uppercase font-mono font-bold text-[#8A988F] mb-2">
                  Unités Métriques Prises en Charge :
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  {Object.values(SUPPORTED_UNITS).map((u) => (
                    <div key={u.code} className="p-1 rounded bg-[#E1E7E0]/40 dark:bg-[#283D33]/40 flex items-center justify-between">
                      <span className="font-bold">{u.symbol}</span>
                      <span className="text-[#66736B] dark:text-[#9EB0A5] truncate ml-1">
                        {formData.preferredLanguage === 'fr' ? u.labelFr : u.labelEn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
