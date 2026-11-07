import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbConfig {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port?: number;
  max?: number;
  ssl?: boolean;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

// Global pool instance
let pgPool: pg.Pool | null = null;
let isPostgresConnected = false;

// Local persistent relational store fallback for environments without live PostgreSQL
const DATA_DIR = path.resolve(__dirname, '../../data');
export function getDbFilePath(): string {
  const fileName = process.env.DB_FILE || (process.env.NODE_ENV === 'test' ? 'farming_calendar_test_data.json' : 'farming_calendar_data.json');
  return path.resolve(DATA_DIR, fileName);
}

interface SchemaState {
  _migrations: { id: number; name: string; applied_at: string }[];
  organizations: any[];
  users: any[];
  organization_memberships: any[];
  farms: any[];
  plots: any[];
  audit_logs: any[];
  normal_calendar_events: any[];
  crops: any[];
  crop_varieties: any[];
  agricultural_seasons: any[];
  agricultural_methods: any[];
  suppliers: any[];
  agricultural_inputs: any[];
  agricultural_equipment: any[];
  field_teams: any[];
  production_campaigns: any[];
  campaign_operations: any[];
  campaign_harvests: any[];
  buyers: any[];
  commercial_orders: any[];
  order_lines: any[];
  supply_reservations: any[];
  inventory_items: any[];
  stock_movements: any[];
  processing_recipes: any[];
  processing_batches: any[];
  quality_inspections: any[];
  shipments: any[];
  budgets: any[];
  exchange_rates: any[];
  investment_projects: any[];
  organization_preferences?: any[];
}

let inMemoryState: SchemaState | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadState(): SchemaState {
  ensureDataDir();
  const tables = [
    'organizations',
    'users',
    'organization_memberships',
    'farms',
    'plots',
    'audit_logs',
    'normal_calendar_events',
    'crops',
    'crop_varieties',
    'agricultural_seasons',
    'agricultural_methods',
    'suppliers',
    'agricultural_inputs',
    'agricultural_equipment',
    'field_teams',
    'production_campaigns',
    'campaign_operations',
    'campaign_harvests',
    'buyers',
    'commercial_orders',
    'order_lines',
    'supply_reservations',
    'inventory_items',
    'stock_movements',
    'processing_recipes',
    'processing_batches',
    'quality_inspections',
    'shipments',
    'budgets',
    'exchange_rates',
    'investment_projects',
    'organization_preferences'
  ];

  const dbFile = getDbFilePath();
  if (fs.existsSync(dbFile)) {
    try {
      const content = fs.readFileSync(dbFile, 'utf-8');
      const parsed = JSON.parse(content);
      for (const t of tables) {
        if (!parsed[t]) parsed[t] = [];
      }
      if (!parsed._migrations) parsed._migrations = [];
      return parsed;
    } catch (err) {
      console.warn('[DB] Could not parse existing DB file, reinitializing', err);
    }
  }

  const freshState: any = { _migrations: [] };
  for (const t of tables) {
    freshState[t] = [];
  }
  return freshState as SchemaState;
}

function saveState(state: SchemaState) {
  ensureDataDir();
  fs.writeFileSync(getDbFilePath(), JSON.stringify(state, null, 2), 'utf-8');
}

export function resetInMemoryState(): void {
  inMemoryState = null;
}

export function getState(): SchemaState {
  if (!inMemoryState) {
    inMemoryState = loadState();
  }
  return inMemoryState;
}

export function commitState(state: SchemaState) {
  inMemoryState = state;
  saveState(state);
}

/**
 * Initializes the database connection and runs pending migrations
 */
export async function initDatabase(): Promise<{ isPostgres: boolean }> {
  const host = process.env.SQL_HOST;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const database = process.env.SQL_DB_NAME;

  if (host && user && database) {
    try {
      pgPool = new Pool({
        host,
        user,
        password,
        database,
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
        max: 10,
        connectionTimeoutMillis: 5000,
      });

      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      isPostgresConnected = true;
      console.log(`[DB] Connected to PostgreSQL at ${host}/${database}`);
      await runPostgresMigrations();
      return { isPostgres: true };
    } catch (err) {
      console.warn('[DB] PostgreSQL connection attempt failed, falling back to local persistent relational engine:', (err as Error).message);
      isPostgresConnected = false;
    }
  }

  console.log('[DB] Running with local persistent relational storage engine.');
  await runLocalMigrations();
  return { isPostgres: false };
}

/**
 * Runs SQL migrations against PostgreSQL
 */
async function runPostgresMigrations() {
  if (!pgPool) return;
  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const client = await pgPool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const file of files) {
      const res = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (res.rowCount === 0) {
        console.log(`[DB] Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        console.log(`[DB] Migration applied: ${file}`);
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Runs repeatable migrations and dev seed for local persistent engine
 */
async function runLocalMigrations() {
  const state = getState();
  const migrations = [
    '001_initial_schema.sql',
    '002_security_and_tenancy.sql',
    '003_dev_seed.sql',
    '004_normal_calendar.sql',
    '005_agricultural_core.sql',
    '006_commercial_management.sql',
    '007_processing_and_inventory.sql',
    '008_logistics_and_export.sql'
  ];

  for (const mig of migrations) {
    const existing = state._migrations.find(m => m.name === mig);
    if (!existing) {
      console.log(`[DB Local] Applying migration: ${mig}`);
      if (process.env.ENABLE_DEMO_SEED === 'true') {
        if (mig === '003_dev_seed.sql' || mig === '004_normal_calendar.sql') {
          applyLocalSeed(state);
        }
        if (mig === '005_agricultural_core.sql') {
          applyAgriculturalSeed(state);
        }
        if (mig === '006_commercial_management.sql') {
          applyCommercialSeed(state);
        }
        if (mig === '007_processing_and_inventory.sql') {
          applyProcessingInventorySeed(state);
        }
        if (mig === '008_logistics_and_export.sql') {
          applyLogisticsSeed(state);
        }
      }
      state._migrations.push({
        id: state._migrations.length + 1,
        name: mig,
        applied_at: new Date().toISOString()
      });
    }
  }

  // Ensure system reference data (exchange rates, seasons, methods) is always populated
  seedStandardReferenceData(state);

  // Demo seeds only populate if explicitly requested (e.g. during isolated automated test runs)
  if (process.env.ENABLE_DEMO_SEED === 'true') {
    if (!state.normal_calendar_events || state.normal_calendar_events.length === 0) {
      applyLocalSeed(state);
    }
    if (!state.crops || state.crops.length === 0) {
      applyAgriculturalSeed(state);
    }
    if (!state.buyers || state.buyers.length === 0 || !state.commercial_orders?.find((o: any) => o.id === 'ord-2026-cas-001')) {
      applyCommercialSeed(state);
    }
    if (!state.inventory_items || state.inventory_items.length === 0) {
      applyProcessingInventorySeed(state);
    }
    if (!state.shipments || state.shipments.length === 0) {
      applyLogisticsSeed(state);
    }
    if (!state.budgets || state.budgets.length === 0) {
      applyFinanceSeed(state);
    }
  }

  commitState(state);
}

export function seedOfficialExchangeRates(state: SchemaState) {
  if (!state.exchange_rates) state.exchange_rates = [];
  const ratesSeed = [
    {
      id: 'fx-eur-gnf',
      fromCurrency: 'EUR',
      toCurrency: 'GNF',
      rate: 9350,
      effectiveDate: '2026-10-15',
      source: 'Banque Centrale de la République de Guinée (BCRG) - Cours Indicatif Officiel',
      isManualOverride: false
    },
    {
      id: 'fx-gnf-eur',
      fromCurrency: 'GNF',
      toCurrency: 'EUR',
      rate: 0.00010695,
      effectiveDate: '2026-10-15',
      source: 'Banque Centrale de la République de Guinée (BCRG) - Cours Indicatif Officiel',
      isManualOverride: false
    },
    {
      id: 'fx-usd-gnf',
      fromCurrency: 'USD',
      toCurrency: 'GNF',
      rate: 8600,
      effectiveDate: '2026-10-15',
      source: 'Banque Centrale de la République de Guinée (BCRG) - Cours Indicatif Officiel',
      isManualOverride: false
    },
    {
      id: 'fx-gnf-usd',
      fromCurrency: 'GNF',
      toCurrency: 'USD',
      rate: 0.00011628,
      effectiveDate: '2026-10-15',
      source: 'Banque Centrale de la République de Guinée (BCRG) - Cours Indicatif Officiel',
      isManualOverride: false
    },
    {
      id: 'fx-xof-gnf',
      fromCurrency: 'XOF',
      toCurrency: 'GNF',
      rate: 14.25,
      effectiveDate: '2026-10-15',
      source: 'BCEAO / BCRG Zone Monétaire Ouest-Africaine (ZMAO)',
      isManualOverride: false
    },
    {
      id: 'fx-gnf-xof',
      fromCurrency: 'GNF',
      toCurrency: 'XOF',
      rate: 0.070175,
      effectiveDate: '2026-10-15',
      source: 'BCEAO / BCRG Zone Monétaire Ouest-Africaine (ZMAO)',
      isManualOverride: false
    }
  ];

  for (const r of ratesSeed) {
    const idx = state.exchange_rates.findIndex((e: any) => e.fromCurrency === r.fromCurrency && e.toCurrency === r.toCurrency);
    if (idx >= 0) {
      if (!state.exchange_rates[idx].isManualOverride) {
        state.exchange_rates[idx].rate = r.rate;
      }
    } else {
      state.exchange_rates.push(r);
    }
  }
}

export function seedStandardReferenceData(state: SchemaState): void {
  seedOfficialExchangeRates(state);

  if (!state.agricultural_seasons) state.agricultural_seasons = [];
  const defaultSeasons = [
    {
      id: 'season-2026-seche',
      name: 'Saison Sèche 2026 (Grand Nord & Basse-Guinée)',
      code: 'SEASON-DRY-2026',
      startDate: '2025-11-01',
      endDate: '2026-04-30',
      description: 'Période sèche sous irrigation goutte-à-goutte et submersion contrôlée',
      isDefault: true,
      isActive: true
    },
    {
      id: 'season-2026-pluies',
      name: 'Saison des Pluies 2026 (Hivernage)',
      code: 'SEASON-RAIN-2026',
      startDate: '2026-05-01',
      endDate: '2026-10-31',
      description: 'Hivernage à forte pluviométrie côtière et contreforts du Fouta-Djalon',
      isDefault: false,
      isActive: true
    }
  ];
  for (const s of defaultSeasons) {
    if (!state.agricultural_seasons.find(e => e.id === s.id)) {
      state.agricultural_seasons.push(s);
    }
  }

  if (!state.agricultural_methods) state.agricultural_methods = [];
  const defaultMethods = [
    {
      id: 'meth-plant-nursery',
      name: 'Pépinière ombragée puis repiquage manuel',
      category: 'PLANTING',
      description: 'Semis en clayettes ou planches maraîchères sous ombrière puis repiquage en poquets',
      laborIntensity: 'HIGH',
      isActive: true
    },
    {
      id: 'meth-plant-direct',
      name: 'Semis direct en ligne mécanisé / semi-mécanisé',
      category: 'PLANTING',
      description: 'Semoir à disques ou poquets directs après labour profond',
      laborIntensity: 'MEDIUM',
      isActive: true
    },
    {
      id: 'meth-plant-cuttings',
      name: 'Bouturage sur billons ou billons transversaux',
      category: 'PLANTING',
      description: 'Boutures saines de 20-30 cm inclinées à 45° pour cultures à tubercules',
      laborIntensity: 'MEDIUM',
      isActive: true
    },
    {
      id: 'meth-irrig-drip',
      name: 'Micro-irrigation goutte-à-goutte basse pression',
      category: 'IRRIGATION',
      description: 'Lignes de goutteurs autorégulants espacés de 20-30 cm',
      laborIntensity: 'LOW',
      isActive: true
    },
    {
      id: 'meth-protect-bio',
      name: 'Lutte intégrée et biocontrôle biologique',
      category: 'CROP_PROTECTION',
      description: 'Extraits végétaux naturels (Neem, savon noir) et auxiliaires biologiques',
      laborIntensity: 'MEDIUM',
      isActive: true
    }
  ];
  for (const m of defaultMethods) {
    if (!state.agricultural_methods.find(e => e.id === m.id)) {
      state.agricultural_methods.push(m);
    }
  }
}

export function clearAllDatabaseData(): void {
  const state = getState();
  const retainedMigrations = state._migrations || [];
  const retainedRates = state.exchange_rates && state.exchange_rates.length > 0 ? state.exchange_rates : [];

  const emptyState: SchemaState = {
    _migrations: retainedMigrations,
    organizations: [],
    users: [],
    organization_memberships: [],
    farms: [],
    plots: [],
    audit_logs: [],
    normal_calendar_events: [],
    crops: [],
    crop_varieties: [],
    agricultural_seasons: [],
    agricultural_methods: [],
    suppliers: [],
    agricultural_inputs: [],
    agricultural_equipment: [],
    field_teams: [],
    production_campaigns: [],
    campaign_operations: [],
    campaign_harvests: [],
    buyers: [],
    commercial_orders: [],
    order_lines: [],
    supply_reservations: [],
    inventory_items: [],
    stock_movements: [],
    processing_recipes: [],
    processing_batches: [],
    quality_inspections: [],
    shipments: [],
    budgets: [],
    exchange_rates: retainedRates,
    investment_projects: [],
    organization_preferences: []
  };

  seedStandardReferenceData(emptyState);
  inMemoryState = emptyState;
  commitState(emptyState);
  console.log('[DB] All demonstration, sample, and test records successfully cleared. System clean and ready.');
}

export function applyAllDemoSeeds(state: SchemaState): void {
  applyLocalSeed(state);
  applyAgriculturalSeed(state);
  applyCommercialSeed(state);
  applyProcessingInventorySeed(state);
  applyLogisticsSeed(state);
  applyFinanceSeed(state);
  commitState(state);
}

function applyLocalSeed(state: SchemaState) {
  // Pre-hashed bcrypt string for "DevPass2026!"
  const devPassHash = '$2b$10$j8tzFXeiDxGZg0aZoKcUDONpGTDpTH0l9ys4LxY6aAhTjxMy21.yK';

  // Seed Organizations
  const org1Id = '11111111-1111-1111-1111-111111111111';
  const org2Id = '22222222-2222-2222-2222-222222222222';

  if (!state.organizations.find(o => o.id === org1Id)) {
    state.organizations.push({
      id: org1Id,
      name: 'Coopérative Friguiagbé (Kindia)',
      slug: 'coop-friguiagbe-kindia',
      country_code: 'GN',
      org_type: 'COOPERATIVE',
      primary_currency: 'GNF',
      timezone: 'Africa/Conakry',
      contact_email: 'contact@kindia-coop.gn',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    });
  }

  if (!state.organizations.find(o => o.id === org2Id)) {
    state.organizations.push({
      id: org2Id,
      name: 'Union Maraîchère du Fouta (Labé)',
      slug: 'union-maraichere-fouta',
      country_code: 'GN',
      org_type: 'COOPERATIVE',
      primary_currency: 'GNF',
      timezone: 'Africa/Conakry',
      contact_email: 'contact@fouta-union.gn',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    });
  }

  // Seed Users
  const seedUsers = [
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'owner@farmingcalendar.dev', name: 'Ibrahima Diallo (Platform Owner)', role: 'PLATFORM_OWNER', orgId: org1Id, isOwner: true },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', email: 'admin.kindia@farmingcalendar.dev', name: 'Mariama Camara (Org Admin)', role: 'ORG_ADMIN', orgId: org1Id, isOwner: false },
    { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', email: 'manager.kindia@farmingcalendar.dev', name: 'Abdoulaye Soumah (Manager)', role: 'MANAGER', orgId: org1Id, isOwner: false },
    { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', email: 'agro.kindia@farmingcalendar.dev', name: 'Dr. Fanta Condé (Agronomist)', role: 'AGRONOMIST', orgId: org1Id, isOwner: false },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', email: 'comm.kindia@farmingcalendar.dev', name: 'Mamadou Touré (Commercial Mgr)', role: 'COMMERCIAL_MANAGER', orgId: org1Id, isOwner: false },
    { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', email: 'finance.kindia@farmingcalendar.dev', name: 'Aissatou Barry (Finance Mgr)', role: 'FINANCE_MANAGER', orgId: org1Id, isOwner: false },
    { id: '12121212-1212-1212-1212-121212121212', email: 'ops.kindia@farmingcalendar.dev', name: 'Sékou Traoré (Operations Staff)', role: 'OPERATIONS_STAFF', orgId: org1Id, isOwner: false },
    { id: '13131313-1313-1313-1313-131313131313', email: 'viewer.kindia@farmingcalendar.dev', name: 'Audit & Inspection GIZ (Viewer)', role: 'VIEWER', orgId: org1Id, isOwner: false },
    { id: '21212121-2121-2121-2121-212121212121', email: 'admin.fouta@farmingcalendar.dev', name: 'Ousmane Bah (Org Admin Fouta)', role: 'ORG_ADMIN', orgId: org2Id, isOwner: false },
  ];

  for (const u of seedUsers) {
    const existing = state.users.find(e => e.id === u.id || e.email === u.email);
    if (!existing) {
      state.users.push({
        id: u.id,
        email: u.email,
        password_hash: devPassHash,
        full_name: u.name,
        preferred_language: 'fr',
        is_active: true,
        is_platform_owner: u.isOwner,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      existing.password_hash = devPassHash;
    }

    if (!state.organization_memberships.find(m => m.user_id === u.id && m.organization_id === u.orgId)) {
      state.organization_memberships.push({
        id: `m-${u.id.substring(0, 8)}`,
        organization_id: u.orgId,
        user_id: u.id,
        role: u.role,
        is_primary: true,
        created_at: new Date().toISOString()
      });
    }
  }

  // Seed Farms
  const farm1Id = 'f1111111-1111-1111-1111-111111111111';
  const farm2Id = 'f2222222-2222-2222-2222-222222222222';

  if (!state.farms.find(f => f.id === farm1Id)) {
    state.farms.push({
      id: farm1Id,
      organization_id: org1Id,
      name: 'Exploitation Friguiagbé',
      code: 'FARM-FRIG-01',
      region: 'Basse-Guinée',
      prefecture: 'Kindia',
      total_area_ha: 45.0,
      usable_area_ha: 38.5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    });
  }

  if (!state.farms.find(f => f.id === farm2Id)) {
    state.farms.push({
      id: farm2Id,
      organization_id: org2Id,
      name: 'Ferme Horticole Timbi-Madina',
      code: 'FARM-TIMBI-01',
      region: 'Moyenne-Guinée',
      prefecture: 'Pita/Labé',
      total_area_ha: 80.0,
      usable_area_ha: 72.0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    });
  }

  // Seed Plots
  const plot1Id = 'p1111111-1111-1111-1111-111111111111';
  const plot2Id = 'p2222222-2222-2222-2222-222222222222';

  if (!state.plots.find(p => p.id === plot1Id)) {
    state.plots.push({
      id: plot1Id,
      organization_id: org1Id,
      farm_id: farm1Id,
      name: 'Parcelle Mangues Kent A1',
      code: 'PLOT-MNG-A1',
      area_hectares: 12.5,
      soil_type: 'Sablo-limoneux',
      irrigation_type: 'DRIP',
      current_status: 'CULTIVATED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    });
  }

  if (!state.plots.find(p => p.id === plot2Id)) {
    state.plots.push({
      id: plot2Id,
      organization_id: org2Id,
      farm_id: farm2Id,
      name: 'Parcelle Pomme de Terre F1',
      code: 'PLOT-PDT-F1',
      area_hectares: 15.0,
      soil_type: 'Volcanique riche',
      irrigation_type: 'SPRINKLER',
      current_status: 'PLANNED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    });
  }

  // Seed Normal Calendar Events for Kindia (Org 1)
  if (!state.normal_calendar_events) {
    state.normal_calendar_events = [];
  }

  const sampleEvents = [
    {
      id: 'e1111111-1111-1111-1111-111111111111',
      organization_id: org1Id,
      title: 'Contrôle quotidien motopompe & réseau goutte-à-goutte',
      description: 'Vérification de la pression du filtre à sable et des lignes d’irrigation sur les manguiers.',
      event_type: 'MAINTENANCE',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      start_datetime: '2026-10-09T07:30:00Z',
      end_datetime: '2026-10-09T08:30:00Z',
      all_day: false,
      timezone: 'Africa/Conakry',
      assigned_to_user_id: '12121212-1212-1212-1212-121212121212', // Ops staff
      farm_id: farm1Id,
      plot_id: plot1Id,
      recurrence_rule: { frequency: 'DAILY', interval: 1, count: 60 },
      reminders: [15],
      notes: 'Remplacer le joint torique si baisse de pression observée.',
      created_by_user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    },
    {
      id: 'e2222222-2222-2222-2222-222222222222',
      organization_id: org1Id,
      title: 'Réunion de coordination : Prévision de récolte Mangues Kent',
      description: 'Point hebdomadaire sur le taux de maturité des fruits, la disponibilité des cageots et l’expédition aéroport.',
      event_type: 'MEETING',
      status: 'PENDING',
      priority: 'URGENT',
      start_datetime: '2026-10-10T10:00:00Z',
      end_datetime: '2026-10-10T12:00:00Z',
      all_day: false,
      timezone: 'Africa/Conakry',
      assigned_to_user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', // Agronomist
      farm_id: farm1Id,
      plot_id: plot1Id,
      reminders: [60],
      notes: 'Ordre du jour : calibrage export vs marché local Conakry Madina.',
      created_by_user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    },
    {
      id: 'e3333333-3333-3333-3333-333333333333',
      organization_id: org1Id,
      title: 'Audit de Conformité GlobalG.A.P. & Traçabilité',
      description: 'Visite de terrain de l’auditeur phytosanitaire sur le bloc A1 et inspection du magasin de stockage.',
      event_type: 'INSPECTION',
      status: 'PENDING',
      priority: 'HIGH',
      start_datetime: '2026-10-15T00:00:00Z',
      end_datetime: '2026-10-15T23:59:59Z',
      all_day: true,
      timezone: 'Africa/Conakry',
      assigned_to_user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Org Admin
      farm_id: farm1Id,
      reminders: [1440],
      notes: 'Tenir prêts les registres d’épandage organique et fiches d’hygiène.',
      created_by_user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    },
    {
      id: 'e4444444-4444-4444-4444-444444444444',
      organization_id: org2Id, // Org Beta (Fouta) - used to verify isolation
      title: 'Semis semences sélectionnées Pomme de Terre Nicola',
      description: 'Lancement de la campagne maraîchère de contre-saison à Pita.',
      event_type: 'TASK',
      status: 'PENDING',
      priority: 'HIGH',
      start_datetime: '2026-10-12T08:00:00Z',
      end_datetime: '2026-10-12T16:00:00Z',
      all_day: false,
      timezone: 'Africa/Conakry',
      farm_id: farm2Id,
      plot_id: plot2Id,
      created_by_user_id: '21212121-2121-2121-2121-212121212121',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    }
  ];

  for (const se of sampleEvents) {
    if (!state.normal_calendar_events.find((e: any) => e.id === se.id)) {
      state.normal_calendar_events.push(se);
    }
  }
}

function applyAgriculturalSeed(state: SchemaState) {
  const org1Id = '11111111-1111-1111-1111-111111111111'; // Kindia
  const org2Id = '22222222-2222-2222-2222-222222222222'; // Fouta
  const farm1Id = 'f1111111-1111-1111-1111-111111111111';
  const farm2Id = 'f2222222-2222-2222-2222-222222222222';
  const plot1Id = 'p1111111-1111-1111-1111-111111111111';
  const plot2Id = 'p2222222-2222-2222-2222-222222222222';
  const managerId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const agronomistId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const opsStaffId = '12121212-1212-1212-1212-121212121212';

  // 1. Crops (Demonstration: Cassava, Pepper, Watermelon)
  const cropsSeed = [
    {
      id: 'crop-cassava-01',
      organization_id: org1Id,
      name: 'Manioc / Cassava',
      scientific_name: 'Manihot esculenta Crantz',
      category: 'ROOT_TUBER',
      growth_cycle_days: 270,
      default_spacing_cm: '100x100 cm',
      water_requirement_mm: 750,
      description: 'Plante vivrière majeure en Guinée, racine riche en féculents et amidon, feuilles consommées en sauce.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'crop-pepper-01',
      organization_id: org1Id,
      name: 'Piment / Hot Pepper',
      scientific_name: 'Capsicum spp.',
      category: 'SOLANACEOUS_VEGETABLE',
      growth_cycle_days: 120,
      default_spacing_cm: '50x50 cm',
      water_requirement_mm: 600,
      description: 'Culture maraîchère à haute valeur ajoutée, destinée au marché local et aux circuits d’exportation sous-régionale.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'crop-watermelon-01',
      organization_id: org1Id,
      name: 'Pastèque / Watermelon',
      scientific_name: 'Citrullus lanatus',
      category: 'CUCURBIT',
      growth_cycle_days: 85,
      default_spacing_cm: '200x150 cm',
      water_requirement_mm: 450,
      description: 'Cucurbitacée d’excellence pour la contre-saison irriguée, forte demande urbaine à Conakry.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const c of cropsSeed) {
    if (!state.crops.find((e: any) => e.id === c.id)) {
      state.crops.push(c);
    }
  }

  // 2. Crop Varieties (Pepper: Bird's Eye & S17; Cassava: Bonoua & Bocou 1; Watermelon: Kaolack & Crimson Sweet)
  const varietiesSeed = [
    {
      id: 'var-pepper-birdseye',
      crop_id: 'crop-pepper-01',
      organization_id: org1Id,
      name: "Bird's Eye / Piment Pili Pili",
      code: 'PIM-BEYE',
      maturity_days_min: 90,
      maturity_days_max: 120,
      expected_yield_per_ha_tons: 8.5,
      heat_tolerance: 'HIGH',
      disease_resistances: 'CMV, Flétrissement bactérien',
      characteristics: 'Petits fruits rouges très piquants (50,000-100,000 Scoville), séchage aisé, floraison continue.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'var-pepper-s17',
      crop_id: 'crop-pepper-01',
      organization_id: org1Id,
      name: 'S17 / Habanero amélioré',
      code: 'PIM-S17',
      maturity_days_min: 110,
      maturity_days_max: 140,
      expected_yield_per_ha_tons: 14.0,
      heat_tolerance: 'VERY_HIGH',
      disease_resistances: 'Anthracnose, Phytophthora capsici',
      characteristics: 'Fruits côtelés orange à rouge vif, arôme très intense, pulpe épaisse, haute résistance au transport routier.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'var-cassava-bonoua',
      crop_id: 'crop-cassava-01',
      organization_id: org1Id,
      name: 'Bonoua (Améliorée)',
      code: 'CAS-BON',
      maturity_days_min: 240,
      maturity_days_max: 300,
      expected_yield_per_ha_tons: 35.0,
      heat_tolerance: 'HIGH',
      disease_resistances: 'Mosaïque africaine du manioc (CMD), Bactériose vasculaire',
      characteristics: 'Chair blanche à haute teneur en amidon (32%), idéale pour la transformation en gari et attiéké.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'var-cassava-bocou1',
      crop_id: 'crop-cassava-01',
      organization_id: org1Id,
      name: 'Bocou 1',
      code: 'CAS-BOC1',
      maturity_days_min: 270,
      maturity_days_max: 360,
      expected_yield_per_ha_tons: 40.0,
      heat_tolerance: 'HIGH',
      disease_resistances: 'CMD tolérante',
      characteristics: 'Grosses racines pivotantes groupées, excellente tenue en sol sableux de Kindia.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'var-watermelon-kaolack',
      crop_id: 'crop-watermelon-01',
      organization_id: org1Id,
      name: 'Kaolack',
      code: 'WAT-KAO',
      maturity_days_min: 75,
      maturity_days_max: 85,
      expected_yield_per_ha_tons: 30.0,
      heat_tolerance: 'VERY_HIGH',
      disease_resistances: 'Fusariose vasculaire race 1',
      characteristics: 'Fruits ronds zébrés vert clair et vert foncé, chair rouge vif très sucrée (11° Brix), écorce résistante.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'var-watermelon-crimson',
      crop_id: 'crop-watermelon-01',
      organization_id: org1Id,
      name: 'Crimson Sweet',
      code: 'WAT-CRIM',
      maturity_days_min: 80,
      maturity_days_max: 90,
      expected_yield_per_ha_tons: 32.0,
      heat_tolerance: 'HIGH',
      disease_resistances: 'Anthracnose, Fusariose',
      characteristics: 'Fruits ovales pesant 8-12 kg, graines foncées, chair croquante et rafraîchissante.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const v of varietiesSeed) {
    if (!state.crop_varieties.find((e: any) => e.id === v.id)) {
      state.crop_varieties.push(v);
    }
  }

  // 3. Agricultural Seasons
  const seasonsSeed = [
    {
      id: 'season-2026-seche',
      organization_id: org1Id,
      name: 'Grande Saison Sèche 2026',
      code: 'SEAS-2026-DRY',
      start_date: '2026-01-01',
      end_date: '2026-05-31',
      status: 'ACTIVE',
      description: 'Campagne sous irrigation motorisée (goutte-à-goutte et aspersion), forte intensité maraîchère.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'season-2026-pluies',
      organization_id: org1Id,
      name: 'Grande Saison des Pluies 2026',
      code: 'SEAS-2026-WET',
      start_date: '2026-06-01',
      end_date: '2026-11-30',
      status: 'ACTIVE',
      description: 'Saison pluviale ouest-africaine : cultures pluviales vivrières et maraîchage sur billons hauts.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const s of seasonsSeed) {
    if (!state.agricultural_seasons.find((e: any) => e.id === s.id)) {
      state.agricultural_seasons.push(s);
    }
  }

  // 4. Agricultural Methods
  const methodsSeed = [
    {
      id: 'meth-plant-nursery',
      organization_id: org1Id,
      method_type: 'PLANTING',
      name: 'Repiquage depuis pépinière (mottes)',
      description: 'Élevage des jeunes plants en plaques alvéolées 30 jours, puis repiquage aux heures fraîches.',
      equipment_needed: 'Transplantoir, plaques alvéolées, ombrière',
      labor_intensity: 'HIGH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'meth-plant-direct',
      organization_id: org1Id,
      method_type: 'PLANTING',
      name: 'Semis direct en poquets',
      description: 'Dépôt de 2 à 3 graines par trou avec démariage au stade 3-4 feuilles.',
      equipment_needed: 'Plantoir manuel, cordeaux de traçage',
      labor_intensity: 'MEDIUM',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'meth-plant-cuttings',
      organization_id: org1Id,
      method_type: 'PLANTING',
      name: 'Bouturage sur billons',
      description: 'Enfouissement incliné de tiges de 20-25cm taillées avec 4-6 nœuds sains sur billons surélevés.',
      equipment_needed: 'Machettes désinfectées, billonneuse',
      labor_intensity: 'HIGH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'meth-harv-selective',
      organization_id: org1Id,
      method_type: 'HARVESTING',
      name: 'Récolte manuelle sélective au sécateur',
      description: 'Coupe du pédoncule au sécateur propre sans meurtrir la plante, tri simultané des fruits.',
      equipment_needed: 'Sécateurs inox, cagettes aérées 20kg, gants coton',
      labor_intensity: 'HIGH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'meth-harv-uproot',
      organization_id: org1Id,
      method_type: 'HARVESTING',
      name: 'Arrachage manuel et coupe des tubercules',
      description: 'Soulèvement délicat à la fourche-bêche pour éviter les blessures mécaniques des tubercules.',
      equipment_needed: 'Fourches-bêches renforcées, couteaux d’équeutage',
      labor_intensity: 'HIGH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const m of methodsSeed) {
    if (!state.agricultural_methods.find((e: any) => e.id === m.id)) {
      state.agricultural_methods.push(m);
    }
  }

  // 5. Suppliers
  const suppliersSeed = [
    {
      id: 'sup-kindia-comptoir',
      organization_id: org1Id,
      name: 'Comptoir Agricole de Kindia',
      category: 'FERTILIZERS',
      contact_person: 'Mamadou Saliou Diallo',
      email: 'comptoir.kindia@agri-supply.gn',
      phone: '+224 622 10 20 30',
      address: 'Route Nationale 1, Face Grand Marché',
      locality: 'Kindia Centre',
      rating: 4.8,
      notes: 'Fournisseur agréé engrais minéraux NPK certifiés et amendements organiques.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'sup-tropical-seeds',
      organization_id: org1Id,
      name: 'Semences Tropicales SARL',
      category: 'SEEDS',
      contact_person: 'Dr. Kadiatou Baldé',
      email: 'contact@semences-tropicales.gn',
      phone: '+224 628 40 50 60',
      address: 'Immeuble Koubia, Kaloum',
      locality: 'Conakry',
      rating: 4.9,
      notes: 'Importateur officiel de semences maraîchères sélectionnées et certifiées pour l’Afrique de l’Ouest.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'sup-phyto-express',
      organization_id: org1Id,
      name: 'Phyto-Guinée Express & Irrigation',
      category: 'IRRIGATION',
      contact_person: 'Oumar Camara',
      email: 'service@phyto-guinee.gn',
      phone: '+224 620 90 80 70',
      address: 'Zone Industrielle Matoto',
      locality: 'Conakry',
      rating: 4.6,
      notes: 'Matériel d’irrigation goutte-à-goutte, motopompes et bio-pesticides homologués.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const sup of suppliersSeed) {
    if (!state.suppliers.find((e: any) => e.id === sup.id)) {
      state.suppliers.push(sup);
    }
  }

  // 6. Agricultural Inputs
  const inputsSeed = [
    {
      id: 'inp-npk-151515',
      organization_id: org1Id,
      name: 'Engrais NPK 15-15-15 (Sac 50kg)',
      category: 'FERTILIZER',
      unit: 'BAG_50KG',
      default_dosage: '250 kg/ha',
      supplier_id: 'sup-kindia-comptoir',
      cost_per_unit: 380000,
      currency: 'GNF',
      stock_quantity: 120,
      safety_precautions: 'Stocker à l’abri de l’humidité, port de gants lors de l’épandage.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'inp-seed-s17',
      organization_id: org1Id,
      name: 'Semences Piment S17 Certifiées (Boîte 100g)',
      category: 'SEED',
      unit: 'PACK_100G',
      default_dosage: '150 g/ha en pépinière',
      supplier_id: 'sup-tropical-seeds',
      cost_per_unit: 185000,
      currency: 'GNF',
      stock_quantity: 35,
      safety_precautions: 'Taux de germination > 92%. Conserver au frais et au sec.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'inp-bio-neem',
      organization_id: org1Id,
      name: 'Bio-pesticide Extrait de Neem 1% (Bidon 5L)',
      category: 'PESTICIDE',
      unit: 'LITER',
      default_dosage: '3 L/ha dilué dans 400L d’eau',
      supplier_id: 'sup-phyto-express',
      cost_per_unit: 140000,
      currency: 'GNF',
      stock_quantity: 45,
      safety_precautions: 'Répulsif et antiappétant naturel, respecte les pollinisateurs.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const inp of inputsSeed) {
    if (!state.agricultural_inputs.find((e: any) => e.id === inp.id)) {
      state.agricultural_inputs.push(inp);
    }
  }

  // 7. Agricultural Equipment
  const equipmentSeed = [
    {
      id: 'eq-pump-honda',
      organization_id: org1Id,
      name: 'Motopompe Honda WB30XT 3 pouces (1100 L/min)',
      equipment_type: 'PUMP',
      serial_number: 'HND-WB30-2024-88',
      status: 'AVAILABLE',
      maintenance_schedule: 'Vidange huile moteur toutes les 50h, nettoyage crépine hebdomadaire.',
      notes: 'Pompe d’alimentation principale pour le réservoir tampon de Friguiagbé.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'eq-tractor-nh',
      organization_id: org1Id,
      name: 'Tracteur New Holland TT4.75 75CV 4RM',
      equipment_type: 'TRACTOR',
      serial_number: 'NH-TT4-9021',
      status: 'AVAILABLE',
      maintenance_schedule: 'Graissage des rotules toutes les 20h de travail au champ.',
      notes: 'Équipé de charrue à disques et billonneuse 3 rangs.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'eq-sprayer-16l',
      organization_id: org1Id,
      name: 'Pulvérisateur à dos Matabi Super Agro 16L',
      equipment_type: 'SPRAYER',
      serial_number: 'MTB-16-04',
      status: 'AVAILABLE',
      maintenance_schedule: 'Rinçage triple à l’eau claire après chaque traitement.',
      notes: 'Buses coniques et miroirs en laiton traitées anti-corrosion.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const eq of equipmentSeed) {
    if (!state.agricultural_equipment.find((e: any) => e.id === eq.id)) {
      state.agricultural_equipment.push(eq);
    }
  }

  // 8. Field Teams
  const teamsSeed = [
    {
      id: 'team-knd-maraichage',
      organization_id: org1Id,
      name: 'Équipe Maraîchage & Piment Bloc A',
      leader_user_id: managerId,
      members_count: 8,
      skills: 'Repiquage délicat, Palissage, Conduite irrigation goutte-à-goutte, Récolte sélective',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'team-knd-phyto',
      organization_id: org1Id,
      name: 'Brigade Phytosanitaire & Traitement',
      leader_user_id: agronomistId,
      members_count: 4,
      skills: 'Dépistage précoce des bioagresseurs, Étalonnage pulvérisateurs, Gestion des EPI',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const tm of teamsSeed) {
    if (!state.field_teams.find((e: any) => e.id === tm.id)) {
      state.field_teams.push(tm);
    }
  }

  // 9. Production Campaigns
  const campaign1Id = 'c1111111-1111-1111-1111-111111111111';
  const campaign2Id = 'c2222222-2222-2222-2222-222222222222';
  const campaign3Id = 'c3333333-3333-3333-3333-333333333333';
  const campaign4Id = 'c4444444-4444-4444-4444-444444444444'; // Org Beta (Fouta)

  const campaignsSeed = [
    {
      id: campaign1Id,
      organization_id: org1Id,
      season_id: 'season-2026-pluies',
      name: 'Campagne Piment S17 — Friguiagbé 2026',
      code: 'CAMP-PIM-2026-01',
      farm_id: farm1Id,
      plot_id: plot1Id,
      crop_id: 'crop-pepper-01',
      crop_variety_id: 'var-pepper-s17',
      planned_area: 2.5,
      area_unit: 'HA',
      planting_window_start: '2026-08-01',
      planting_window_end: '2026-08-15',
      expected_harvest_start: '2026-10-01',
      expected_harvest_end: '2026-11-30',
      production_target_quantity: 18000,
      production_target_unit: 'KG',
      manager_user_id: managerId,
      field_team_id: 'team-knd-maraichage',
      status: 'HARVESTING',
      budget_code: 'BUD-2026-KND-PIM',
      budget_allocated: 35000000,
      budget_actual_spend: 21400000,
      budget_currency: 'GNF',
      planting_method_id: 'meth-plant-nursery',
      harvesting_method_id: 'meth-harv-selective',
      notes: 'Piment S17 sous irrigation goutte-à-goutte avec paillage plastique noir.',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: campaign2Id,
      organization_id: org1Id,
      season_id: 'season-2026-pluies',
      name: 'Campagne Manioc Bonoua — Friguiagbé 2026',
      code: 'CAMP-CAS-2026-01',
      farm_id: farm1Id,
      plot_id: plot1Id,
      crop_id: 'crop-cassava-01',
      crop_variety_id: 'var-cassava-bonoua',
      planned_area: 5.0,
      area_unit: 'HA',
      planting_window_start: '2026-06-15',
      planting_window_end: '2026-07-05',
      expected_harvest_start: '2027-02-15',
      expected_harvest_end: '2027-04-30',
      production_target_quantity: 45000,
      production_target_unit: 'KG',
      manager_user_id: managerId,
      field_team_id: 'team-knd-maraichage',
      status: 'IN_PROGRESS',
      budget_code: 'BUD-2026-KND-CAS',
      budget_allocated: 28000000,
      budget_actual_spend: 14500000,
      budget_currency: 'GNF',
      planting_method_id: 'meth-plant-cuttings',
      harvesting_method_id: 'meth-harv-uproot',
      notes: 'Boutures saines issues du champ semencier certifié de Kindia.',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: campaign3Id,
      organization_id: org1Id,
      season_id: 'season-2026-seche',
      name: 'Campagne Pastèque Kaolack — Contre-saison 2026',
      code: 'CAMP-WAT-2026-01',
      farm_id: farm1Id,
      plot_id: plot1Id,
      crop_id: 'crop-watermelon-01',
      crop_variety_id: 'var-watermelon-kaolack',
      planned_area: 3.0,
      area_unit: 'HA',
      planting_window_start: '2026-10-20',
      planting_window_end: '2026-11-05',
      expected_harvest_start: '2027-01-10',
      expected_harvest_end: '2027-01-30',
      production_target_quantity: 30000,
      production_target_unit: 'KG',
      manager_user_id: agronomistId,
      field_team_id: 'team-knd-maraichage',
      status: 'PLANNING',
      budget_code: 'BUD-2026-KND-WAT',
      budget_allocated: 22000000,
      budget_actual_spend: 1200000,
      budget_currency: 'GNF',
      planting_method_id: 'meth-plant-direct',
      harvesting_method_id: 'meth-harv-selective',
      notes: 'Semis direct en poquets amendés au compost mur de litière.',
      created_by_user_id: agronomistId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: campaign4Id,
      organization_id: org2Id, // Org Beta for tenant isolation
      season_id: 'season-2026-pluies',
      name: "Campagne Piment Bird's Eye — Fouta 2026",
      code: 'CAMP-BEYE-FOUTA-01',
      farm_id: farm2Id,
      plot_id: plot2Id,
      crop_id: 'crop-pepper-01',
      crop_variety_id: 'var-pepper-birdseye',
      planned_area: 1.5,
      area_unit: 'HA',
      planting_window_start: '2026-07-01',
      planting_window_end: '2026-07-20',
      expected_harvest_start: '2026-10-01',
      expected_harvest_end: '2026-12-15',
      production_target_quantity: 12000,
      production_target_unit: 'KG',
      status: 'IN_PROGRESS',
      budget_allocated: 20000000,
      budget_currency: 'GNF',
      notes: 'Pili-pili séché au soleil de Timbi-Madina.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const cmp of campaignsSeed) {
    if (!state.production_campaigns.find((e: any) => e.id === cmp.id)) {
      state.production_campaigns.push(cmp);
    }
  }

  // 10. Operations (Covering all 9 operational record types!)
  const op1Id = 'op111111-1111-1111-1111-111111111111'; // Land preparation
  const op2Id = 'op222222-2222-2222-2222-222222222222'; // Planting
  const op3Id = 'op333333-3333-3333-3333-333333333333'; // Irrigation
  const op4Id = 'op444444-4444-4444-4444-444444444444'; // Fertilization
  const op5Id = 'op555555-5555-5555-5555-555555555555'; // Pest & Disease monitoring
  const op6Id = 'op666666-6666-6666-6666-666666666666'; // Weeding
  const op7Id = 'op777777-7777-7777-7777-777777777777'; // Maintenance
  const op8Id = 'op888888-8888-8888-8888-888888888888'; // Harvest 1 (First flush)
  const op9Id = 'op999999-9999-9999-9999-999999999999'; // Harvest 2 (Second flush - scheduled)
  const op10Id = 'op101010-1010-1010-1010-101010101010'; // Post-harvest handling

  const calEventHarvest1Id = 'e5555555-5555-5555-5555-555555555555';
  const calEventHarvest2Id = 'e6666666-6666-6666-6666-666666666666';

  const operationsSeed = [
    {
      id: op1Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'LAND_PREPARATION',
      title: 'Labourage profond & billonnage 50cm',
      description: 'Décompactage au tracteur, enfouissement fumier décomposé 10 t/ha et confection billons.',
      planned_date: '2026-08-02',
      actual_date: '2026-08-03',
      status: 'COMPLETED',
      planned_quantity: 2.5,
      actual_quantity: 2.5,
      quantity_unit: 'HA',
      labor_workers_count: 4,
      labor_hours: 16,
      cost_amount: 1450000,
      cost_currency: 'GNF',
      responsible_user_id: managerId,
      equipment_id: 'eq-tractor-nh',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op2Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'PLANTING',
      title: 'Repiquage pépinière plants Piment S17',
      description: 'Transplantation manuelle des mottes racinaires à 50x50 cm sous paillage plastique.',
      planned_date: '2026-08-10',
      actual_date: '2026-08-10',
      status: 'COMPLETED',
      planned_quantity: 25000,
      actual_quantity: 25400,
      quantity_unit: 'PLANTS',
      labor_workers_count: 8,
      labor_hours: 32,
      cost_amount: 2500000,
      cost_currency: 'GNF',
      responsible_user_id: opsStaffId,
      field_team_id: 'team-knd-maraichage',
      input_id: 'inp-seed-s17',
      input_quantity_used: 15,
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op3Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'IRRIGATION',
      title: 'Mise en eau réseau goutte-à-goutte 2L/h',
      description: 'Vérification pression 1.2 bar, filtration à disque et purge des rampes secondaires.',
      planned_date: '2026-08-15',
      actual_date: '2026-08-15',
      status: 'COMPLETED',
      labor_workers_count: 2,
      labor_hours: 6,
      cost_amount: 250000,
      cost_currency: 'GNF',
      responsible_user_id: opsStaffId,
      equipment_id: 'eq-pump-honda',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op4Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'FERTILIZATION',
      title: 'Fertilisation d’entretien NPK 15-15-15',
      description: 'Apport au pied sous goutteurs au stade floraison / première nouaison.',
      planned_date: '2026-08-25',
      actual_date: '2026-08-26',
      status: 'COMPLETED',
      planned_quantity: 375,
      actual_quantity: 375,
      quantity_unit: 'KG',
      labor_workers_count: 4,
      labor_hours: 12,
      cost_amount: 2850000,
      cost_currency: 'GNF',
      responsible_user_id: agronomistId,
      input_id: 'inp-npk-151515',
      input_batch_number: 'LOT-NPK-2026-KND',
      input_quantity_used: 7.5, // 7.5 sacs de 50kg
      created_by_user_id: agronomistId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op5Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'PEST_DISEASE_MONITORING',
      title: 'Dépistage phytosanitaire aleurodes & thrips',
      description: 'Comptage sur 50 plants témoins en diagonale. Présence mineure d’aleurodes sans dégât économique.',
      planned_date: '2026-09-12',
      actual_date: '2026-09-12',
      status: 'COMPLETED',
      pest_or_disease_name: 'Aleurode du tabac (Bemisia tabaci)',
      incidence_rate_pct: 3.5,
      severity_level: 'LOW',
      observation_notes: 'Pulvérisation préventive au bio-neem préconisée en début de soirée.',
      responsible_user_id: agronomistId,
      field_team_id: 'team-knd-phyto',
      input_id: 'inp-bio-neem',
      input_quantity_used: 6,
      created_by_user_id: agronomistId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op6Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'WEEDING',
      title: 'Désherbage manuel des passe-pieds & bordures',
      description: 'Arrachage manuel des adventices le long des lignes de goutte-à-goutte.',
      planned_date: '2026-09-20',
      actual_date: '2026-09-20',
      status: 'COMPLETED',
      labor_workers_count: 6,
      labor_hours: 24,
      cost_amount: 900000,
      cost_currency: 'GNF',
      responsible_user_id: opsStaffId,
      field_team_id: 'team-knd-maraichage',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op7Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'MAINTENANCE',
      title: 'Ébourgeonnage et tuteurage des plants',
      description: 'Maintien de la charpente des plants vigoureux pour éviter le contact des piments avec le sol.',
      planned_date: '2026-09-28',
      actual_date: '2026-09-28',
      status: 'COMPLETED',
      labor_workers_count: 5,
      labor_hours: 20,
      cost_amount: 750000,
      cost_currency: 'GNF',
      responsible_user_id: opsStaffId,
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op8Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'HARVEST',
      title: 'Récolte Première Passe — Piment Rouge S17',
      description: 'Cueillette sélective des fruits rouges fermes arrivés à 100% de coloration.',
      planned_date: '2026-10-02',
      actual_date: '2026-10-02',
      status: 'COMPLETED',
      planned_quantity: 1200,
      actual_quantity: 1250,
      quantity_unit: 'KG',
      labor_workers_count: 8,
      labor_hours: 32,
      cost_amount: 1600000,
      cost_currency: 'GNF',
      responsible_user_id: managerId,
      field_team_id: 'team-knd-maraichage',
      linked_calendar_event_id: calEventHarvest1Id,
      observation_notes: 'Qualité excellente, fermeté irréprochable, taux de rebut inférieur à 5%.',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op9Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'HARVEST',
      title: 'Récolte Deuxième Passe — Pleine maturité',
      description: 'Deuxième passage sur l’ensemble du bloc A1, prévision de fort volume.',
      planned_date: '2026-10-14',
      status: 'PLANNED',
      planned_quantity: 2500,
      quantity_unit: 'KG',
      labor_workers_count: 10,
      labor_hours: 40,
      cost_amount: 2000000,
      cost_currency: 'GNF',
      responsible_user_id: managerId,
      field_team_id: 'team-knd-maraichage',
      linked_calendar_event_id: calEventHarvest2Id,
      observation_notes: 'Mobiliser 120 cagettes aérées désinfectées la veille.',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: op10Id,
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_type: 'POST_HARVEST',
      title: 'Triage, calibrage export & mise en cagettes',
      description: 'Ventilation sous hangar ombragé, élimination des fruits fendus et pesée individuelle.',
      planned_date: '2026-10-03',
      actual_date: '2026-10-03',
      status: 'COMPLETED',
      planned_quantity: 1250,
      actual_quantity: 1185,
      quantity_unit: 'KG',
      labor_workers_count: 4,
      labor_hours: 16,
      cost_amount: 800000,
      cost_currency: 'GNF',
      responsible_user_id: opsStaffId,
      observation_notes: '1,185 kg classés Grade A Export, 65 kg orientés marché local Kindia.',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const op of operationsSeed) {
    if (!state.campaign_operations.find((e: any) => e.id === op.id)) {
      state.campaign_operations.push(op);
    }
  }

  // 11. Partial Harvests (Multiple harvest events per campaign preserving history)
  const harvestsSeed = [
    {
      id: 'h1111111-1111-1111-1111-111111111111',
      organization_id: org1Id,
      campaign_id: campaign1Id,
      operation_id: op8Id,
      harvest_batch_number: 'HARV-PIM-2026-001',
      harvest_date: '2026-10-02',
      quantity_harvested: 1250,
      quantity_unit: 'KG',
      quality_grade: 'GRADE_A',
      loss_quantity: 65,
      storage_location: 'Hangar de conditionnement climatisé Friguiagbé',
      moisture_pct: 78.5,
      brix_level: 9.2,
      workers_count: 8,
      supervisor_user_id: managerId,
      destination: 'EXPORT',
      notes: 'Première passe de récolte. Fruits très bien colorés, conforme cahier des charges export.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'h2222222-2222-2222-2222-222222222222',
      organization_id: org1Id,
      campaign_id: campaign1Id,
      harvest_batch_number: 'HARV-PIM-2026-002',
      harvest_date: '2026-10-08',
      quantity_harvested: 2100,
      quantity_unit: 'KG',
      quality_grade: 'GRADE_A',
      loss_quantity: 85,
      storage_location: 'Hangar de conditionnement climatisé Friguiagbé',
      moisture_pct: 76.8,
      brix_level: 9.5,
      workers_count: 10,
      supervisor_user_id: managerId,
      destination: 'EXPORT',
      notes: 'Deuxième passe partielle intermédiaire. Très fort rendement constaté.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const h of harvestsSeed) {
    if (!state.campaign_harvests.find((e: any) => e.id === h.id)) {
      state.campaign_harvests.push(h);
    }
  }

  // 12. Link calendar events for harvest operations into normal_calendar_events
  const agriCalendarEvents = [
    {
      id: calEventHarvest1Id,
      organization_id: org1Id,
      title: 'Récolte Piment S17 — 1ère Passe (Friguiagbé)',
      description: 'Opération agricole de récolte manuelle sélective sur parcelle A1.',
      event_type: 'TASK',
      status: 'COMPLETED',
      priority: 'HIGH',
      start_datetime: '2026-10-02T07:00:00Z',
      end_datetime: '2026-10-02T13:00:00Z',
      all_day: false,
      timezone: 'Africa/Conakry',
      assigned_to_user_id: managerId,
      farm_id: farm1Id,
      plot_id: plot1Id,
      linked_campaign_id: campaign1Id,
      linked_master_operation_id: op8Id,
      notes: 'Lien direct vers Opération Agricole op888888. 1,250 kg récoltés.',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    },
    {
      id: calEventHarvest2Id,
      organization_id: org1Id,
      title: 'Récolte Piment S17 — 2ème Passe (Friguiagbé)',
      description: 'Opération agricole programmée : cueillette pleine maturité bloc A1.',
      event_type: 'TASK',
      status: 'PENDING',
      priority: 'URGENT',
      start_datetime: '2026-10-14T07:00:00Z',
      end_datetime: '2026-10-14T14:00:00Z',
      all_day: false,
      timezone: 'Africa/Conakry',
      assigned_to_user_id: managerId,
      farm_id: farm1Id,
      plot_id: plot1Id,
      linked_campaign_id: campaign1Id,
      linked_master_operation_id: op9Id,
      notes: 'Lien direct vers Opération Agricole op999999. Prévoir 10 ouvriers.',
      created_by_user_id: managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    }
  ];

  for (const ace of agriCalendarEvents) {
    if (!state.normal_calendar_events.find((e: any) => e.id === ace.id)) {
      state.normal_calendar_events.push(ace);
    }
  }
}

function applyCommercialSeed(state: SchemaState) {
  const org1Id = '11111111-1111-1111-1111-111111111111'; // Kindia
  const org2Id = '22222222-2222-2222-2222-222222222222'; // Fouta (Org Beta)
  const commManagerId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'; // Mamadou Touré
  const farm1Id = 'f1111111-1111-1111-1111-111111111111';
  const campaign1Id = 'camp-pepper-s17-01';

  // 1. Seed Fictional Demo Buyers (strictly marked as demo records)
  const buyersSeed = [
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      organization_id: org1Id,
      name: 'SOCOPRO Export SARL',
      registration_number: 'RCCM/GC-KAL/2019/B/14298',
      buyer_type: 'EXPORTER',
      country_code: 'GN',
      market: 'Exportation Union Européenne (Rungis / Rotterdam)',
      locality: 'Conakry (Almamya)',
      address: 'Avenue de la République, Immeuble Almamya, Kaloum',
      contacts: [
        {
          id: 'ct-socopro-1',
          fullName: 'Thierno Barry',
          role: 'Directeur Commercial & Achats',
          email: 'achats@socopro-guinee.com',
          phone: '+224 622 11 22 33',
          isPrimary: true,
          notes: 'Interlocuteur contractuel principal pour les exportations horticoles.'
        }
      ],
      products_of_interest: ['Piment S17 Habanero Séché', 'Pastèque Kaolack Calibre 1'],
      product_specifications: 'Grade A Export, taux d’humidité < 11% pour séché, résidus phytosanitaires conformes norme UE, zéro corps étranger.',
      required_annual_quantity_tons: 150,
      target_price: 45000,
      target_currency: 'GNF',
      target_unit: 'KG',
      preferred_delivery_window: 'Septembre à Décembre 2026',
      packaging_requirements: 'Cartons alvéolés 5kg ventilés, marqués avec code lot et étiquette traçabilité QR.',
      certifications_required: ['GLOBALG.A.P.', 'Certificat Phytosanitaire ONPQ Guinée'],
      communications: [
        {
          id: 'com-socopro-1',
          date: '2026-09-15T10:00:00Z',
          type: 'OFFICIAL_OFFER',
          authorName: 'Mamadou Touré (Commercial Mgr)',
          summary: 'Envoi proposition commerciale ferme pour 25 tonnes de Piment S17 séché.',
          nextSteps: 'Validation des termes de paiement FOB Conakry.'
        },
        {
          id: 'com-socopro-2',
          date: '2026-10-01T14:30:00Z',
          type: 'CONTRACT_SIGNING',
          authorName: 'Mamadou Touré (Commercial Mgr)',
          summary: 'Signature du contrat de vente ORD-2026-PIM-001 (FOB Conakry).',
          nextSteps: 'Suivi des récoltes à Friguiagbé et contrôle qualité ONPQ.'
        }
      ],
      lead_status: 'ACTIVE_CONTRACT',
      relationship_owner_id: commManagerId,
      relationship_owner_name: 'Mamadou Touré',
      source_of_contact: 'Salon International de l’Agriculture (SIA Paris 2025)',
      verification_status: 'VERIFIED',
      notes: 'Acheteur exportateur historique certifié. Paiement sécurisé via lettre de crédit ou acompte 30%.',
      is_demo_record: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'b2222222-2222-2222-2222-222222222222',
      organization_id: org1Id,
      name: 'Coopérative Agro-Alimentaire Fouta',
      registration_number: 'RCCM/LAB/2021/A/05412',
      buyer_type: 'WHOLESALER',
      country_code: 'GN',
      market: 'Distribution Régionale Moyenne-Guinée & Marchés Hebdomadaires',
      locality: 'Labé',
      address: 'Grand Marché de Labé, Hangar B',
      contacts: [
        {
          id: 'ct-fouta-1',
          fullName: 'Mme Aissatou Sow',
          role: 'Responsable Approvisionnement Maraîcher',
          email: 'aissatou.sow@coopfouta.gn',
          phone: '+224 628 44 55 66',
          isPrimary: true,
          notes: 'Achats réguliers hebdomadaires pour approvisionner le réseau de grossistes du Fouta.'
        }
      ],
      products_of_interest: ["Piment Pili Pili (Bird's Eye)", 'Pastèque Kaolack'],
      product_specifications: 'Fruits frais fermes ou piments séchés entiers sans brisure.',
      required_annual_quantity_tons: 45,
      target_price: 52000,
      target_currency: 'GNF',
      target_unit: 'KG',
      preferred_delivery_window: 'Toute l’année avec pic en fin d’année',
      packaging_requirements: 'Sacs polypropylène tissé 25kg propres ou cagettes plastiques consignées.',
      certifications_required: ['Agrément Sanitaire Local'],
      communications: [
        {
          id: 'com-fouta-1',
          date: '2026-10-05T11:00:00Z',
          type: 'PHONE_CALL',
          authorName: 'Mamadou Touré',
          summary: 'Demande de devis pour 5 tonnes de Piment Bird\'s Eye séché.',
          nextSteps: 'Envoi cotation formelle ORD-2026-BEYE-003.'
        }
      ],
      lead_status: 'QUALIFIED',
      relationship_owner_id: commManagerId,
      relationship_owner_name: 'Mamadou Touré',
      source_of_contact: 'Chambre Régionale de Commerce de Labé',
      verification_status: 'VERIFIED',
      notes: 'Partenaire fiable avec règlement comptant à la réception en magasin.',
      is_demo_record: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'b3333333-3333-3333-3333-333333333333',
      organization_id: org1Id,
      name: 'Minoterie Moderne de Conakry (MMC)',
      registration_number: 'RCCM/GC-DUB/2018/B/08123',
      buyer_type: 'PROCESSOR',
      country_code: 'GN',
      market: 'Transformation Agro-Industrielle (Amidon & Farine Pâtissière)',
      locality: 'Zone Industrielle Kagbélen (Dubréka)',
      address: 'Route Nationale 1, Km 36, Dubréka',
      contacts: [
        {
          id: 'ct-mmc-1',
          fullName: 'Jean-Pierre Loua',
          role: 'Directeur d’Usine & Approvisionnements',
          email: 'jploua@minoterie-conakry.com',
          phone: '+224 621 77 88 99',
          isPrimary: true,
          notes: 'Responsable réception matière première et contrôle de la teneur en matière sèche.'
        }
      ],
      products_of_interest: ['Manioc Frais Variété Bonoua'],
      product_specifications: 'Tubercules frais non blessés, arrachés depuis moins de 48 heures, taux de matière sèche > 32%, amidon > 24%.',
      required_annual_quantity_tons: 500,
      target_price: 12000,
      target_currency: 'GNF',
      target_unit: 'KG',
      preferred_delivery_window: 'Novembre 2026 à Avril 2027',
      packaging_requirements: 'Vrac benne basculante ou camions ridelles bâchés 10 tonnes.',
      certifications_required: ['Bonnes Pratiques Agricoles (BPA)'],
      communications: [
        {
          id: 'com-mmc-1',
          date: '2026-10-10T09:00:00Z',
          type: 'IN_PERSON_MEETING',
          authorName: 'Mamadou Touré & Mariama Camara',
          summary: 'Visite d’usine à Kagbélen. Accord de principe sur un contrat pluriannuel de 60 tonnes pour la campagne Bonoua.',
          nextSteps: 'Finalisation des spécifications de pesée au pont-bascule.'
        }
      ],
      lead_status: 'ACTIVE_CONTRACT',
      relationship_owner_id: commManagerId,
      relationship_owner_name: 'Mamadou Touré',
      source_of_contact: 'Fédération Patronale des Industries de Guinée',
      verification_status: 'VERIFIED',
      notes: 'Capacité de transformation de 20 tonnes de manioc frais par jour. Paiement sous 30 jours fin de mois.',
      is_demo_record: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'b4444444-4444-4444-4444-444444444444',
      organization_id: org1Id,
      name: 'AfriTrade Europe BV',
      registration_number: 'NL-KVK-84920194',
      buyer_type: 'IMPORTER',
      country_code: 'NL',
      market: 'Marché Communautaire Européen (Rotterdam / Anvers / Hambourg)',
      locality: 'Rotterdam',
      address: 'Havenbedrijf Rotterdam, Westblaak 180',
      contacts: [
        {
          id: 'ct-afritrade-1',
          fullName: 'Hendrik van Dijk',
          role: 'Head of Tropical Sourcing',
          email: 'h.vandijk@afritrade-eu.nl',
          phone: '+31 10 456 7890',
          isPrimary: true,
          notes: 'Négociateur import épices et piments tropicaux certifiés.'
        }
      ],
      products_of_interest: ['Piment S17 Habanero Séché', 'Cossettes de Manioc Séchées'],
      product_specifications: 'Qualité alimentaire UE, zéro aflatoxine, emballage scellé sous atmosphère protectrice.',
      required_annual_quantity_tons: 80,
      target_price: 5.2,
      target_currency: 'EUR',
      target_unit: 'KG',
      preferred_delivery_window: 'Conteneurs 20 pieds en Novembre et Décembre',
      packaging_requirements: 'Sacs sous vide 10kg dans cartons renforcés palettisés Euro-Palette.',
      certifications_required: ['HACCP', 'GLOBALG.A.P.', 'Certificat Phytosanitaire UE'],
      communications: [
        {
          id: 'com-afritrade-1',
          date: '2026-10-02T15:00:00Z',
          type: 'EMAIL',
          authorName: 'Mamadou Touré',
          summary: 'Envoi fiches techniques et résultats labo d\'analyse résidus.',
          nextSteps: 'En attente retour échantillon 5kg expédié par fret aérien.'
        }
      ],
      lead_status: 'NEGOTIATION',
      relationship_owner_id: commManagerId,
      relationship_owner_name: 'Mamadou Touré',
      source_of_contact: 'Salon Fruit Logistica Berlin',
      verification_status: 'VERIFIED',
      notes: 'Client stratégique pour l’accès direct aux grossistes d’Europe du Nord sans intermédiaires.',
      is_demo_record: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    // Org Beta Buyer for Tenant Isolation
    {
      id: 'b9999999-9999-9999-9999-999999999999',
      organization_id: org2Id, // Org Beta
      name: 'Dakar Agro Négoce SUARL',
      registration_number: 'SN-DKR-2020-B-119',
      buyer_type: 'WHOLESALER',
      country_code: 'SN',
      market: 'Sénégal & Sous-Région Ouest-Africaine',
      locality: 'Dakar',
      contacts: [
        {
          id: 'ct-dakar-1',
          fullName: 'Modou Ndiaye',
          role: 'Directeur Général',
          email: 'mndiaye@dakar-agro.sn',
          phone: '+221 77 123 45 67',
          isPrimary: true
        }
      ],
      products_of_interest: ['Piment Frais', 'Oignon'],
      target_price: 3200,
      target_currency: 'XOF',
      target_unit: 'KG',
      certifications_required: ['Phytosanitaire CEDEAO'],
      communications: [],
      lead_status: 'QUALIFIED',
      source_of_contact: 'Réseau Professionnel Ouest-Africain',
      verification_status: 'VERIFIED',
      is_demo_record: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const b of buyersSeed) {
    if (!state.buyers.find((e: any) => e.id === b.id)) {
      state.buyers.push(b);
    }
  }

  // 2. Seed Commercial Orders
  const order1Id = 'ord-2026-pim-001';
  const order2Id = 'ord-2026-cas-001';
  const order3Id = 'ord-2026-beye-003';
  const calEventOrder1Id = 'cal-ord-2026-pim-001';

  const ordersSeed = [
    {
      id: order1Id,
      organization_id: org1Id,
      order_number: 'ORD-2026-PIM-001',
      buyer_id: 'b1111111-1111-1111-1111-111111111111',
      buyer_name: 'SOCOPRO Export SARL',
      buyer_country: 'Guinée (Exportation UE)',
      order_type: 'ACCEPTED_ORDER',
      status: 'CONFIRMED',
      incoterm: 'FOB',
      delivery_destination: 'Port Autonome de Conakry - Quai Conteneurs Frigorifiques',
      delivery_window_start: '2026-10-25',
      delivery_window_end: '2026-10-30',
      currency: 'GNF',
      total_amount: 1125000000,
      required_documents: [
        'Facture Commerciale Définitive',
        'Certificat d’Origine Guinée',
        'Certificat Phytosanitaire ONPQ Guinée',
        'Bordereau de Livraison / Connaissement Maritime (BL)'
      ],
      payment_terms: '30% à la confirmation du contrat, 70% contre remise du connaissement BL.',
      payment_milestones: [
        {
          id: 'pm-1',
          milestoneName: 'Acompte de confirmation 30%',
          percentage: 30,
          amount: 337500000,
          dueDate: '2026-10-05',
          isPaid: true,
          paidDate: '2026-10-04'
        },
        {
          id: 'pm-2',
          milestoneName: 'Solde 70% à l\'embarquement Port de Conakry',
          percentage: 70,
          amount: 787500000,
          dueDate: '2026-10-30',
          isPaid: false
        }
      ],
      lines: [
        {
          id: 'line-pim-001-1',
          crop_id: 'crop-pepper-01',
          crop_name: 'Piment / Hot Pepper',
          crop_variety_id: 'var-pepper-s17',
          crop_variety_name: 'S17 / Habanero amélioré',
          specifications: 'Piment séché entier calibré Grade A, humidité max 11%, zéro résidu chimique non homologué',
          ordered_quantity: 25000,
          unit: 'KG',
          quantity_tons: 25.0,
          unit_price: 45000,
          total_price: 1125000000,
          reserved_quantity_tons: 15.0, // 15 tonnes allouées sur la campagne Friguiagbé
          allocated_farm_ids: [farm1Id],
          allocated_campaign_ids: [campaign1Id],
          quality_grade: 'GRADE_A_PREMIUM',
          packaging_type: 'Cartons 5kg ventilés neutres avec étiquette export'
        }
      ],
      linked_calendar_event_ids: [calEventOrder1Id],
      assigned_manager_id: commManagerId,
      assigned_manager_name: 'Mamadou Touré',
      contract_signed_date: '2026-10-01',
      notes: 'Contrat export prioritaire. Inspection ONPQ programmée avant expédition.',
      created_by_user_id: commManagerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: order2Id,
      organization_id: org1Id,
      order_number: 'ORD-2026-CAS-001',
      buyer_id: 'b3333333-3333-3333-3333-333333333333',
      buyer_name: 'Minoterie Moderne de Conakry (MMC)',
      buyer_country: 'Guinée (Dubréka)',
      order_type: 'ACCEPTED_ORDER',
      status: 'CONFIRMED',
      incoterm: 'DAP',
      delivery_destination: 'Usine Kagbélen (Pont-Bascule MMC)',
      delivery_window_start: '2026-11-15',
      delivery_window_end: '2026-12-15',
      currency: 'GNF',
      total_amount: 720000000,
      required_documents: ['Ticket de Pesée Pont-Bascule', 'Facture Commerciale'],
      payment_terms: 'Virement bancaire sous 30 jours après réception et analyse amidon.',
      payment_milestones: [
        {
          id: 'pm-cas-1',
          milestoneName: 'Paiement à 30 jours réception usine',
          percentage: 100,
          amount: 720000000,
          dueDate: '2026-12-30',
          isPaid: false
        }
      ],
      lines: [
        {
          id: 'line-cas-002-1',
          crop_id: 'crop-cassava-01',
          crop_name: 'Manioc / Cassava',
          crop_variety_id: 'var-cassava-bonoua',
          crop_variety_name: 'Bonoua',
          specifications: 'Tubercules frais non blessés récoltés < 48h, matière sèche > 32%',
          ordered_quantity: 60000,
          unit: 'KG',
          quantity_tons: 60.0,
          unit_price: 12000,
          total_price: 720000000,
          reserved_quantity_tons: 0,
          allocated_farm_ids: [farm1Id],
          allocated_campaign_ids: ['camp-cassava-01'],
          quality_grade: 'GRADE_B_STANDARD',
          packaging_type: 'Vrac camions bennes 10t'
        }
      ],
      assigned_manager_id: commManagerId,
      assigned_manager_name: 'Mamadou Touré',
      notes: 'Demande en cours d’évaluation de capacité de transport.',
      created_by_user_id: commManagerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: order3Id,
      organization_id: org1Id,
      order_number: 'ORD-2026-BEYE-003',
      buyer_id: 'b2222222-2222-2222-2222-222222222222',
      buyer_name: 'Coopérative Agro-Alimentaire Fouta',
      buyer_country: 'Guinée (Labé)',
      order_type: 'QUOTATION',
      status: 'QUOTED',
      incoterm: 'DAP',
      delivery_destination: 'Magasin Central Grand Marché Labé',
      delivery_window_start: '2026-11-01',
      delivery_window_end: '2026-11-10',
      currency: 'GNF',
      total_amount: 260000000,
      required_documents: ['Bordereau de Livraison', 'Bon de Réception'],
      payment_terms: 'Paiement 100% au déchargement à Labé.',
      payment_milestones: [
        {
          id: 'pm-beye-1',
          milestoneName: 'Règlement comptant livraison',
          percentage: 100,
          amount: 260000000,
          dueDate: '2026-11-05',
          isPaid: false
        }
      ],
      lines: [
        {
          id: 'line-beye-003-1',
          crop_id: 'crop-pepper-01',
          crop_name: 'Piment / Hot Pepper',
          crop_variety_id: 'var-pepper-birdseye',
          crop_variety_name: "Bird's Eye / Pili Pili",
          specifications: 'Piment rouge séché traditionnel entier en sacs hermétiques',
          ordered_quantity: 5000,
          unit: 'KG',
          quantity_tons: 5.0,
          unit_price: 52000,
          total_price: 260000000,
          reserved_quantity_tons: 0,
          allocated_farm_ids: [farm1Id],
          allocated_campaign_ids: ['camp-pepper-birdseye-02'],
          quality_grade: 'GRADE_A_PREMIUM',
          packaging_type: 'Sacs tissés 25kg doublés polyéthylène'
        }
      ],
      assigned_manager_id: commManagerId,
      assigned_manager_name: 'Mamadou Touré',
      notes: 'Devis envoyé à Mme Sow. Décision attendue sous 5 jours.',
      created_by_user_id: commManagerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const o of ordersSeed) {
    if (!state.commercial_orders.find((e: any) => e.id === o.id)) {
      state.commercial_orders.push(o);
    }
  }

  // 3. Seed Supply Reservations (Concurrency-safe supply allocation against orders)
  const reservationsSeed = [
    {
      id: 'res-2026-001',
      organization_id: org1Id,
      order_id: order1Id,
      order_line_id: 'line-pim-001-1',
      campaign_id: campaign1Id,
      campaign_name: 'Campagne Piment S17 — Friguiagbé 2026',
      farm_id: farm1Id,
      farm_name: 'Exploitation Agro-Pastorale de Kindia (Friguiagbé)',
      crop_name: 'Piment (Capsicum)',
      reserved_quantity_tons: 8.0,
      source_type: 'FORECAST_HARVEST',
      status: 'ACTIVE',
      reservation_date: '2026-10-01T15:00:00Z',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const r of reservationsSeed) {
    if (!state.supply_reservations.find((e: any) => e.id === r.id)) {
      state.supply_reservations.push(r);
    }
  }

  // 4. Link Commercial Milestone into Normal Calendar & Master Calendar
  const commercialCalEvents = [
    {
      id: calEventOrder1Id,
      organization_id: org1Id,
      title: 'Échéance Livraison Export SOCOPRO (25t Piment S17)',
      description: 'Mise à quai Port Autonome de Conakry conteneur frigorifique avec agrément ONPQ.',
      event_type: 'EVENT',
      status: 'PENDING',
      priority: 'URGENT',
      start_datetime: '2026-10-28T08:00:00Z',
      end_datetime: '2026-10-28T18:00:00Z',
      all_day: false,
      timezone: 'Africa/Conakry',
      assigned_to_user_id: commManagerId,
      farm_id: farm1Id,
      linked_order_id: order1Id,
      notes: 'Lien direct vers commande ORD-2026-PIM-001. Contrôle préalable laboratoire obligatoire.',
      created_by_user_id: commManagerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    }
  ];

  for (const ce of commercialCalEvents) {
    if (!state.normal_calendar_events.find((e: any) => e.id === ce.id)) {
      state.normal_calendar_events.push(ce);
    }
  }
}

/**
 * PHASE 6: Post-Harvest Processing, Inventory, Quality Management, and Traceability Seed
 */
function applyProcessingInventorySeed(state: SchemaState) {
  const org1Id = '11111111-1111-1111-1111-111111111111';
  const farm1Id = 'f1111111-1111-1111-1111-111111111111';
  const campaign1Id = 'c1111111-1111-1111-1111-111111111111';
  const order1Id = 'ord-2026-pim-001';
  const opsManagerId = '12121212-1212-1212-1212-121212121212'; // Sékou Traoré
  const agroId = 'dddddddd-dddd-dddd-dddd-dddddddddddd'; // Dr. Fanta Condé

  // 1. Inventory Items
  const inventoryItemsSeed = [
    {
      id: 'inv-raw-pim-001',
      organization_id: org1Id,
      name: 'Piment S17 Habanero Frais (Récolté)',
      sku: 'RAW-PIM-S17',
      category: 'RAW_AGRICULTURAL_PRODUCE',
      crop_id: 'crop-capsicum',
      unit: 'KG',
      quantity_on_hand: 15000,
      quantity_available: 15000,
      quantity_reserved: 0,
      quantity_quarantined: 0,
      warehouse_location: 'Magasin Central Friguiagbé (Kindia)',
      cost_per_unit: 25000,
      currency: 'GNF',
      latest_batch_number: 'HARV-2026-PIM-001',
      status: 'NORMAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'inv-fin-pim-001',
      organization_id: org1Id,
      name: 'Piment S17 Habanero Séché Grade A Export',
      sku: 'FIN-PIM-S17-DRY-A',
      category: 'FINISHED_PRODUCT',
      crop_id: 'crop-capsicum',
      unit: 'KG',
      quantity_on_hand: 6400,
      quantity_available: 900,
      quantity_reserved: 5000,
      quantity_quarantined: 500,
      warehouse_location: 'Magasin Central Friguiagbé (Kindia)',
      cost_per_unit: 42000,
      currency: 'GNF',
      latest_batch_number: 'PRC-2026-S17-001',
      status: 'NORMAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'inv-raw-cas-001',
      organization_id: org1Id,
      name: 'Manioc Tubercule Frais Brut',
      sku: 'RAW-CAS-BOC',
      category: 'RAW_AGRICULTURAL_PRODUCE',
      crop_id: 'crop-cassava',
      unit: 'KG',
      quantity_on_hand: 28000,
      quantity_available: 18000,
      quantity_reserved: 10000,
      quantity_quarantined: 0,
      warehouse_location: 'Hangar de Stockage K-02',
      cost_per_unit: 1200,
      currency: 'GNF',
      latest_batch_number: 'HARV-2026-CAS-001',
      status: 'NORMAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'inv-fin-cas-001',
      organization_id: org1Id,
      name: 'Farine de Manioc Panifiable Pure',
      sku: 'FIN-CAS-FLOUR-HQCF',
      category: 'FINISHED_PRODUCT',
      crop_id: 'crop-cassava',
      unit: 'KG',
      quantity_on_hand: 9200,
      quantity_available: 2200,
      quantity_reserved: 7000,
      quantity_quarantined: 0,
      warehouse_location: 'Entrepôt Farine Mamou',
      cost_per_unit: 6500,
      currency: 'GNF',
      latest_batch_number: 'PRC-2026-CAS-001',
      status: 'NORMAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'inv-pkg-cart-001',
      organization_id: org1Id,
      name: 'Cartons Export Alvéolés Renforcés 5kg',
      sku: 'PKG-CART-5KG',
      category: 'PACKAGING_MATERIAL',
      unit: 'UNIT',
      quantity_on_hand: 2500,
      quantity_available: 1500,
      quantity_reserved: 1000,
      quantity_quarantined: 0,
      warehouse_location: 'Magasin Emballage Kindia',
      cost_per_unit: 12000,
      currency: 'GNF',
      status: 'NORMAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'inv-inp-npk-001',
      organization_id: org1Id,
      name: 'Engrais NPK 15-15-15 (Sacs 50kg)',
      sku: 'INP-NPK-50KG',
      category: 'AGRICULTURAL_INPUT',
      unit: 'SAC',
      quantity_on_hand: 80,
      quantity_available: 80,
      quantity_reserved: 0,
      quantity_quarantined: 0,
      warehouse_location: 'Magasin Intrants Kindia',
      min_threshold_alert: 20,
      cost_per_unit: 380000,
      currency: 'GNF',
      status: 'NORMAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const it of inventoryItemsSeed) {
    if (!state.inventory_items.find((e: any) => e.id === it.id)) {
      state.inventory_items.push(it);
    }
  }

  // 2. Stock Movements (Immutable auditable history)
  const stockMovementsSeed = [
    {
      id: 'smov-001',
      organization_id: org1Id,
      inventory_item_id: 'inv-raw-pim-001',
      batch_number: 'HARV-2026-PIM-001',
      movement_type: 'RECEIVING',
      quantity: 15000,
      unit: 'KG',
      location_source: 'Parcelle P-01 (Kindia)',
      location_destination: 'Magasin Central Friguiagbé (Kindia)',
      movement_date: '2026-10-02T16:00:00Z',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      reference_document: 'HARV-2026-PIM-001',
      reason: 'Réception récolte fraîche piment S17 campagne 2026',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'smov-002',
      organization_id: org1Id,
      inventory_item_id: 'inv-raw-pim-001',
      batch_number: 'PRC-2026-S17-001',
      movement_type: 'ISSUING',
      quantity: 12000,
      unit: 'KG',
      location_source: 'Magasin Central Friguiagbé (Kindia)',
      location_destination: 'Station de Séchage et Usinage Friguiagbé',
      movement_date: '2026-10-04T07:30:00Z',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      reference_document: 'PRC-2026-S17-001',
      reason: 'Alimentation du lot de transformation séchage solaire contrôlé',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'smov-003',
      organization_id: org1Id,
      inventory_item_id: 'inv-fin-pim-001',
      batch_number: 'PRC-2026-S17-001',
      movement_type: 'RECEIVING',
      quantity: 2850,
      unit: 'KG',
      location_source: 'Station de Séchage et Usinage Friguiagbé',
      location_destination: 'Magasin Central Friguiagbé (Kindia)',
      movement_date: '2026-10-07T16:30:00Z',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      reference_document: 'PRC-2026-S17-001',
      reason: 'Entrée en stock produit fini piment séché calibré (rendement 23.75%)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'smov-004',
      organization_id: org1Id,
      inventory_item_id: 'inv-fin-pim-001',
      batch_number: 'PRC-2026-S17-001',
      movement_type: 'RESERVATION',
      quantity: 5000,
      unit: 'KG',
      location_source: 'Magasin Central Friguiagbé (Kindia)',
      location_destination: 'Réservation Commande Export SOCOPRO',
      movement_date: '2026-10-08T09:00:00Z',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      reference_document: order1Id,
      reason: 'Affectation ferme contractuelle sur commande export ORD-2026-PIM-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'smov-005',
      organization_id: org1Id,
      inventory_item_id: 'inv-fin-pim-001',
      batch_number: 'PRC-2026-S17-001',
      movement_type: 'TRANSFER',
      quantity: 500,
      unit: 'KG',
      location_source: 'Magasin Central Friguiagbé (Kindia)',
      location_destination: 'Zone de Quarantaine / Échantillonnage Phytosanitaire',
      movement_date: '2026-10-08T10:15:00Z',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      reference_document: 'QC-2026-PIM-001',
      reason: 'Mise en quarantaine pour prélèvements officiels ONPQ & certificat export',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const sm of stockMovementsSeed) {
    if (!state.stock_movements.find((e: any) => e.id === sm.id)) {
      state.stock_movements.push(sm);
    }
  }

  // 3. Processing Recipes (Grounded, realistic examples with validation disclaimer)
  const processingRecipesSeed = [
    {
      id: 'rec-pim-s17',
      organization_id: org1Id,
      name: 'Séchage Solaire Contrôlé & Calibrage Piment S17 Habanero',
      code: 'REC-PIM-DRY-01',
      crop_id: 'crop-capsicum',
      description: 'Protocole de séchage doux sous serre solaire ventilée avec contrôle hygrométrique (<45°C) pour préservation de la capsaïcine et couleur rouge vive.',
      standard_input_quantity: 1000,
      standard_input_unit: 'KG',
      expected_output_quantity: 240,
      expected_output_unit: 'KG',
      expected_conversion_yield_pct: 24.0,
      estimated_duration_hours: 72,
      labor_hours_required: 18,
      stages: [
        'Réception & Tri manuel sur table inox',
        'Lavage à l’eau ozonée & Équeutage',
        'Séchage solaire sous serre ventilée (< 45°C, HR < 60%)',
        'Calibrage granulométrique & Dépoussiérage vibrant',
        'Conditionnement sous sachets polyéthylène thermoscellés'
      ],
      is_locally_validated: true,
      local_validation_source: 'Centre de Recherche Agronomique de Foulaya (Kindia - CRAF)',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'rec-cas-flour',
      organization_id: org1Id,
      name: 'Transformation Manioc en Farine Panifiable (HQCF)',
      code: 'REC-CAS-FLR-01',
      crop_id: 'crop-cassava',
      description: 'Procédé de valorisation des tubercules de manioc Bocou 1 en farine panifiable de haute qualité sans gluten pour l’artisanat boulanger guinéen.',
      standard_input_quantity: 1000,
      standard_input_unit: 'KG',
      expected_output_quantity: 250,
      expected_output_unit: 'KG',
      expected_conversion_yield_pct: 25.0,
      estimated_duration_hours: 36,
      labor_hours_required: 24,
      stages: [
        'Épluchage & Lavage à grande eau',
        'Râpage mécanique fin motorisé',
        'Pressage hydraulique & Égouttage (teneur en eau < 40%)',
        'Émiettage & Séchage solaire ou flash-dryer',
        'Mouture au broyeur à marteaux & Tamisage 150 microns',
        'Conditionnement en sacs polypropylène doublés 25kg'
      ],
      is_locally_validated: true,
      local_validation_source: 'Institut de Recherche Agronomique de Guinée (IRAG)',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'rec-wat-prep',
      organization_id: org1Id,
      name: 'Préparation Pastèque Fraîche Export & Calibrage',
      code: 'REC-WAT-EXP-01',
      crop_id: 'crop-watermelon',
      description: 'Ligne de conditionnement pastèque Kaolack plein champ: tri, nettoyage délicat, pesée calibrée et mise en caisse palette alvéolée.',
      standard_input_quantity: 1000,
      standard_input_unit: 'KG',
      expected_output_quantity: 880,
      expected_output_unit: 'KG',
      expected_conversion_yield_pct: 88.0,
      estimated_duration_hours: 8,
      labor_hours_required: 12,
      stages: [
        'Réception quai ombragé et contrôle température interne',
        'Brossage doux à sec & Nettoyage des pédoncules',
        'Tri sanitaire (exclusion des coups de soleil et déformations)',
        'Calibrage pondéral (Classe A: 4-6 kg, Classe B: 6-8 kg)',
        'Palettisation avec intercalaires carton alvéolé'
      ],
      is_locally_validated: true,
      local_validation_source: 'Groupement des Maraîchers de Basse-Guinée',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'rec-wat-juice',
      organization_id: org1Id,
      name: 'Essai Pilote Jus & Pulpe de Pastèque Kaolack',
      code: 'REC-WAT-JUC-01',
      crop_id: 'crop-watermelon',
      description: 'Essai expérimental de valorisation des écarts de tri pastèque en pur jus filtré pasteurisé. À traiter comme essai pilote R&D sans garantie de viabilité commerciale.',
      standard_input_quantity: 500,
      standard_input_unit: 'KG',
      expected_output_quantity: 320,
      expected_output_unit: 'L',
      expected_conversion_yield_pct: 64.0,
      estimated_duration_hours: 12,
      labor_hours_required: 10,
      stages: [
        'Lavage & Désinfection chlorée douce',
        'Écorçage manuel & Découpe des quartiers',
        'Broyage mécanique & Pressage hélicoïdal à froid',
        'Filtration tamis rotatif 80 mesh',
        'Pasteurisation flash 72°C pendant 30 secondes',
        'Conditionnement bouteilles verre et refroidissement immédiat'
      ],
      is_locally_validated: false,
      local_validation_source: 'Essai pilote R&D Laboratoire Agro-Alimentaire Conakry (En cours de validation)',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const rc of processingRecipesSeed) {
    if (!state.processing_recipes.find((e: any) => e.id === rc.id)) {
      state.processing_recipes.push(rc);
    }
  }

  // 4. Processing Batches (Actual recorded production)
  const calPrc1Id = 'cal-prc-2026-001';
  const processingBatchesSeed = [
    {
      id: 'prc-batch-001',
      organization_id: org1Id,
      batch_number: 'PRC-2026-S17-001',
      recipe_id: 'rec-pim-s17',
      recipe_name: 'Séchage Solaire Contrôlé & Calibrage Piment S17 Habanero',
      campaign_id: campaign1Id,
      campaign_name: 'Campagne Piment S17 — Friguiagbé 2026',
      harvest_batch_number: 'HARV-2026-PIM-001',
      input_raw_material_name: 'Piment S17 Habanero Frais',
      input_quantity: 12000,
      input_unit: 'KG',
      output_product_name: 'Piment S17 Habanero Séché Grade A Export',
      output_quantity: 2850,
      output_unit: 'KG',
      by_products_quantity: 0,
      losses_quantity: 150,
      actual_conversion_yield_pct: 23.75,
      expected_conversion_yield_pct: 24.0,
      yield_variance_pct: -0.25,
      status: 'COMPLETED',
      started_at: '2026-10-04T07:00:00Z',
      completed_at: '2026-10-07T16:00:00Z',
      labor_hours: 216,
      labor_cost_gnf: 8640000,
      energy_and_utilities_cost_gnf: 3200000,
      packaging_cost_gnf: 4500000,
      total_cost_gnf: 316340000, // Includes raw material valuation
      unit_production_cost_gnf: 111000,
      facility_location: 'Station de Séchage et Usinage Friguiagbé',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      linked_calendar_event_id: calPrc1Id,
      quality_release_status: 'ACCEPTED_GRADE_A',
      notes: 'Séchage conduit avec succès, humidité résiduelle moyenne contrôlée à 9.8%.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'prc-batch-002',
      organization_id: org1Id,
      batch_number: 'PRC-2026-CAS-001',
      recipe_id: 'rec-cas-flour',
      recipe_name: 'Transformation Manioc en Farine Panifiable (HQCF)',
      campaign_id: 'camp-2026-cas-001',
      campaign_name: 'Campagne Manioc Bocou 1 — Mamou 2026',
      harvest_batch_number: 'HARV-2026-CAS-001',
      input_raw_material_name: 'Manioc Tubercule Frais Brut',
      input_quantity: 15000,
      input_unit: 'KG',
      output_product_name: 'Farine de Manioc Panifiable Pure',
      output_quantity: 3720,
      output_unit: 'KG',
      by_products_quantity: 2000, // Cattle feed peelings
      losses_quantity: 280,
      actual_conversion_yield_pct: 24.8,
      expected_conversion_yield_pct: 25.0,
      yield_variance_pct: -0.2,
      status: 'COMPLETED',
      started_at: '2026-09-18T08:00:00Z',
      completed_at: '2026-09-20T17:00:00Z',
      labor_hours: 360,
      labor_cost_gnf: 12500000,
      energy_and_utilities_cost_gnf: 4800000,
      packaging_cost_gnf: 3500000,
      total_cost_gnf: 38800000,
      unit_production_cost_gnf: 10430,
      facility_location: 'Unité de Transformation Mamou',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      quality_release_status: 'ACCEPTED_GRADE_A',
      notes: 'Sous-produits valorisés auprès du groupement d’éleveurs locaux.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'prc-batch-003',
      organization_id: org1Id,
      batch_number: 'PRC-2026-WAT-001',
      recipe_id: 'rec-wat-prep',
      recipe_name: 'Préparation Pastèque Fraîche Export & Calibrage',
      campaign_id: 'camp-2026-wat-001',
      campaign_name: 'Campagne Pastèque Kaolack — Dalaba 2026',
      harvest_batch_number: 'HARV-2026-WAT-001',
      input_raw_material_name: 'Pastèque Kaolack Fraîche (Champs)',
      input_quantity: 8000,
      input_unit: 'KG',
      output_product_name: 'Pastèque Kaolack Calibrée Export',
      output_quantity: 7040,
      output_unit: 'KG',
      by_products_quantity: 0,
      losses_quantity: 960,
      actual_conversion_yield_pct: 88.0,
      expected_conversion_yield_pct: 88.0,
      yield_variance_pct: 0.0,
      status: 'IN_PROGRESS',
      started_at: '2026-10-12T07:30:00Z',
      labor_hours: 96,
      labor_cost_gnf: 3840000,
      energy_and_utilities_cost_gnf: 950000,
      packaging_cost_gnf: 14000000,
      total_cost_gnf: 33190000,
      unit_production_cost_gnf: 4715,
      facility_location: 'Quai de Calibrage Dalaba',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      quality_release_status: 'PENDING_INSPECTION',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'prc-batch-rej',
      organization_id: org1Id,
      batch_number: 'PRC-2026-S17-REJ',
      recipe_id: 'rec-pim-s17',
      recipe_name: 'Séchage Solaire Contrôlé & Calibrage Piment S17 Habanero',
      campaign_id: campaign1Id,
      campaign_name: 'Campagne Piment S17 — Friguiagbé 2026',
      harvest_batch_number: 'HARV-2026-PIM-001',
      input_raw_material_name: 'Piment S17 Habanero Frais',
      input_quantity: 2000,
      input_unit: 'KG',
      output_product_name: 'Piment S17 Déclassé Rejeté',
      output_quantity: 420,
      output_unit: 'KG',
      by_products_quantity: 0,
      losses_quantity: 120,
      actual_conversion_yield_pct: 21.0,
      expected_conversion_yield_pct: 24.0,
      yield_variance_pct: -3.0,
      status: 'COMPLETED',
      started_at: '2026-10-08T07:00:00Z',
      completed_at: '2026-10-10T16:00:00Z',
      labor_hours: 40,
      labor_cost_gnf: 1600000,
      energy_and_utilities_cost_gnf: 800000,
      packaging_cost_gnf: 900000,
      total_cost_gnf: 53300000,
      unit_production_cost_gnf: 126900,
      facility_location: 'Station Friguiagbé',
      responsible_user_id: opsManagerId,
      responsible_user_name: 'Sékou Traoré',
      quality_release_status: 'REJECTED',
      notes: 'Lot rejeté au contrôle qualité officiel pour non-conformité hygrométrique et présence moisissures.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const pb of processingBatchesSeed) {
    if (!state.processing_batches.find((e: any) => e.id === pb.id)) {
      state.processing_batches.push(pb);
    }
  }

  // 5. Quality Inspections
  const qualityInspectionsSeed = [
    {
      id: 'qc-001',
      organization_id: org1Id,
      inspection_number: 'QC-2026-PIM-001',
      batch_number: 'PRC-2026-S17-001',
      product_name: 'Piment S17 Habanero Séché Grade A Export',
      inspection_date: '2026-10-08T10:00:00Z',
      inspector_user_id: agroId,
      inspector_name: 'Dr. Kadiatou Camara',
      inspector_accreditation: 'Inspecteur Phytosanitaire National Agréé ONPQ Guinée',
      sample_size_taken: '5 kg prélevés aléatoirement sur 20 cartons',
      moisture_pct: 9.8,
      max_permissible_moisture_pct: 11.0,
      defects_rate_pct: 0.8,
      max_permissible_defects_pct: 2.0,
      foreign_matter_pct: 0.1,
      max_permissible_foreign_matter_pct: 0.5,
      chemical_residues_compliant: true,
      pesticide_mrl_compliant: true,
      release_status: 'ACCEPTED_GRADE_A',
      official_certificate_number: 'CERT-ONPQ-GN-2026-0842',
      notes: 'Produit parfaitement séché, sans contamination fongique ni résidus au-delà des LMR européennes. Autorisé pour expédition conteneur frigorifique.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'qc-002',
      organization_id: org1Id,
      inspection_number: 'QC-2026-PIM-REJ-002',
      batch_number: 'PRC-2026-S17-REJ',
      product_name: 'Piment S17 Habanero Séché',
      inspection_date: '2026-10-11T09:00:00Z',
      inspector_user_id: agroId,
      inspector_name: 'Inspecteur Ibrahima Sylla',
      inspector_accreditation: 'Contrôleur Qualité et Conformité ONPQ',
      sample_size_taken: '2 kg',
      moisture_pct: 14.5,
      max_permissible_moisture_pct: 11.0,
      defects_rate_pct: 4.8,
      max_permissible_defects_pct: 2.0,
      foreign_matter_pct: 1.2,
      max_permissible_foreign_matter_pct: 0.5,
      chemical_residues_compliant: true,
      pesticide_mrl_compliant: true,
      release_status: 'REJECTED',
      non_conformance_reason: 'Taux d’humidité excessif (14.5% > seuil max 11.0%) et présence de moisissures superficielles. Risque mycotoxines.',
      corrective_action_plan: 'Lot impropre à l’exportation. Interdiction formelle d’allocation commande, de dispatch ou de conditionnement export. Destruction ou méthanisation requise.',
      notes: 'Notification formelle de non-conformité transmise à la direction des opérations.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'qc-003',
      organization_id: org1Id,
      inspection_number: 'QC-2026-CAS-001',
      batch_number: 'PRC-2026-CAS-001',
      product_name: 'Farine de Manioc Panifiable Pure',
      inspection_date: '2026-09-21T11:00:00Z',
      inspector_user_id: agroId,
      inspector_name: 'Laboratoire Central d’Analyses Agroalimentaires',
      inspector_accreditation: 'Laboratoire Agréé Ministère de l’Agriculture Guinée',
      sample_size_taken: '3 kg de farine',
      moisture_pct: 10.2,
      max_permissible_moisture_pct: 12.0,
      defects_rate_pct: 0.2,
      max_permissible_defects_pct: 1.5,
      foreign_matter_pct: 0.05,
      max_permissible_foreign_matter_pct: 0.3,
      chemical_residues_compliant: true,
      pesticide_mrl_compliant: true,
      release_status: 'ACCEPTED_GRADE_A',
      official_certificate_number: 'CERT-ONPQ-GN-2026-0911',
      notes: 'Teneur résiduelle en acide cyanhydrique inférieure à 5 ppm (conforme norme Codex Stan 176-1989).',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const qi of qualityInspectionsSeed) {
    if (!state.quality_inspections.find((e: any) => e.id === qi.id)) {
      state.quality_inspections.push(qi);
    }
  }

  // 6. Link Calendar Event for Processing Milestone
  const processingCalEvents = [
    {
      id: calPrc1Id,
      organization_id: org1Id,
      title: 'Usinage & Séchage Solaire Lot PRC-2026-S17-001',
      description: 'Lancement du séchage solaire de 12 tonnes de piment S17 à Friguiagbé pour commande SOCOPRO.',
      event_type: 'EVENT',
      status: 'COMPLETED',
      priority: 'HIGH',
      start_datetime: '2026-10-04T07:00:00Z',
      end_datetime: '2026-10-07T16:00:00Z',
      all_day: false,
      timezone: 'Africa/Conakry',
      assigned_to_user_id: opsManagerId,
      farm_id: farm1Id,
      linked_campaign_id: campaign1Id,
      notes: 'Jalon usinage lié directement au lot de transformation PRC-2026-S17-001.',
      created_by_user_id: opsManagerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    }
  ];

  for (const pce of processingCalEvents) {
    if (!state.normal_calendar_events.find((e: any) => e.id === pce.id)) {
      state.normal_calendar_events.push(pce);
    }
  }
}

/**
 * PHASE 7: Logistics, Shipments, Export Compliance and Trade Tracking Seed
 */
function applyLogisticsSeed(state: SchemaState) {
  const org1Id = '11111111-1111-1111-1111-111111111111'; // Kindia Agrobusiness Alpha
  const farm1Id = 'farm-knd-01';
  const managerUserId = 'cccccccc-cccc-cccc-cccc-cccccccccccc'; // Abdoulaye Soumah
  const commUserId = '33333333-3333-3333-3333-333333333333'; // Sékou Traoré

  if (!state.shipments) state.shipments = [];

  const initialShipments: any[] = [
    {
      id: 'shp-2026-exp-001',
      organization_id: org1Id,
      shipment_number: 'SHP-2026-EXP-PIM-001',
      order_id: 'ord-2026-pim-001',
      order_number: 'ORD-2026-PIM-001',
      buyer_id: 'buyer-001',
      buyer_name: 'Rungis Primeurs Import Paris',
      destination_market: 'EUROPEAN_UNION',
      dispatch_location: 'Magasin Central Friguiagbé, Kindia',
      destination_port_or_city: 'Port du Havre / Rungis International, Paris',
      destination_country: 'FR',
      incoterm: 'CIF',
      transport_mode: 'MARITIME',
      carrier_name: 'CMA CGM Guinée',
      carrier_contact_person: 'Elhadj Oumar Diallo (Agent Maritime PAC)',
      carrier_contact_phone: '+224 622 45 67 89',
      container_or_vehicle_id: 'CMAU 492019-3 (20ft Dry Food-Grade)',
      seal_number: 'GN-CUSTOMS-2026-8812',
      linked_batches: [
        {
          inventoryItemId: 'inv-proc-pim-001',
          batchNumber: 'PRC-2026-S17-001',
          productName: 'Piment S17 Habanero Séché',
          quantityAllocated: 5000,
          unit: 'KG',
          qualityReleaseStatus: 'ACCEPTED_GRADE_A',
          inspectionNumber: 'QC-2026-PIM-001'
        }
      ],
      total_net_weight_kg: 5000,
      total_gross_weight_kg: 5420,
      temperature_handling: {
        regime: 'AMBIENT_DRY',
        targetTempC: 22,
        minTempC: 15,
        maxTempC: 28,
        humidityMaxPct: 65,
        requiresContinuousColdChainLog: false,
        preCoolingRequired: false,
        notes: 'Maintenir en conteneur aéré, à l’abri de toute condensation marine.'
      },
      packaging_pallet: {
        palletType: 'EURO_PALLET_1200x800',
        palletCount: 10,
        boxesOrBagsPerPallet: 20,
        totalPackageCount: 200,
        packagingMaterial: 'Sacs polypropylène doublés kraft 25kg + cornières de protection et housse thermo-rétractable',
        netWeightKg: 5000,
        grossWeightKg: 5420,
        tareWeightKg: 420,
        cornerProtectors: true,
        strappedAndStretchWrapped: true
      },
      costs: {
        freightCost: 18500000,
        handlingCost: 4200000,
        customsClearanceCost: 5800000,
        insuranceCost: 3150000,
        packagingCost: 6500000,
        portTerminalHandlingCost: 3200000,
        otherCosts: 0,
        totalCost: 41350000,
        currency: 'GNF',
        costPerKg: 8270,
        isLiveCarrierIntegration: false,
        rateNotes: 'Grille tarifaire contractuelle 2026 négociée avec Bolloré Logistics et CMA CGM Conakry.'
      },
      planned_pickup_date: '2026-10-18T08:00:00Z',
      actual_pickup_date: '2026-10-18T09:30:00Z',
      estimated_arrival_date: '2026-11-08T14:00:00Z',
      current_status: 'DISPATCHED_IN_TRANSIT',
      total_delay_hours: 0,
      is_dispatch_blocked: false,
      milestones: [
        {
          id: 'ms-01',
          code: 'MS-LOAD',
          name: 'Chargement & Empotage Conteneur à Friguiagbé',
          location: 'Magasin Central Friguiagbé',
          plannedDate: '2026-10-18T08:00:00Z',
          actualDate: '2026-10-18T10:00:00Z',
          status: 'COMPLETED',
          delayHours: 0,
          responsibleParty: 'Équipe Logistique Kindia',
          notes: 'Vérification intégrité des 10 palettes et pose du premier plomb d’usine.'
        },
        {
          id: 'ms-02',
          code: 'MS-TRANSIT-PORT',
          name: 'Acheminement Routier vers Port de Conakry',
          location: 'Corridor RN1 Kindia-Conakry',
          plannedDate: '2026-10-19T06:00:00Z',
          actualDate: '2026-10-19T14:30:00Z',
          status: 'COMPLETED',
          delayHours: 0,
          responsibleParty: 'Transporteur Routier Agréé',
          notes: 'Arrivée sans incident au parc à conteneurs du Port Autonome de Conakry.'
        },
        {
          id: 'ms-03',
          code: 'MS-CUSTOMS-PHYT',
          name: 'Contrôle Phytosanitaire & Dédouanement PAC',
          location: 'Port Autonome de Conakry (PAC)',
          plannedDate: '2026-10-21T09:00:00Z',
          status: 'IN_PROGRESS',
          delayHours: 0,
          responsibleParty: 'Direction Nationale Protection des Végétaux & Douanes Guinée',
          notes: 'Inspection physique et validation du certificat phytosanitaire n° PHYT-GN-2026-0941.'
        },
        {
          id: 'ms-04',
          code: 'MS-VESSEL-BOARD',
          name: 'Embarquement Navire CMA CGM BIANCA',
          location: 'Terminal à Conteneurs PAC Quai 12',
          plannedDate: '2026-10-24T18:00:00Z',
          status: 'PENDING',
          delayHours: 0,
          responsibleParty: 'CMA CGM Guinée',
          notes: 'Closing conteneur fixé au 23/10 16:00 GMT.'
        },
        {
          id: 'ms-05',
          code: 'MS-PORT-DEST',
          name: 'Arrivée Port du Havre & Dédouanement UE',
          location: 'Port 2000, Le Havre, France',
          plannedDate: '2026-11-06T08:00:00Z',
          status: 'PENDING',
          delayHours: 0,
          responsibleParty: 'Commissionnaire de Transport France',
          notes: 'Contrôle documentaire EUR.1 et apurement douanier communautaire.'
        },
        {
          id: 'ms-06',
          code: 'MS-FINAL-DELIVERY',
          name: 'Livraison Finale Entrepôt Acheteur Rungis',
          location: 'Marché International de Rungis, Pavillon Bât. E4',
          plannedDate: '2026-11-08T14:00:00Z',
          status: 'PENDING',
          delayHours: 0,
          responsibleParty: 'Chauffeur Livraison Rungis',
          notes: 'Déchargement et émargement du bordereau de livraison final.'
        }
      ],
      documents: [
        {
          id: 'doc-01',
          shipmentId: 'shp-2026-exp-001',
          documentType: 'COMMERCIAL_INVOICE',
          title: 'Facture Commerciale Définitive Export n° FC-2026-042',
          documentNumber: 'FC-2026-042',
          issuingAuthority: 'Kindia Agrobusiness S.A.',
          issueDate: '2026-10-17',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['EUROPEAN_UNION', 'CEDEAO', 'NORTH_AMERICA'],
          isConfidentialFinancial: true,
          fileReferenceHash: 'sha256-fc042-signed-pdf-hash',
          fileReferenceName: 'Facture_Commerciale_FC2026042.pdf',
          verifiedByUserId: commUserId,
          verifiedByUserName: 'Sékou Traoré',
          verifiedAt: '2026-10-17T11:00:00Z'
        },
        {
          id: 'doc-02',
          shipmentId: 'shp-2026-exp-001',
          documentType: 'PACKING_LIST',
          title: 'Bordereau de Colisage / Packing List Export',
          documentNumber: 'PKL-2026-042',
          issuingAuthority: 'Kindia Agrobusiness S.A. Station Conditionnement',
          issueDate: '2026-10-17',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['EUROPEAN_UNION', 'CEDEAO', 'DOMESTIC_GUINEA'],
          isConfidentialFinancial: false,
          fileReferenceHash: 'sha256-pkl042-hash',
          fileReferenceName: 'Packing_List_PKL2026042.pdf',
          verifiedByUserId: managerUserId,
          verifiedByUserName: 'Abdoulaye Soumah',
          verifiedAt: '2026-10-17T11:30:00Z'
        },
        {
          id: 'doc-03',
          shipmentId: 'shp-2026-exp-001',
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          title: 'Certificat Phytosanitaire International (Convention CIPV)',
          documentNumber: 'PHYT-GN-2026-0941',
          issuingAuthority: 'Ministère de l’Agriculture - Direction Protection Végétaux (DNPV)',
          issueDate: '2026-10-18',
          expiryDate: '2026-11-30',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['EUROPEAN_UNION', 'CEDEAO', 'NORTH_AMERICA'],
          isConfidentialFinancial: false,
          fileReferenceHash: 'sha256-phyt-0941-signed',
          fileReferenceName: 'Certificat_Phytosanitaire_PHYT0941.pdf',
          verifiedByUserId: managerUserId,
          verifiedByUserName: 'Abdoulaye Soumah',
          verifiedAt: '2026-10-18T09:00:00Z'
        },
        {
          id: 'doc-04',
          shipmentId: 'shp-2026-exp-001',
          documentType: 'CERTIFICATE_OF_ORIGIN_EUR1',
          title: 'Certificat de Circulation des Marchandises EUR.1',
          documentNumber: 'EUR1-GN-2026-1102',
          issuingAuthority: 'Chambre de Commerce, d’Industrie et d’Artisanat de Guinée',
          issueDate: '2026-10-18',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['EUROPEAN_UNION'],
          isConfidentialFinancial: false,
          fileReferenceHash: 'sha256-eur1-1102-hash',
          fileReferenceName: 'Certificat_Origine_EUR1_1102.pdf',
          verifiedByUserId: commUserId,
          verifiedByUserName: 'Sékou Traoré',
          verifiedAt: '2026-10-18T10:00:00Z'
        },
        {
          id: 'doc-05',
          shipmentId: 'shp-2026-exp-001',
          documentType: 'BILL_OF_LADING',
          title: 'Connaissement Maritime Original (Draft B/L)',
          documentNumber: 'CMA-CKY-99214',
          issuingAuthority: 'CMA CGM Shipping Agency Conakry',
          issueDate: '2026-10-19',
          status: 'SUBMITTED_FOR_REVIEW',
          requiredForMarkets: ['EUROPEAN_UNION', 'NORTH_AMERICA', 'MIDDLE_EAST'],
          isConfidentialFinancial: true,
          fileReferenceHash: 'sha256-bl-draft-99214',
          fileReferenceName: 'Draft_Bill_of_Lading_CMACKY99214.pdf'
        },
        {
          id: 'doc-06',
          shipmentId: 'shp-2026-exp-001',
          documentType: 'LABORATORY_ANALYSIS_CERTIFICATE',
          title: 'Bulletin d’Analyses Aflatoxines & Métaux Lourds (ONCQ)',
          documentNumber: 'LAB-2026-AFLA-04',
          issuingAuthority: 'Office National de Contrôle de Qualité (ONCQ)',
          issueDate: '2026-10-16',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['EUROPEAN_UNION', 'NORTH_AMERICA'],
          isConfidentialFinancial: false,
          fileReferenceHash: 'sha256-oncq-lab-04',
          fileReferenceName: 'Analyse_Labo_ONCQ_AFLA04.pdf',
          verifiedByUserId: managerUserId,
          verifiedByUserName: 'Abdoulaye Soumah',
          verifiedAt: '2026-10-16T15:00:00Z'
        },
        {
          id: 'doc-07',
          shipmentId: 'shp-2026-exp-001',
          documentType: 'INSURANCE_CERTIFICATE',
          title: 'Certificat d’Assurance Maritime Tous Risques (Institute Cargo Clauses A)',
          documentNumber: 'ASSUR-UGI-2026-77',
          issuingAuthority: 'Union Guinéenne d’Assurances (UGAR)',
          issueDate: '2026-10-17',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['EUROPEAN_UNION', 'CEDEAO', 'NORTH_AMERICA'],
          isConfidentialFinancial: true,
          fileReferenceHash: 'sha256-ugar-cert-77',
          fileReferenceName: 'Police_Assurance_Cargo_UGAR77.pdf'
        }
      ],
      linked_calendar_event_id: 'cal-shp-001',
      responsible_staff_user_id: managerUserId,
      responsible_staff_name: 'Abdoulaye Soumah',
      external_logistics_contact: 'Bolloré Logistics Transit PAC - Mr. Camara (+224 628 01 02 03)',
      customs_broker_name: 'Trans-Guinée Transit & Douane',
      specialInstructions: 'Conserver en cale ventilée non chauffée. Éviter tout contact avec matières grasses ou hydrocarbures.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'shp-2026-reg-002',
      organization_id: org1Id,
      shipment_number: 'SHP-2026-REG-CAS-002',
      order_id: 'ord-2026-cas-001',
      order_number: 'ORD-2026-CAS-001',
      buyer_id: 'buyer-002',
      buyer_name: 'Afrik Agro Dakar',
      destination_market: 'CEDEAO',
      dispatch_location: 'Station de Transformation Manioc, Friguiagbé',
      destination_port_or_city: 'Zone Industrielle Bel-Air, Dakar, Sénégal',
      destination_country: 'SN',
      incoterm: 'DAP',
      transport_mode: 'ROAD_FREIGHT',
      carrier_name: 'Sahel Logistics Corridors',
      carrier_contact_person: 'Mamadou Diallo (Chauffeur-Livreur)',
      carrier_contact_phone: '+221 77 654 32 10',
      container_or_vehicle_id: 'Camion Semi-Remorque Bâché 30T (Immat: RC-8419-A)',
      seal_number: 'CEDEAO-SEAL-9932',
      linked_batches: [
        {
          inventoryItemId: 'inv-proc-cas-001',
          batchNumber: 'PRC-2026-CAS-001',
          productName: 'Farine de Manioc Panifiable Pure',
          quantityAllocated: 15000,
          unit: 'KG',
          qualityReleaseStatus: 'ACCEPTED_GRADE_A',
          inspectionNumber: 'QC-2026-CAS-001'
        }
      ],
      total_net_weight_kg: 15000,
      total_gross_weight_kg: 15450,
      temperature_handling: {
        regime: 'AMBIENT_DRY',
        targetTempC: 25,
        minTempC: 18,
        maxTempC: 35,
        humidityMaxPct: 60,
        requiresContinuousColdChainLog: false,
        preCoolingRequired: false,
        notes: 'Bâchage triple étanche requis pour traversée corridor Tambacounda.'
      },
      packaging_pallet: {
        palletType: 'STANDARD_1200x1000',
        palletCount: 15,
        boxesOrBagsPerPallet: 40,
        totalPackageCount: 600,
        packagingMaterial: 'Sacs polypropylène tissés 25kg micro-perforés de qualité alimentaire',
        netWeightKg: 15000,
        grossWeightKg: 15450,
        tareWeightKg: 450,
        cornerProtectors: true,
        strappedAndStretchWrapped: true
      },
      costs: {
        freightCost: 24000000,
        handlingCost: 3500000,
        customsClearanceCost: 3200000,
        insuranceCost: 2800000,
        packagingCost: 4500000,
        portTerminalHandlingCost: 0,
        otherCosts: 1500000,
        totalCost: 39500000,
        currency: 'GNF',
        costPerKg: 2633,
        isLiveCarrierIntegration: false,
        rateNotes: 'Fret routier Conakry-Dakar via Labé-Mali-Tambacounda (délai indicatif 4 jours).'
      },
      planned_pickup_date: '2026-10-22T07:00:00Z',
      estimated_arrival_date: '2026-10-26T16:00:00Z',
      current_status: 'STAGED_AT_WAREHOUSE',
      total_delay_hours: 0,
      is_dispatch_blocked: false,
      milestones: [
        {
          id: 'ms-reg-01',
          code: 'MS-PALLET',
          name: 'Empilement & Contrôle Humidité Farine',
          location: 'Entrepôt Friguiagbé',
          plannedDate: '2026-10-21T10:00:00Z',
          status: 'COMPLETED',
          delayHours: 0,
          responsibleParty: 'Chef d’Exploitation Friguiagbé'
        },
        {
          id: 'ms-reg-02',
          code: 'MS-DEPARTURE',
          name: 'Départ Convoi Routier RN1 vers Sénégal',
          location: 'Kindia Sortie Nord',
          plannedDate: '2026-10-22T07:00:00Z',
          status: 'PENDING',
          delayHours: 0,
          responsibleParty: 'Sahel Logistics Corridors'
        },
        {
          id: 'ms-reg-03',
          code: 'MS-BORDER',
          name: 'Poste Frontière Sambailo / Koundara (Guinée-Sénégal)',
          location: 'Poste Mixte Frontalier Koundara',
          plannedDate: '2026-10-24T12:00:00Z',
          status: 'PENDING',
          delayHours: 0,
          responsibleParty: 'Agent Frontalier CEDEAO'
        },
        {
          id: 'ms-reg-04',
          code: 'MS-DELIVERY-DKR',
          name: 'Arrivée & Déchargement Entrepôt Afrik Agro Dakar',
          location: 'Zone Industrielle Bel-Air, Dakar',
          plannedDate: '2026-10-26T16:00:00Z',
          status: 'PENDING',
          delayHours: 0,
          responsibleParty: 'Réceptionnaire Afrik Agro'
        }
      ],
      documents: [
        {
          id: 'doc-reg-01',
          shipmentId: 'shp-2026-reg-002',
          documentType: 'COMMERCIAL_INVOICE',
          title: 'Facture Commerciale n° FC-2026-REG-008',
          documentNumber: 'FC-2026-REG-008',
          issuingAuthority: 'Kindia Agrobusiness S.A.',
          issueDate: '2026-10-20',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['CEDEAO'],
          isConfidentialFinancial: true
        },
        {
          id: 'doc-reg-02',
          shipmentId: 'shp-2026-reg-002',
          documentType: 'CERTIFICATE_OF_ORIGIN_CEDEAO',
          title: 'Certificat d’Origine Communautaire CEDEAO / Schéma de Libéralisation (TLS)',
          documentNumber: 'CEDEAO-GN-2026-441',
          issuingAuthority: 'Direction Nationale du Commerce et de la Concurrence',
          issueDate: '2026-10-20',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['CEDEAO'],
          isConfidentialFinancial: false
        },
        {
          id: 'doc-reg-03',
          shipmentId: 'shp-2026-reg-002',
          documentType: 'ROAD_CONSIGNMENT_NOTE_CMR',
          title: 'Lettre de Voiture Internationale Routière (CMR)',
          documentNumber: 'CMR-SN-GN-0881',
          issuingAuthority: 'Sahel Logistics Corridors',
          issueDate: '2026-10-21',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['CEDEAO'],
          isConfidentialFinancial: false
        }
      ],
      linked_calendar_event_id: 'cal-shp-002',
      responsible_staff_user_id: managerUserId,
      responsible_staff_name: 'Abdoulaye Soumah',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'shp-2026-dom-003',
      organization_id: org1Id,
      shipment_number: 'SHP-2026-DOM-WAT-003',
      order_id: 'ord-2026-wat-001',
      order_number: 'ORD-2026-WAT-001',
      buyer_id: 'buyer-003',
      buyer_name: 'Supermarchés Prima Conakry',
      destination_market: 'DOMESTIC_GUINEA',
      dispatch_location: 'Exploitation Friguiagbé Bloc Pastèque P-02',
      destination_port_or_city: 'Entrepôt Central Prima Kipé, Conakry',
      destination_country: 'GN',
      incoterm: 'DAP',
      transport_mode: 'ROAD_FREIGHT',
      carrier_name: 'Trans-Guinée Froid Express',
      carrier_contact_person: 'Ibrahima Barry',
      carrier_contact_phone: '+224 624 88 99 00',
      container_or_vehicle_id: 'Fourgon Frigorifique Isotherme 10T (Immat: RC-2104-B)',
      linked_batches: [
        {
          inventoryItemId: 'inv-raw-wat-001',
          batchNumber: 'LOT-WAT-2026-001',
          productName: 'Pastèque Kaolack Fraîche Récoltée',
          quantityAllocated: 8000,
          unit: 'KG',
          qualityReleaseStatus: 'ACCEPTED_GRADE_B',
          inspectionNumber: 'QC-2026-WAT-001'
        }
      ],
      total_net_weight_kg: 8000,
      total_gross_weight_kg: 8350,
      temperature_handling: {
        regime: 'REFRIGERATED_COLD_CHAIN',
        targetTempC: 11,
        minTempC: 9,
        maxTempC: 13,
        humidityMaxPct: 85,
        requiresContinuousColdChainLog: true,
        preCoolingRequired: true,
        notes: 'Sensible au choc thermique et aux meurtrissures. Durée de conservation résiduelle: 14 jours.'
      },
      packaging_pallet: {
        palletType: 'LOOSE_VENTILATED_CRATE',
        palletCount: 8,
        boxesOrBagsPerPallet: 50,
        totalPackageCount: 400,
        packagingMaterial: 'Caisses plastiques ajourées empilables 20kg avec calage paille stérilisée',
        netWeightKg: 8000,
        grossWeightKg: 8350,
        tareWeightKg: 350,
        cornerProtectors: false,
        strappedAndStretchWrapped: true
      },
      costs: {
        freightCost: 6500000,
        handlingCost: 1200000,
        customsClearanceCost: 0,
        insuranceCost: 850000,
        packagingCost: 1800000,
        portTerminalHandlingCost: 0,
        otherCosts: 0,
        totalCost: 10350000,
        currency: 'GNF',
        costPerKg: 1294,
        isLiveCarrierIntegration: false
      },
      planned_pickup_date: '2026-10-20T06:00:00Z',
      estimated_arrival_date: '2026-10-20T12:00:00Z',
      current_status: 'PACKAGING_VERIFIED',
      total_delay_hours: 0,
      is_dispatch_blocked: false,
      milestones: [
        {
          id: 'ms-dom-01',
          code: 'MS-PICKUP',
          name: 'Pesée & Calibrage Friguiagbé',
          location: 'Verger Pastèque Kindia',
          plannedDate: '2026-10-20T06:00:00Z',
          status: 'COMPLETED',
          delayHours: 0,
          responsibleParty: 'Chef Parcelle Pastèque'
        },
        {
          id: 'ms-dom-02',
          code: 'MS-DELIVERY-PRIMA',
          name: 'Livraison Plateforme Prima Kipé',
          location: 'Kipé Conakry',
          plannedDate: '2026-10-20T12:00:00Z',
          status: 'PENDING',
          delayHours: 0,
          responsibleParty: 'Trans-Guinée Froid Express'
        }
      ],
      documents: [
        {
          id: 'doc-dom-01',
          shipmentId: 'shp-2026-dom-003',
          documentType: 'PACKING_LIST',
          title: 'Bordereau de Livraison Locale Prima',
          documentNumber: 'BL-PRIMA-003',
          issueDate: '2026-10-19',
          status: 'APPROVED_VALID',
          requiredForMarkets: ['DOMESTIC_GUINEA'],
          isConfidentialFinancial: false
        }
      ],
      linked_calendar_event_id: 'cal-shp-003',
      responsible_staff_user_id: managerUserId,
      responsible_staff_name: 'Abdoulaye Soumah',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    }
  ];

  for (const s of initialShipments) {
    if (!state.shipments.find((e: any) => e.id === s.id)) {
      state.shipments.push(s);
    }
  }

  // Calendar events linked to shipments
  const shipmentCalEvents = [
    {
      id: 'cal-shp-001',
      organization_id: org1Id,
      title: 'Expédition Export Maritime Piment SHP-2026-EXP-PIM-001',
      description: 'Départ du conteneur CMAU 492019-3 (5T Piment S17 séché) à destination du Marché de Rungis.',
      event_type: 'EVENT',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      start_datetime: '2026-10-18T08:00:00Z',
      end_datetime: '2026-11-08T14:00:00Z',
      all_day: false,
      timezone: 'Africa/Conakry',
      assigned_to_user_id: managerUserId,
      farm_id: farm1Id,
      notes: 'Jalon logistique export rattaché à la commande ORD-2026-PIM-001.',
      created_by_user_id: managerUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_exception: false
    }
  ];

  for (const sce of shipmentCalEvents) {
    if (!state.normal_calendar_events.find((e: any) => e.id === sce.id)) {
      state.normal_calendar_events.push(sce);
    }
  }
}

/**
 * PHASE 8: Financial Planning, Budgets, Multi-Currency & DCF Investment Appraisal Seed
 */
function applyFinanceSeed(state: SchemaState) {
  const org1Id = '11111111-1111-1111-1111-111111111111'; // Kindia
  const org2Id = '22222222-2222-2222-2222-222222222222'; // Fouta
  const campPimId = 'camp-pepper-s17-01';
  const campCasId = 'camp-cassava-01';

  // 1. Seed Verified Exchange Rates (BCRG Reference)
  if (!state.exchange_rates) state.exchange_rates = [];
  const ratesSeed = [
    {
      id: 'fx-eur-gnf',
      fromCurrency: 'EUR',
      toCurrency: 'GNF',
      rate: 9350,
      effectiveDate: '2026-10-15',
      source: 'Banque Centrale de la République de Guinée (BCRG) - Cours Indicatif Officiel',
      isManualOverride: false
    },
    {
      id: 'fx-gnf-eur',
      fromCurrency: 'GNF',
      toCurrency: 'EUR',
      rate: 0.00010695,
      effectiveDate: '2026-10-15',
      source: 'Banque Centrale de la République de Guinée (BCRG) - Cours Indicatif Officiel',
      isManualOverride: false
    },
    {
      id: 'fx-usd-gnf',
      fromCurrency: 'USD',
      toCurrency: 'GNF',
      rate: 8600,
      effectiveDate: '2026-10-15',
      source: 'Banque Centrale de la République de Guinée (BCRG) - Cours Indicatif Officiel',
      isManualOverride: false
    },
    {
      id: 'fx-gnf-usd',
      fromCurrency: 'GNF',
      toCurrency: 'USD',
      rate: 0.00011628,
      effectiveDate: '2026-10-15',
      source: 'Banque Centrale de la République de Guinée (BCRG) - Cours Indicatif Officiel',
      isManualOverride: false
    },
    {
      id: 'fx-xof-gnf',
      fromCurrency: 'XOF',
      toCurrency: 'GNF',
      rate: 14.25,
      effectiveDate: '2026-10-15',
      source: 'BCEAO / BCRG Zone Monétaire Ouest-Africaine (ZMAO)',
      isManualOverride: false
    },
    {
      id: 'fx-gnf-xof',
      fromCurrency: 'GNF',
      toCurrency: 'XOF',
      rate: 0.070175,
      effectiveDate: '2026-10-15',
      source: 'BCEAO / BCRG Zone Monétaire Ouest-Africaine (ZMAO)',
      isManualOverride: false
    }
  ];

  for (const r of ratesSeed) {
    if (!state.exchange_rates.find((e: any) => e.fromCurrency === r.fromCurrency && e.toCurrency === r.toCurrency)) {
      state.exchange_rates.push(r);
    }
  }

  // 2. Seed Budgets (OPEX and CAPEX)
  if (!state.budgets) state.budgets = [];
  const budgetsSeed = [
    // Kindia Pepper S17 Campaign
    {
      id: 'bud-pim-001',
      organizationId: org1Id,
      entityType: 'CAMPAIGN',
      entityId: campPimId,
      entityName: 'Campagne Piment S17 Kindia Export',
      fiscalYear: 2026,
      category: 'LAND_PREPARATION_PLANTING',
      expenseNature: 'OPEX',
      title: 'Labour profond, billonnage et confection planches pépinière',
      currency: 'GNF',
      plannedBudget: 12500000,
      committedAmount: 12500000,
      actualExpenditure: 12200000,
      forecastRemaining: 0,
      varianceAmount: 300000,
      variancePercentage: 2.4,
      notes: 'Sous-traitance tracteur et ouvriers locaux Friguiagbé.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    {
      id: 'bud-pim-002',
      organizationId: org1Id,
      entityType: 'CAMPAIGN',
      entityId: campPimId,
      entityName: 'Campagne Piment S17 Kindia Export',
      fiscalYear: 2026,
      category: 'SEED_PLANTING_MATERIAL',
      expenseNature: 'OPEX',
      title: 'Semences certifiées S17 Habanero amélioré & terreau',
      currency: 'GNF',
      plannedBudget: 10200000,
      committedAmount: 10200000,
      actualExpenditure: 9800000,
      forecastRemaining: 0,
      varianceAmount: 400000,
      variancePercentage: 3.9,
      notes: 'Achat semences semencier agréé IRAG.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    {
      id: 'bud-pim-003',
      organizationId: org1Id,
      entityType: 'CAMPAIGN',
      entityId: campPimId,
      entityName: 'Campagne Piment S17 Kindia Export',
      fiscalYear: 2026,
      category: 'FERTILIZERS_CROP_PROTECTION',
      expenseNature: 'OPEX',
      title: 'Engrais minéraux NPK 15-15-15, Urée & Biopesticides Neem',
      currency: 'GNF',
      plannedBudget: 18500000,
      committedAmount: 18500000,
      actualExpenditure: 17900000,
      forecastRemaining: 600000,
      varianceAmount: 0,
      variancePercentage: 0.0,
      notes: 'Application raisonnée selon plan d’épandage agronomique.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    {
      id: 'bud-pim-004',
      organizationId: org1Id,
      entityType: 'CAMPAIGN',
      entityId: campPimId,
      entityName: 'Campagne Piment S17 Kindia Export',
      fiscalYear: 2026,
      category: 'IRRIGATION_WATER',
      expenseNature: 'OPEX',
      title: 'Carburant motopompes, lubrifiants & maintenance tuyaux',
      currency: 'GNF',
      plannedBudget: 11800000,
      committedAmount: 10000000,
      actualExpenditure: 7500000,
      forecastRemaining: 3500000,
      varianceAmount: 800000,
      variancePercentage: 6.8,
      notes: 'Consommation gazole maîtrisée grâce au pilotage tensiométrique.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    {
      id: 'bud-pim-005',
      organizationId: org1Id,
      entityType: 'CAMPAIGN',
      entityId: campPimId,
      entityName: 'Campagne Piment S17 Kindia Export',
      fiscalYear: 2026,
      category: 'LABOR',
      expenseNature: 'OPEX',
      title: 'Main d’œuvre saisonnière : désherbage, tuteurage, récoltes échelonnées',
      currency: 'GNF',
      plannedBudget: 20400000,
      committedAmount: 20400000,
      actualExpenditure: 14200000,
      forecastRemaining: 6200000,
      varianceAmount: 0,
      variancePercentage: 0.0,
      notes: 'Équipes locales sous contrat de campagne.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    {
      id: 'bud-pim-006',
      organizationId: org1Id,
      entityType: 'CAMPAIGN',
      entityId: campPimId,
      entityName: 'Campagne Piment S17 Kindia Export',
      fiscalYear: 2026,
      category: 'PACKAGING',
      expenseNature: 'OPEX',
      title: 'Cartons 5kg alvéolés export, cornières & palettes Europe',
      currency: 'GNF',
      plannedBudget: 8000000,
      committedAmount: 8000000,
      actualExpenditure: 8000000,
      forecastRemaining: 0,
      varianceAmount: 0,
      variancePercentage: 0.0,
      notes: 'Conditionnement certifié conforme aux normes UE.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    {
      id: 'bud-pim-007',
      organizationId: org1Id,
      entityType: 'CAMPAIGN',
      entityId: campPimId,
      entityName: 'Campagne Piment S17 Kindia Export',
      fiscalYear: 2026,
      category: 'TRANSPORT_EXPORT',
      expenseNature: 'OPEX',
      title: 'Fret routier Kindia-Conakry & transit portuaire PAC',
      currency: 'GNF',
      plannedBudget: 6000000,
      committedAmount: 6000000,
      actualExpenditure: 5800000,
      forecastRemaining: 0,
      varianceAmount: 200000,
      variancePercentage: 3.3,
      notes: 'Acheminement conteneur au Port Autonome de Conakry.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    // CAPEX Investment for Kindia
    {
      id: 'bud-pim-capex-001',
      organizationId: org1Id,
      entityType: 'FARM',
      entityId: 'farm-knd-01',
      entityName: 'Ferme Friguiagbé Kindia',
      fiscalYear: 2026,
      category: 'IRRIGATION_SYSTEM_INVESTMENT',
      expenseNature: 'CAPEX',
      title: 'Installation réseau goutte-à-goutte sous pression 5 ha',
      currency: 'GNF',
      plannedBudget: 35000000,
      committedAmount: 35000000,
      actualExpenditure: 34500000,
      forecastRemaining: 0,
      varianceAmount: 500000,
      variancePercentage: 1.4,
      notes: 'Investissement immobilisé amorti sur 5 ans.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    // Cassava Campaign Budget (Fouta / Kindia)
    {
      id: 'bud-cas-001',
      organizationId: org1Id,
      entityType: 'CAMPAIGN',
      entityId: campCasId,
      entityName: 'Campagne Manioc Bonoua Kindia',
      fiscalYear: 2026,
      category: 'LAND_PREPARATION_PLANTING',
      expenseNature: 'OPEX',
      title: 'Sous-solage et bouturage manuel 6 ha',
      currency: 'GNF',
      plannedBudget: 15000000,
      committedAmount: 15000000,
      actualExpenditure: 14500000,
      forecastRemaining: 0,
      varianceAmount: 500000,
      variancePercentage: 3.3,
      notes: 'Préparation mécanique sol lourd.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    },
    {
      id: 'bud-cas-002',
      organizationId: org1Id,
      entityType: 'PROCESSING_UNIT',
      entityId: 'proc-unit-01',
      entityName: 'Station de Transformation Manioc',
      fiscalYear: 2026,
      category: 'PROCESSING_UNIT_CONSTRUCTION',
      expenseNature: 'CAPEX',
      title: 'Acquisition broyeur industriel inox & presse hydraulique',
      currency: 'GNF',
      plannedBudget: 45000000,
      committedAmount: 45000000,
      actualExpenditure: 44000000,
      forecastRemaining: 0,
      varianceAmount: 1000000,
      variancePercentage: 2.2,
      notes: 'Ligne de transformation farine panifiable certifiée.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    }
  ];

  for (const b of budgetsSeed) {
    if (!state.budgets.find((e: any) => e.id === b.id)) {
      state.budgets.push(b);
    }
  }

  // 3. Multi-year investment projects seed
  if (!state.investment_projects) state.investment_projects = [];
  const projectsSeed = [
    {
      id: 'inv-proj-001',
      organizationId: org1Id,
      projectName: 'Unité de Séchage Solaire et Transformation Export (Kindia)',
      initialInvestmentCapex: 150000000,
      discountRatePct: 12.0,
      inflationRatePct: 8.0,
      financingInterestRatePct: 10.0,
      taxRatePct: 25.0,
      projectLifespanYears: 5,
      annualRevenues: [85000000, 110000000, 135000000, 140000000, 150000000],
      annualOpexCosts: [35000000, 42000000, 48000000, 50000000, 52000000],
      terminalValue: 25000000,
      assumptionsNotes: 'Financement mixte fonds propres coopérative 40% et crédit agricole BND 60%.'
    }
  ];

  for (const p of projectsSeed) {
    if (!state.investment_projects.find((e: any) => e.id === p.id)) {
      state.investment_projects.push(p);
    }
  }
}

export function isPg(): boolean {
  return isPostgresConnected;
}

export function getPgPool(): pg.Pool | null {
  return pgPool;
}
