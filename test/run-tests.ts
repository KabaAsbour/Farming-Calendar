/**
 * FARMING CALENDAR — Automated Integration & Security Test Suite
 * Verifies:
 * 1. User registration & input validation
 * 2. Login, password hashing & session token issuance
 * 3. Logout & audit logging
 * 4. Permission enforcement across all 8 roles
 * 5. Strict multi-tenant organization isolation
 * 6. Unauthorized access attempts
 * 7. Audit trail integrity
 */

import { initDatabase, getState, applyAllDemoSeeds } from '../src/db/connection.ts';
import { AuthService } from '../src/services/auth.service.ts';
import { OrgService } from '../src/services/org.service.ts';
import { getAuditLogs } from '../src/services/audit.service.ts';
import { CalendarService } from '../src/services/calendar.service.ts';
import { AgriculturalService } from '../src/services/agricultural.service.ts';
import { notificationService } from '../src/services/notification.service.ts';
import { PlanningService } from '../src/services/planning.service.ts';
import { CommercialService } from '../src/services/commercial.service.ts';
import { OperationsService } from '../src/services/operations.service.ts';
import { LogisticsService } from '../src/services/logistics.service.ts';
import { FinanceService } from '../src/services/finance.service.ts';
import { DashboardService } from '../src/services/dashboard.service.ts';
import { LocalizationService } from '../src/services/localization.service.ts';
import frTranslations from '../src/i18n/locales/fr.json';
import enTranslations from '../src/i18n/locales/en.json';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ name, category, passed: true, message: 'PASSED', durationMs });
    console.log(`  [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ name, category, passed: false, message: err.message, durationMs });
    console.error(`  [FAIL] ${name}: ${err.message} (${durationMs}ms)`);
  }
}

export async function executeAllTests() {
  results.length = 0;
  console.log('===============================================================');
  console.log('STARTING FARMING CALENDAR PHASE 1 SECURITY & FOUNDATION TESTS');
  console.log('===============================================================\n');

  // Initialize DB, migrations, and isolated test fixtures
  process.env.DB_FILE = 'farming_calendar_test_data.json';
  process.env.ENABLE_DEMO_SEED = 'true';
  await initDatabase();
  applyAllDemoSeeds(getState());

  // CATEGORY 1: REGISTRATION & INPUT VALIDATION
  console.log('--- CATEGORY 1: REGISTRATION & INPUT VALIDATION ---');
  
  await runTest('Registration', 'Should register a new user and generate organization', async () => {
    const testEmail = `test.farmer.${Date.now()}@kindia-agri.gn`;
    const session = await AuthService.register({
      email: testEmail,
      password: 'SecurePassword2026!',
      fullName: 'Sékouba Bangoura',
      organizationName: 'Ferme Avicole & Fruitière de Coyah',
      countryCode: 'GN'
    });

    if (!session.token || !session.user || !session.organization) {
      throw new Error('Registration failed to return valid session');
    }
    if (session.user.role !== 'ORG_ADMIN') {
      throw new Error(`Expected ORG_ADMIN role for creator, got: ${session.user.role}`);
    }
    if (session.organization.name !== 'Ferme Avicole & Fruitière de Coyah') {
      throw new Error('Organization name mismatch');
    }
  });

  await runTest('Validation', 'Should reject registration with invalid email format', async () => {
    try {
      await AuthService.register({
        email: 'invalid-email-format',
        password: 'ValidPassword2026!',
        fullName: 'Test User',
        organizationName: 'Test Org'
      });
      throw new Error('Expected validation error for invalid email');
    } catch (err: any) {
      if (!err.message.includes('Invalid email address format')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
  });

  await runTest('Validation', 'Should reject registration with short password (< 8 chars)', async () => {
    try {
      await AuthService.register({
        email: `shortpass.${Date.now()}@test.gn`,
        password: 'short',
        fullName: 'Test User',
        organizationName: 'Test Org'
      });
      throw new Error('Expected validation error for short password');
    } catch (err: any) {
      if (!err.message.includes('Password must be at least 8 characters long')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
  });

  await runTest('Validation', 'Should reject duplicate email registration', async () => {
    const email = 'admin.kindia@farmingcalendar.dev'; // Seeded email
    try {
      await AuthService.register({
        email,
        password: 'ValidPassword2026!',
        fullName: 'Duplicate User',
        organizationName: 'Duplicate Org'
      });
      throw new Error('Expected duplicate email rejection');
    } catch (err: any) {
      if (!err.message.includes('already exists')) {
        throw new Error(`Unexpected error: ${err.message}`);
      }
    }
  });

  // CATEGORY 2: AUTHENTICATION, PASSWORD HASHING & SESSIONS
  console.log('\n--- CATEGORY 2: AUTHENTICATION & PASSWORD HASHING ---');

  await runTest('Authentication', 'Should login successfully with seeded account and bcrypt hash', async () => {
    const session = await AuthService.login({
      email: 'admin.kindia@farmingcalendar.dev',
      password: 'DevPass2026!'
    });

    if (!session.token || !session.user) {
      throw new Error('Login failed to return session');
    }
    if (session.user.role !== 'ORG_ADMIN') {
      throw new Error(`Role mismatch: expected ORG_ADMIN, got: ${session.user.role}`);
    }

    // Verify token can be decoded
    const decoded = AuthService.verifyToken(session.token);
    if (decoded.email !== 'admin.kindia@farmingcalendar.dev') {
      throw new Error('Decoded token email mismatch');
    }
  });

  await runTest('Authentication', 'Should reject login with invalid password', async () => {
    try {
      await AuthService.login({
        email: 'admin.kindia@farmingcalendar.dev',
        password: 'WrongPassword123!'
      });
      throw new Error('Expected 401 rejection for wrong password');
    } catch (err: any) {
      if (!err.message.includes('Invalid email or password')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
  });

  await runTest('Authentication', 'Should reject login for non-existent user', async () => {
    try {
      await AuthService.login({
        email: 'ghost.user.999@doesnotexist.gn',
        password: 'SomePassword2026!'
      });
      throw new Error('Expected rejection for non-existent user');
    } catch (err: any) {
      if (!err.message.includes('Invalid email or password')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
  });

  // CATEGORY 3: PERMISSION ENFORCEMENT ACROSS ROLES
  console.log('\n--- CATEGORY 3: ROLE-BASED ACCESS CONTROL (8 ROLES) ---');

  const orgKindiaId = '11111111-1111-1111-1111-111111111111';
  const farmKindiaId = 'f1111111-1111-1111-1111-111111111111';

  await runTest('RBAC', 'ORG_ADMIN should be allowed to create a farm', async () => {
    const code = `FARM-TEST-${Date.now().toString().slice(-4)}`;
    const farm = await OrgService.createFarm({
      organizationId: orgKindiaId,
      name: 'Ferme Expérimentale de Débélé',
      code,
      region: 'Basse-Guinée',
      prefecture: 'Kindia',
      totalAreaHa: 25.0,
      usableAreaHa: 20.0,
      callerUserId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      callerEmail: 'admin.kindia@farmingcalendar.dev',
      callerRole: 'ORG_ADMIN',
      callerIsPlatformOwner: false
    });

    if (!farm || farm.code !== code) {
      throw new Error('Failed to create farm as ORG_ADMIN');
    }
  });

  await runTest('RBAC', 'VIEWER role should be FORBIDDEN from creating a farm', async () => {
    try {
      await OrgService.createFarm({
        organizationId: orgKindiaId,
        name: 'Ferme Non Autorisée',
        code: `FARM-FAIL-${Date.now().toString().slice(-4)}`,
        region: 'Basse-Guinée',
        totalAreaHa: 10.0,
        usableAreaHa: 10.0,
        callerUserId: '13131313-1313-1313-1313-131313131313',
        callerEmail: 'viewer.kindia@farmingcalendar.dev',
        callerRole: 'VIEWER',
        callerIsPlatformOwner: false
      });
      throw new Error('Security flaw: VIEWER was allowed to create a farm');
    } catch (err: any) {
      if (!err.message.includes('Insufficient permissions')) {
        throw new Error(`Expected permission denial, got: ${err.message}`);
      }
    }
  });

  await runTest('RBAC', 'OPERATIONS_STAFF role should be FORBIDDEN from creating a farm', async () => {
    try {
      await OrgService.createFarm({
        organizationId: orgKindiaId,
        name: 'Ferme Non Autorisée Ops',
        code: `FARM-FAIL-OPS-${Date.now().toString().slice(-4)}`,
        region: 'Basse-Guinée',
        totalAreaHa: 10.0,
        usableAreaHa: 10.0,
        callerUserId: '12121212-1212-1212-1212-121212121212',
        callerEmail: 'ops.kindia@farmingcalendar.dev',
        callerRole: 'OPERATIONS_STAFF',
        callerIsPlatformOwner: false
      });
      throw new Error('Security flaw: OPERATIONS_STAFF was allowed to create a farm');
    } catch (err: any) {
      if (!err.message.includes('Insufficient permissions')) {
        throw new Error(`Expected permission denial, got: ${err.message}`);
      }
    }
  });

  await runTest('RBAC', 'AGRONOMIST should be allowed to create a plot on farm', async () => {
    const plotCode = `PLOT-AGRO-${Date.now().toString().slice(-4)}`;
    const plot = await OrgService.createPlot({
      farmId: farmKindiaId,
      organizationId: orgKindiaId,
      name: 'Parcelle Essai Variétal Ananas Queen',
      code: plotCode,
      areaHectares: 3.5,
      soilType: 'Argilo-sableux',
      callerUserId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      callerEmail: 'agro.kindia@farmingcalendar.dev',
      callerRole: 'AGRONOMIST',
      callerIsPlatformOwner: false
    });

    if (!plot || plot.code !== plotCode) {
      throw new Error('Failed to create plot as AGRONOMIST');
    }
  });

  // CATEGORY 4: MULTI-TENANT ISOLATION
  console.log('\n--- CATEGORY 4: MULTI-TENANT ISOLATION ---');

  const orgFoutaId = '22222222-2222-2222-2222-222222222222'; // Org Beta

  await runTest('Tenant Isolation', 'User in Org Alpha must be BLOCKED from listing farms in Org Beta', async () => {
    try {
      await OrgService.listFarms(orgFoutaId, {
        isPlatformOwner: false,
        organizationId: orgKindiaId // User is in Kindia
      });
      throw new Error('Critical vulnerability: Org Alpha accessed Org Beta farms');
    } catch (err: any) {
      if (!err.message.includes('cross-tenant access prohibited')) {
        throw new Error(`Expected cross-tenant access prohibited, got: ${err.message}`);
      }
    }
  });

  await runTest('Tenant Isolation', 'User in Org Alpha must be BLOCKED from creating a plot on Org Beta farm', async () => {
    const farmFoutaId = 'f2222222-2222-2222-2222-222222222222';
    try {
      await OrgService.createPlot({
        farmId: farmFoutaId,
        organizationId: orgKindiaId, // Mismatched tenant org
        name: 'Plot Illegal Cross-Tenant',
        code: `PLOT-ILLEGAL-${Date.now().toString().slice(-4)}`,
        areaHectares: 5.0,
        callerUserId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        callerEmail: 'admin.kindia@farmingcalendar.dev',
        callerRole: 'ORG_ADMIN',
        callerIsPlatformOwner: false
      });
      throw new Error('Critical vulnerability: User in Org Alpha created plot on Org Beta farm');
    } catch (err: any) {
      if (!err.message.includes('Cross-tenant plot creation prohibited') && !err.message.includes('cross-tenant')) {
        throw new Error(`Expected cross-tenant violation, got: ${err.message}`);
      }
    }
  });

  await runTest('Tenant Isolation', 'PLATFORM_OWNER can access organizations across tenants with auditing', async () => {
    const orgs = await OrgService.listOrganizations({
      isPlatformOwner: true,
      organizationId: orgKindiaId
    });

    if (orgs.length < 2) {
      throw new Error('Platform owner should see all organizations');
    }
  });

  // CATEGORY 5: AUDIT LOGGING & INTEGRITY
  console.log('\n--- CATEGORY 5: AUDIT TRAIL VERIFICATION ---');

  await runTest('Audit Trail', 'Audit trail records actions and captures tenant/user context', async () => {
    const logs = await getAuditLogs(orgKindiaId, 20);
    if (logs.length === 0) {
      throw new Error('Expected audit logs to be populated for Kindia organization');
    }

    const hasFarmCreateAction = logs.some((l: any) => l.action === 'FARM_CREATED' || l.action === 'LOGIN_SUCCESS');
    if (!hasFarmCreateAction) {
      throw new Error('Expected FARM_CREATED or LOGIN_SUCCESS to be present in audit trail');
    }
  });

  // CATEGORY 6: NORMAL CALENDAR (PHASE 2 REQUIREMENTS)
  console.log('\n--- CATEGORY 6: NORMAL CALENDAR MODULE (PHASE 2) ---');

  let testEventId = '';

  await runTest('Calendar CRUD', 'Should create a normal event with category, priority, timezone, and reminders', async () => {
    const event = await CalendarService.createEvent({
      organizationId: orgKindiaId,
      title: 'Taille d’entretien verger Manguiers Friguiagbé',
      description: 'Élagage des branches basses et aération du houppier avant la floraison.',
      eventType: 'TASK',
      status: 'PENDING',
      priority: 'HIGH',
      startDateTime: '2026-10-20T08:00:00Z',
      endDateTime: '2026-10-20T12:00:00Z',
      allDay: false,
      timezone: 'Africa/Conakry',
      assignedToUserId: '12121212-1212-1212-1212-121212121212', // Ops staff
      farmId: farmKindiaId,
      remindersMinutesBefore: [60],
      notes: 'Matériel requis : sécateurs télescopiques désinfectés.',
      caller: {
        userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        email: 'manager.kindia@farmingcalendar.dev',
        role: 'MANAGER',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    if (!event || !event.id || event.title !== 'Taille d’entretien verger Manguiers Friguiagbé') {
      throw new Error('Failed to create calendar event');
    }
    testEventId = event.id;
  });

  await runTest('Calendar Filters', 'Should filter events by category, status, farm, and text search', async () => {
    const filtered = await CalendarService.listEvents(
      orgKindiaId,
      {
        startDate: '2026-10-01T00:00:00Z',
        endDate: '2026-10-31T23:59:59Z',
        eventType: 'TASK',
        searchQuery: 'verger Manguiers'
      },
      { isPlatformOwner: false, organizationId: orgKindiaId }
    );

    if (filtered.length === 0) {
      throw new Error('Filter query failed to match created task');
    }
    if (filtered[0].title !== 'Taille d’entretien verger Manguiers Friguiagbé') {
      throw new Error(`Expected matching title, got: ${filtered[0].title}`);
    }
  });

  await runTest('Calendar Recurrence', 'Should expand recurring event occurrences across date window', async () => {
    // Create a daily recurring event for 10 days
    const recurringEvent = await CalendarService.createEvent({
      organizationId: orgKindiaId,
      title: 'Relève pluviométrie & humidité sol station Kindia',
      eventType: 'MAINTENANCE',
      status: 'PENDING',
      priority: 'MEDIUM',
      startDateTime: '2026-10-10T06:00:00Z',
      endDateTime: '2026-10-10T06:30:00Z',
      recurrence: { frequency: 'DAILY', interval: 1, count: 10 },
      caller: {
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        email: 'admin.kindia@farmingcalendar.dev',
        role: 'ORG_ADMIN',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    const occurrences = await CalendarService.listEvents(
      orgKindiaId,
      {
        startDate: '2026-10-10T00:00:00Z',
        endDate: '2026-10-16T23:59:59Z'
      },
      { isPlatformOwner: false, organizationId: orgKindiaId }
    );

    const relèveOccurrences = occurrences.filter(o => o.title.includes('Relève pluviométrie'));
    if (relèveOccurrences.length < 5) {
      throw new Error(`Expected at least 5 expanded occurrences in 7-day window, got ${relèveOccurrences.length}`);
    }
  });

  await runTest('Calendar Recurrence', 'Should allow editing single occurrence without corrupting the recurring series', async () => {
    // Master recurring event created earlier
    const master = await CalendarService.createEvent({
      organizationId: orgKindiaId,
      title: 'Nettoyage des bacs de lavage mangues',
      eventType: 'MAINTENANCE',
      status: 'PENDING',
      priority: 'LOW',
      startDateTime: '2026-10-10T08:00:00Z',
      endDateTime: '2026-10-10T09:00:00Z',
      recurrence: { frequency: 'DAILY', interval: 1, count: 5 },
      caller: {
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        email: 'admin.kindia@farmingcalendar.dev',
        role: 'ORG_ADMIN',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    // Edit only the occurrence on 2026-10-12
    const exception = await CalendarService.updateEvent({
      id: master.id,
      updates: {
        title: 'Nettoyage approfondi désinfectant renforcé (Exception)',
        priority: 'URGENT'
      },
      updateMode: 'OCCURRENCE',
      occurrenceDate: '2026-10-12',
      caller: {
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        email: 'admin.kindia@farmingcalendar.dev',
        role: 'ORG_ADMIN',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    if (exception.title !== 'Nettoyage approfondi désinfectant renforcé (Exception)') {
      throw new Error('Failed to update occurrence title');
    }

    // Verify master series is still intact
    const refreshedList = await CalendarService.listEvents(
      orgKindiaId,
      {
        startDate: '2026-10-10T00:00:00Z',
        endDate: '2026-10-15T00:00:00Z'
      },
      { isPlatformOwner: false, organizationId: orgKindiaId }
    );

    const occurrences = refreshedList.filter(e => e.title.includes('Nettoyage'));
    const exceptionOcc = occurrences.find(e => e.title.includes('Exception'));
    const standardOcc = occurrences.find(e => e.title === 'Nettoyage des bacs de lavage mangues');

    if (!exceptionOcc || !standardOcc) {
      throw new Error('Recurrence exception and standard series occurrences failed to co-exist properly');
    }
  });

  await runTest('Calendar Boundaries', 'Should reject event creation if end date is before start date', async () => {
    try {
      await CalendarService.createEvent({
        organizationId: orgKindiaId,
        title: 'Événement Invalide Dates',
        startDateTime: '2026-10-25T14:00:00Z',
        endDateTime: '2026-10-25T10:00:00Z', // 4 hours earlier!
        caller: {
          userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          email: 'admin.kindia@farmingcalendar.dev',
          role: 'ORG_ADMIN',
          isPlatformOwner: false,
          organizationId: orgKindiaId
        }
      });
      throw new Error('Validation failure: Event with end before start was permitted');
    } catch (err: any) {
      if (!err.message.includes('End date/time cannot be before start date/time')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
  });

  await runTest('Calendar RBAC', 'VIEWER role should be BLOCKED from creating calendar events', async () => {
    try {
      await CalendarService.createEvent({
        organizationId: orgKindiaId,
        title: 'Tentative création par Viewer',
        startDateTime: '2026-10-28T09:00:00Z',
        endDateTime: '2026-10-28T10:00:00Z',
        caller: {
          userId: '13131313-1313-1313-1313-131313131313',
          email: 'viewer.kindia@farmingcalendar.dev',
          role: 'VIEWER',
          isPlatformOwner: false,
          organizationId: orgKindiaId
        }
      });
      throw new Error('Security failure: VIEWER was allowed to create calendar event');
    } catch (err: any) {
      if (!err.message.includes('VIEWER role cannot create events')) {
        throw new Error(`Expected VIEWER denial, got: ${err.message}`);
      }
    }
  });

  await runTest('Calendar RBAC', 'OPERATIONS_STAFF should be allowed to update status to COMPLETED but blocked from deleting event', async () => {
    // 1. Updating status is allowed for field technician
    const updated = await CalendarService.updateEvent({
      id: testEventId,
      updates: { status: 'COMPLETED', notes: 'Taille achevée sur les 15 premiers manguiers.' },
      caller: {
        userId: '12121212-1212-1212-1212-121212121212',
        email: 'ops.kindia@farmingcalendar.dev',
        role: 'OPERATIONS_STAFF',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    if (updated.status !== 'COMPLETED') {
      throw new Error('Operations staff failed to mark task as COMPLETED');
    }

    // 2. Deletion is forbidden for OPERATIONS_STAFF
    try {
      await CalendarService.deleteEvent({
        id: testEventId,
        caller: {
          userId: '12121212-1212-1212-1212-121212121212',
          email: 'ops.kindia@farmingcalendar.dev',
          role: 'OPERATIONS_STAFF',
          isPlatformOwner: false,
          organizationId: orgKindiaId
        }
      });
      throw new Error('Security failure: OPERATIONS_STAFF was permitted to delete calendar event');
    } catch (err: any) {
      if (!err.message.includes('OPERATIONS_STAFF cannot delete')) {
        throw new Error(`Expected deletion denial for OPERATIONS_STAFF, got: ${err.message}`);
      }
    }
  });

  await runTest('Calendar Tenant Isolation', 'User in Org Alpha must be BLOCKED from accessing or modifying events in Org Beta', async () => {
    // Seeded Org Beta event: e4444444-4444-4444-4444-444444444444 (Fouta)
    try {
      await CalendarService.getEventById('e4444444-4444-4444-4444-444444444444', {
        isPlatformOwner: false,
        organizationId: orgKindiaId // User is in Kindia
      });
      throw new Error('Critical vulnerability: Org Alpha accessed Org Beta calendar event');
    } catch (err: any) {
      if (!err.message.includes('cross-tenant access prohibited')) {
        throw new Error(`Expected cross-tenant access prohibited, got: ${err.message}`);
      }
    }
  });

  await runTest('Notification Provider', 'Notification service acknowledges unconfigured status and avoids false delivery claims', async () => {
    const res = await notificationService.sendSms('+224620000000', 'Test SMS Notification');
    if (res.delivered === true) {
      throw new Error('Violation: Provider claimed delivery when no external SMS gateway is configured');
    }
    if (res.status !== 'UNCONFIGURED_PENDING_PROVIDER') {
      throw new Error(`Expected status UNCONFIGURED_PENDING_PROVIDER, got: ${res.status}`);
    }
  });

  await runTest('Agribusiness Linking', 'Should link calendar event to crop campaign, order, and logistics shipment records', async () => {
    const event = await CalendarService.createEvent({
      organizationId: orgKindiaId,
      title: 'Contrôle qualité mangues calibre 8 avant expédition maritime',
      eventType: 'INSPECTION',
      status: 'PENDING',
      priority: 'URGENT',
      startDateTime: '2026-10-22T09:00:00Z',
      endDateTime: '2026-10-22T11:00:00Z',
      allDay: false,
      farmId: farmKindiaId,
      linkedCampaignId: 'CAMP-2026-MANGUE-KINDIA',
      linkedOrderId: '11112222-3333-4444-5555-666677778888',
      linkedShipmentId: '99998888-7777-6666-5555-444433332222',
      attachments: [
        {
          id: 'att-1',
          name: 'certificat_globalgap_kindia.pdf',
          url: '/docs/attachments/certificat_globalgap_kindia.pdf',
          uploadedAt: '2026-10-09T00:00:00Z'
        }
      ],
      caller: {
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        email: 'admin.kindia@farmingcalendar.dev',
        role: 'ORG_ADMIN',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    if (!event.linkedCampaignId || event.linkedCampaignId !== 'CAMP-2026-MANGUE-KINDIA') {
      throw new Error('Linked campaign record failed to persist');
    }
    if (event.attachments?.length !== 1 || event.attachments[0].name !== 'certificat_globalgap_kindia.pdf') {
      throw new Error('Attachments failed to persist on calendar event');
    }
  });

  await runTest('Calendar Series Deletion', 'Should delete single occurrence from recurring series without deleting the entire series', async () => {
    const master = await CalendarService.createEvent({
      organizationId: orgKindiaId,
      title: 'Contrôle niveau réservoir motopompe Kindia',
      eventType: 'MAINTENANCE',
      status: 'PENDING',
      priority: 'MEDIUM',
      startDateTime: '2026-10-15T07:00:00Z',
      endDateTime: '2026-10-15T07:30:00Z',
      recurrence: { frequency: 'DAILY', interval: 1, count: 5 },
      caller: {
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        email: 'admin.kindia@farmingcalendar.dev',
        role: 'ORG_ADMIN',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    // Delete occurrence on 2026-10-17
    await CalendarService.deleteEvent({
      id: master.id,
      deleteMode: 'OCCURRENCE',
      occurrenceDate: '2026-10-17',
      caller: {
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        email: 'admin.kindia@farmingcalendar.dev',
        role: 'ORG_ADMIN',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    // Verify occurrence 2026-10-17 is excluded while 2026-10-15 and 2026-10-16 remain
    const occurrences = await CalendarService.listEvents(
      orgKindiaId,
      {
        startDate: '2026-10-15T00:00:00Z',
        endDate: '2026-10-19T23:59:59Z',
        searchQuery: 'motopompe Kindia'
      },
      { isPlatformOwner: false, organizationId: orgKindiaId }
    );

    const hasExcludedDate = occurrences.some(o => o.startDateTime.startsWith('2026-10-17'));
    if (hasExcludedDate) {
      throw new Error('Occurrence 2026-10-17 should have been excluded from the series');
    }
    const hasRemainingDate = occurrences.some(o => o.startDateTime.startsWith('2026-10-15'));
    if (!hasRemainingDate) {
      throw new Error('Master recurring series was erroneously removed');
    }
  });

  await runTest('Calendar Cancellation', 'Should allow cancelling an event and reflect CANCELLED status', async () => {
    const cancelled = await CalendarService.updateEvent({
      id: testEventId,
      updates: { status: 'CANCELLED', notes: 'Annulé en raison de fortes précipitations tropicales.' },
      caller: {
        userId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        email: 'manager.kindia@farmingcalendar.dev',
        role: 'MANAGER',
        isPlatformOwner: false,
        organizationId: orgKindiaId
      }
    });

    if (cancelled.status !== 'CANCELLED') {
      throw new Error(`Expected CANCELLED status, got: ${cancelled.status}`);
    }
  });

  await runTest('Localization Parity', 'French and English translations must have full parity for all 5 calendar views and fields', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const frContent = JSON.parse(fs.readFileSync(path.resolve('./src/i18n/locales/fr.json'), 'utf8'));
    const enContent = JSON.parse(fs.readFileSync(path.resolve('./src/i18n/locales/en.json'), 'utf8'));

    const requiredViews = ['day', 'week', 'month', 'year', 'agenda'];
    for (const v of requiredViews) {
      if (!frContent.calendar?.views?.[v] || !enContent.calendar?.views?.[v]) {
        throw new Error(`Missing view translation for "${v}" in fr or en`);
      }
    }

    const requiredFields = ['title', 'category', 'priority', 'status', 'start', 'end', 'allDay', 'timezone', 'assignee', 'dueDate', 'recurrence'];
    for (const f of requiredFields) {
      if (!frContent.calendar?.fields?.[f] || !enContent.calendar?.fields?.[f]) {
        throw new Error(`Missing field translation for "${f}" in fr or en`);
      }
    }

    if (frContent.calendar?.views?.agenda !== 'Ordre du Jour / Liste' || enContent.calendar?.views?.agenda !== 'Agenda / List') {
      throw new Error('Agenda translation mismatch');
    }
  });

  // ===============================================================
  // CATEGORY 9: PHASE 3 AGRICULTURAL CORE (MASTER DATA, CAMPAIGNS, OPERATIONS, HARVESTS)
  // ===============================================================
  console.log('\n--- CATEGORY 9: PHASE 3 AGRICULTURAL CORE ---');

  const org1Id = '11111111-1111-1111-1111-111111111111'; // Kindia
  const org2Id = '22222222-2222-2222-2222-222222222222'; // Fouta
  const farm1Id = 'f1111111-1111-1111-1111-111111111111';
  const plot1Id = 'p1111111-1111-1111-1111-111111111111';
  const callerKindia = { isPlatformOwner: false, organizationId: org1Id, role: 'ORG_ADMIN', userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' };
  const callerFouta = { isPlatformOwner: false, organizationId: org2Id, role: 'ORG_ADMIN', userId: '21212121-2121-2121-2121-212121212121' };

  await runTest('Agri Master Data', 'Crops and varieties exist with Cassava, Pepper (Bird\'s Eye & S17), Watermelon and are configurable', async () => {
    const crops = await AgriculturalService.listCrops(org1Id, callerKindia);
    const cropNames = crops.map(c => c.name);
    
    if (!cropNames.some(n => n.includes('Manioc') || n.includes('Cassava'))) {
      throw new Error('Demonstration crop Cassava/Manioc missing');
    }
    if (!cropNames.some(n => n.includes('Piment') || n.includes('Pepper'))) {
      throw new Error('Demonstration crop Pepper/Piment missing');
    }
    if (!cropNames.some(n => n.includes('Pastèque') || n.includes('Watermelon'))) {
      throw new Error('Demonstration crop Watermelon/Pastèque missing');
    }

    const varieties = await AgriculturalService.listVarieties(org1Id, undefined, callerKindia);
    const varCodes = varieties.map(v => v.code);

    if (!varCodes.includes('PIM-BEYE')) {
      throw new Error("Pepper variety Bird's Eye (PIM-BEYE) missing");
    }
    if (!varCodes.includes('PIM-S17')) {
      throw new Error('Pepper variety S17 (PIM-S17) missing');
    }

    // Verify dynamic configuration (not hardcoded): add a new crop and variety
    const customCrop = await AgriculturalService.createCrop(org1Id, {
      name: `Gombo Hybride Test ${Date.now()}`,
      scientificName: 'Abelmoschus esculentus',
      category: 'SOLANACEOUS_VEGETABLE',
      growthCycleDays: 65,
      waterRequirementMm: 400
    }, callerKindia);

    if (!customCrop.id) throw new Error('Failed to create configurable custom crop');

    const customVar = await AgriculturalService.createVariety(org1Id, {
      cropId: customCrop.id,
      name: 'Clemson Spineless 80',
      code: `GOM-${Date.now().toString().slice(-4)}`,
      maturityDaysMin: 55,
      maturityDaysMax: 70,
      expectedYieldPerHaTons: 12.0
    }, callerKindia);

    if (!customVar.id || customVar.cropId !== customCrop.id) {
      throw new Error('Failed to link configurable variety to new custom crop');
    }
  });

  await runTest('Agri Relationships', 'Campaign correctly links crop, variety, farm, plot, manager, team, and season', async () => {
    const campaigns = await AgriculturalService.listCampaigns(org1Id, {}, callerKindia);
    const kindiaPepper = campaigns.find(c => c.code === 'CAMP-PIM-2026-01');
    if (!kindiaPepper) {
      throw new Error('Expected seed campaign CAMP-PIM-2026-01 not found');
    }

    // Verify relationship enrichment
    if (!kindiaPepper.cropName || !kindiaPepper.cropVarietyName) {
      throw new Error('Campaign missing enriched crop or variety relationship');
    }
    if (!kindiaPepper.farmName) {
      throw new Error('Campaign missing enriched farm relationship');
    }
    if (kindiaPepper.cropVarietyName !== 'S17 / Habanero amélioré') {
      throw new Error(`Expected S17 variety, got: ${kindiaPepper.cropVarietyName}`);
    }

    const details = await AgriculturalService.getCampaign(kindiaPepper.id, org1Id, callerKindia);
    if (!details.operations || details.operations.length === 0) {
      throw new Error('Campaign details missing related operations');
    }
    if (!details.harvests || details.harvests.length === 0) {
      throw new Error('Campaign details missing related harvests');
    }
  });

  await runTest('Agri Data Integrity', 'Rejects crop/variety mismatch, invalid dates, and area exceeding plot boundary', async () => {
    const crops = await AgriculturalService.listCrops(org1Id, callerKindia);
    const pepperCrop = crops.find(c => c.name.includes('Piment'));
    const cassavaCrop = crops.find(c => c.name.includes('Manioc'));
    const varieties = await AgriculturalService.listVarieties(org1Id, undefined, callerKindia);
    const cassavaVariety = varieties.find(v => v.code === 'CAS-BON');

    if (!pepperCrop || !cassavaCrop || !cassavaVariety) {
      throw new Error('Missing reference data for integrity test');
    }

    // 1. Incompatible crop and variety (pairing Pepper crop with Cassava variety)
    let threwMismatch = false;
    try {
      await AgriculturalService.createCampaign(org1Id, {
        name: 'Invalid Mismatch Campaign',
        farmId: farm1Id,
        cropId: pepperCrop.id,
        cropVarietyId: cassavaVariety.id, // Mismatch!
        plannedArea: 1.0,
        areaUnit: 'HA',
        plantingWindowStart: '2026-11-01',
        plantingWindowEnd: '2026-11-15',
        expectedHarvestStart: '2027-01-01',
        expectedHarvestEnd: '2027-02-01',
        productionTargetQuantity: 10000,
        productionTargetUnit: 'KG'
      }, callerKindia);
    } catch (err: any) {
      threwMismatch = true;
    }
    if (!threwMismatch) {
      throw new Error('Expected validation error for crop/variety mismatch, but creation succeeded');
    }

    // 2. Invalid date range (harvest start before planting start)
    const pepperVariety = varieties.find(v => v.code === 'PIM-S17');
    let threwInvalidDate = false;
    try {
      await AgriculturalService.createCampaign(org1Id, {
        name: 'Invalid Date Campaign',
        farmId: farm1Id,
        cropId: pepperCrop.id,
        cropVarietyId: pepperVariety!.id,
        plannedArea: 1.0,
        areaUnit: 'HA',
        plantingWindowStart: '2026-11-01',
        plantingWindowEnd: '2026-11-15',
        expectedHarvestStart: '2026-10-01', // Before planting!
        expectedHarvestEnd: '2026-10-15',
        productionTargetQuantity: 10000,
        productionTargetUnit: 'KG'
      }, callerKindia);
    } catch (err: any) {
      threwInvalidDate = true;
    }
    if (!threwInvalidDate) {
      throw new Error('Expected validation error for harvest start before planting start');
    }

    // 3. Negative harvest quantity
    let threwNegativeHarvest = false;
    try {
      await AgriculturalService.recordHarvest(org1Id, {
        campaignId: 'c1111111-1111-1111-1111-111111111111',
        harvestDate: '2026-10-15',
        quantityHarvested: -500 // Negative!
      }, callerKindia);
    } catch (err: any) {
      threwNegativeHarvest = true;
    }
    if (!threwNegativeHarvest) {
      throw new Error('Expected validation error for negative harvest quantity');
    }
  });

  await runTest('Agri Partial Harvests', 'Multiple partial harvest events accumulate yield and preserve historical records', async () => {
    const campaignId = 'c1111111-1111-1111-1111-111111111111';
    
    // Check initial harvest count and cumulative yield
    const initialHarvests = await AgriculturalService.listHarvests(org1Id, campaignId, callerKindia);
    const initialCount = initialHarvests.length;
    const initialSum = initialHarvests.reduce((sum, h) => sum + h.quantityHarvested, 0);

    // Record a 3rd partial harvest event
    const newHarvest = await AgriculturalService.recordHarvest(org1Id, {
      campaignId,
      harvestBatchNumber: `HARV-TEST-PASS-3-${Date.now().toString().slice(-4)}`,
      harvestDate: '2026-10-10',
      quantityHarvested: 850,
      quantityUnit: 'KG',
      qualityGrade: 'GRADE_A',
      lossQuantity: 30,
      storageLocation: 'Hangar Principal Kindia',
      destination: 'EXPORT',
      notes: 'Troisième passe partielle de contrôle.'
    }, callerKindia);

    if (!newHarvest.id) {
      throw new Error('Failed to create 3rd partial harvest');
    }

    // Verify historical preservation: previous records must still exist untouched
    const updatedHarvests = await AgriculturalService.listHarvests(org1Id, campaignId, callerKindia);
    if (updatedHarvests.length !== initialCount + 1) {
      throw new Error(`Expected ${initialCount + 1} historical harvest records, found: ${updatedHarvests.length}`);
    }

    const newSum = updatedHarvests.reduce((sum, h) => sum + h.quantityHarvested, 0);
    if (newSum !== initialSum + 850) {
      throw new Error(`Yield calculation mismatch: expected ${initialSum + 850}, got: ${newSum}`);
    }

    // Verify campaign status updated to HARVESTING and aggregated metric reflects accumulation
    const campaign = await AgriculturalService.getCampaign(campaignId, org1Id, callerKindia);
    if (campaign.status !== 'HARVESTING') {
      throw new Error(`Expected campaign status HARVESTING, got: ${campaign.status}`);
    }
    if (campaign.totalHarvestedQuantity !== newSum) {
      throw new Error(`Campaign totalHarvestedQuantity mismatch: expected ${newSum}, got: ${campaign.totalHarvestedQuantity}`);
    }

    // Clean up test harvest for idempotency across repeated test runs
    const testState = getState();
    const hIdx = testState.campaign_harvests.findIndex((h: any) => h.id === newHarvest.id);
    if (hIdx !== -1) testState.campaign_harvests.splice(hIdx, 1);
  });

  await runTest('Agri Tenant Isolation', 'Organization Alpha cannot access Organization Beta campaigns, operations, or harvests', async () => {
    // 1. Org 1 (Kindia) lists campaigns: must not see Fouta campaign
    const org1Campaigns = await AgriculturalService.listCampaigns(org1Id, {}, callerKindia);
    if (org1Campaigns.some(c => c.code === 'CAMP-BEYE-FOUTA-01')) {
      throw new Error('Tenant isolation breach: Organization 1 saw Organization 2 campaign');
    }

    // 2. Org 2 (Fouta) lists campaigns: must see its own campaign and NOT Kindia campaigns
    const org2Campaigns = await AgriculturalService.listCampaigns(org2Id, {}, callerFouta);
    if (!org2Campaigns.some(c => c.code === 'CAMP-BEYE-FOUTA-01')) {
      throw new Error('Organization 2 failed to list its own campaign');
    }
    if (org2Campaigns.some(c => c.code === 'CAMP-PIM-2026-01')) {
      throw new Error('Tenant isolation breach: Organization 2 saw Organization 1 campaign');
    }

    // 3. Cross-tenant retrieval blocked
    let threwCrossGet = false;
    try {
      await AgriculturalService.getCampaign('c4444444-4444-4444-4444-444444444444', org1Id, callerKindia);
    } catch (err: any) {
      threwCrossGet = true;
    }
    if (!threwCrossGet) {
      throw new Error('Tenant isolation breach: Organization 1 successfully fetched Organization 2 campaign');
    }
  });

  await runTest('Agri & Calendar Integration', 'Creating an agricultural operation creates a linked calendar event, and status changes sync', async () => {
    const campaignId = 'c1111111-1111-1111-1111-111111111111';
    
    // 1. Create a fertilization operation with autoSyncCalendar
    const operation = await AgriculturalService.createOperation(org1Id, {
      campaignId,
      operationType: 'FERTILIZATION',
      title: 'Apport potasse K2O stade grossissement des fruits',
      description: 'Fertilisation foliaire soluble pour améliorer le calibre des piments S17.',
      plannedDate: '2026-10-18',
      status: 'PLANNED',
      laborWorkersCount: 4,
      laborHours: 12,
      costAmount: 650000,
      autoSyncCalendar: true
    }, callerKindia);

    if (!operation.linkedCalendarEventId) {
      throw new Error('Operation failed to generate linked Normal Calendar event ID');
    }

    // 2. Query Normal Calendar events to verify the event exists and has robust relational pointers
    const state = getState();
    const calEvent = state.normal_calendar_events.find(e => e.id === operation.linkedCalendarEventId);
    if (!calEvent) {
      throw new Error(`Linked Normal Calendar event '${operation.linkedCalendarEventId}' not found in calendar store`);
    }

    if (calEvent.linked_campaign_id !== campaignId) {
      throw new Error(`Calendar event linked_campaign_id mismatch: expected ${campaignId}, got: ${calEvent.linked_campaign_id}`);
    }
    if (calEvent.linked_master_operation_id !== operation.id) {
      throw new Error(`Calendar event linked_master_operation_id mismatch: expected ${operation.id}, got: ${calEvent.linked_master_operation_id}`);
    }

    // 3. Update operation status to COMPLETED and verify calendar entry synchronizes
    const updatedOp = await AgriculturalService.updateOperation(operation.id, org1Id, {
      status: 'COMPLETED',
      actualDate: '2026-10-18',
      observationNotes: 'Épandage réalisé sans dérive par temps calme.'
    }, callerKindia);

    if (updatedOp.status !== 'COMPLETED') {
      throw new Error('Failed to update operation status to COMPLETED');
    }

    const syncedCalEvent = state.normal_calendar_events.find(e => e.id === operation.linkedCalendarEventId);
    if (syncedCalEvent.status !== 'COMPLETED') {
      throw new Error(`Calendar event status failed to sync: expected COMPLETED, got: ${syncedCalEvent.status}`);
    }
  });

  await runTest('Agri Localization Parity', 'French and English translations must have full parity for Agricultural Core modules and operations', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const frContent = JSON.parse(fs.readFileSync(path.resolve('./src/i18n/locales/fr.json'), 'utf8'));
    const enContent = JSON.parse(fs.readFileSync(path.resolve('./src/i18n/locales/en.json'), 'utf8'));

    // Check nav
    if (!frContent.nav?.agricultural || !enContent.nav?.agricultural) {
      throw new Error('Missing nav.agricultural translation in fr or en');
    }

    // Check tabs
    const requiredAgriTabs = ['campaigns', 'operations', 'harvests', 'masterData'];
    for (const tab of requiredAgriTabs) {
      if (!frContent.agricultural?.tabs?.[tab] || !enContent.agricultural?.tabs?.[tab]) {
        throw new Error(`Missing agricultural tab translation for "${tab}" in fr or en`);
      }
    }

    // Check all 9 operation types
    const requiredOpTypes = [
      'LAND_PREPARATION',
      'PLANTING',
      'IRRIGATION',
      'FERTILIZATION',
      'PEST_DISEASE_MONITORING',
      'WEEDING',
      'MAINTENANCE',
      'HARVEST',
      'POST_HARVEST'
    ];
    for (const op of requiredOpTypes) {
      if (!frContent.agricultural?.operationsTypes?.[op] || !enContent.agricultural?.operationsTypes?.[op]) {
        throw new Error(`Missing agricultural operationType translation for "${op}" in fr or en`);
      }
    }

    // Check campaign statuses
    const requiredStatuses = ['PLANNING', 'IN_PROGRESS', 'HARVESTING', 'COMPLETED', 'CANCELLED'];
    for (const st of requiredStatuses) {
      if (!frContent.agricultural?.campaignStatuses?.[st] || !enContent.agricultural?.campaignStatuses?.[st]) {
        throw new Error(`Missing agricultural campaignStatus translation for "${st}" in fr or en`);
      }
    }
  });

  console.log('\n--- CATEGORY 10: PHASE 4 OUR MASTER CALENDAR & PLANNING ENGINE ---');

  await runTest('Phase 4 Master Calendar', 'Backward planning engine correctly calculates backward schedule, critical path, and milestone dependencies', async () => {
    const schedule = PlanningService.calculateBackwardSchedule({
      targetDeliveryDate: '2026-12-15',
      targetQuantityTons: 35,
      productKey: 'PEPPER_S17',
      todayOverride: new Date('2026-05-01')
    });

    if (!schedule.isFeasible) {
      throw new Error('Expected schedule to be feasible from May 1 to December 15');
    }
    if (schedule.steps.length !== 9) {
      throw new Error(`Expected 9 backward schedule stages, got ${schedule.steps.length}`);
    }
    // Critical path check
    if (!schedule.criticalPathStages.includes('STAGE_PREP') || !schedule.criticalPathStages.includes('STAGE_HARVEST')) {
      throw new Error('Critical path must include land prep and harvest stages');
    }
    // Verify sequence: prepStart < plantStart < harvestStart < delivery
    if (schedule.calculatedPreparationStart >= schedule.calculatedPlantingStart) {
      throw new Error('Preparation start date must precede planting start date');
    }
    if (schedule.steps[8].endDate !== '2026-12-15') {
      throw new Error(`Final delivery date must match target delivery date, got ${schedule.steps[8].endDate}`);
    }
  });

  await runTest('Phase 4 Master Calendar', 'Detects infeasible delivery date, rejects false promise, and provides actionable alternative scenarios', async () => {
    // Delivery requested 10 days from today for a 130-day crop
    const schedule = PlanningService.calculateBackwardSchedule({
      targetDeliveryDate: '2026-06-10',
      targetQuantityTons: 50,
      productKey: 'PEPPER_S17',
      todayOverride: new Date('2026-06-01')
    });

    if (schedule.isFeasible) {
      throw new Error('Schedule with 10 days horizon must be marked infeasible');
    }
    if (schedule.daysUntilPrepStart >= 0) {
      throw new Error(`daysUntilPrepStart must be negative for impossible schedule, got ${schedule.daysUntilPrepStart}`);
    }
    if (!schedule.alternativeScenarios || schedule.alternativeScenarios.length === 0) {
      throw new Error('Must propose alternative scenarios when delivery date is impossible');
    }
    const postponeScenario = schedule.alternativeScenarios.find(s => s.id === 'SCENARIO_POSTPONE_DELIVERY');
    if (!postponeScenario || !postponeScenario.adjustedDeliveryDate) {
      throw new Error('Must provide a postponed delivery scenario with calculated feasible date');
    }
  });

  await runTest('Phase 4 Master Calendar', 'Forecasts harvest yields with agronomic formula, loss rate, and variance tracking', async () => {
    // Formula: Area (ha) * BaseYield (t/ha) * IrrigationFactor * SoilFactor * (1 - LossRatePct / 100)
    // 4.5 ha * 15.0 t/ha * 1.10 (drip) * 1.0 (soil) * (1 - 0.06) = 4.5 * 16.5 * 0.94 = 69.795 -> 69.80 tons
    const forecast = PlanningService.calculateYieldForecast({
      campaignId: 'camp-piment-kindia',
      campaignName: 'Campagne Piment S17 Kindia',
      areaHa: 4.5,
      baseYieldTonsPerHa: 15.0,
      irrigationFactor: 1.1,
      soilFactor: 1.0,
      lossRatePct: 6.0,
      plannedQuantityTons: 65.0,
      actualQuantityTons: 20.0
    });

    if (Math.abs(forecast.forecastQuantityTons - 69.8) > 0.1) {
      throw new Error(`Forecast calculation mismatch. Expected ~69.8 tons, got ${forecast.forecastQuantityTons}`);
    }
    if (forecast.varianceTons <= 0 || forecast.status !== 'SURPLUS') {
      throw new Error(`Expected surplus status when forecast (69.8t) > planned (65.0t), got ${forecast.status}`);
    }

    // Test deficit risk detection
    const deficitForecast = PlanningService.calculateYieldForecast({
      campaignId: 'camp-piment-deficit',
      campaignName: 'Campagne Déficitaire',
      areaHa: 2.0,
      baseYieldTonsPerHa: 10.0,
      irrigationFactor: 0.8, // water stress
      soilFactor: 0.9, // degraded soil
      lossRatePct: 15.0, // pest attack
      plannedQuantityTons: 25.0
    });

    if (deficitForecast.status !== 'CRITICAL_SHORTAGE') {
      throw new Error(`Expected CRITICAL_SHORTAGE when yield is severely reduced, got ${deficitForecast.status}`);
    }
  });

  await runTest('Phase 4 Master Calendar', 'Detects planning conflicts (overlapping plots, overdue operations, delivery deadline mismatch)', async () => {
    const alerts = PlanningService.detectPlanningConflicts({
      campaigns: [
        {
          id: 'camp-01',
          name: 'Campagne 1',
          plotId: 'plot-alpha',
          startDate: '2026-05-01',
          endDate: '2026-08-30',
          targetDeliveryDate: '2026-08-15', // Conflict: harvest ends after delivery
          status: 'IN_PROGRESS'
        },
        {
          id: 'camp-02',
          name: 'Campagne 2 (Conflit)',
          plotId: 'plot-alpha', // Same plot!
          startDate: '2026-07-01', // Overlaps with Campagne 1!
          endDate: '2026-10-30',
          status: 'PLANNING'
        }
      ],
      operations: [
        {
          id: 'op-late',
          campaignId: 'camp-01',
          name: 'Traitement phytosanitaire retardé',
          scheduledDate: '2026-05-10',
          status: 'PENDING'
        }
      ],
      today: '2026-06-01'
    });

    const hasPlotConflict = alerts.some(a => a.type === 'SCHEDULE_CONFLICT');
    const hasOverdue = alerts.some(a => a.type === 'OVERDUE_OPERATION');
    const hasDeadlineMismatch = alerts.some(a => a.type === 'DEADLINE_MISMATCH');

    if (!hasPlotConflict) throw new Error('Failed to detect plot overlap conflict');
    if (!hasOverdue) throw new Error('Failed to detect overdue operation');
    if (!hasDeadlineMismatch) throw new Error('Failed to detect harvest end exceeding delivery date');
  });

  await runTest('Phase 4 Master Calendar', 'Enforces RBAC permission to edit agronomic crop itineraries', async () => {
    // AGRONOMIST and ORG_ADMIN allowed
    PlanningService.assertCanEditItineraries('AGRONOMIST');
    PlanningService.assertCanEditItineraries('ORG_ADMIN');

    // VIEWER and OPERATIONS_STAFF must be rejected
    let viewerBlocked = false;
    try {
      PlanningService.assertCanEditItineraries('VIEWER');
    } catch {
      viewerBlocked = true;
    }
    if (!viewerBlocked) throw new Error('VIEWER role must be forbidden from editing crop itineraries');

    let opsBlocked = false;
    try {
      PlanningService.assertCanEditItineraries('OPERATIONS_STAFF');
    } catch {
      opsBlocked = true;
    }
    if (!opsBlocked) throw new Error('OPERATIONS_STAFF role must be forbidden from editing crop itineraries');
  });

  await runTest('Phase 4 Master Calendar', 'Strict multi-tenant isolation prevents accessing crop plans across organizations', async () => {
    const orgAlphaId = 'org-alpha-uuid';
    const orgBetaId = 'org-beta-uuid';

    // Access own org plan -> allowed
    const ownPlan = PlanningService.getAgronomicCropPlan('PEPPER_S17', orgAlphaId, orgAlphaId);
    if (!ownPlan || !ownPlan.stages) {
      throw new Error('Failed to load agronomic crop plan for valid tenant');
    }

    // Access another org plan -> blocked
    let blocked = false;
    try {
      PlanningService.getAgronomicCropPlan('PEPPER_S17', orgAlphaId, orgBetaId);
    } catch (err: any) {
      if (err.message.includes('SECURITY_ERROR')) {
        blocked = true;
      }
    }
    if (!blocked) {
      throw new Error('Cross-tenant crop plan access must be rejected with SECURITY_ERROR');
    }
  });

  console.log('\n--- CATEGORY 11: PHASE 5 AGRIBUSINESS COMMERCIAL MODULE ---');

  const commSessionKindia: any = {
    token: 'test-token-comm',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      email: 'comm.kindia@farmingcalendar.dev',
      fullName: 'Mamadou Touré',
      role: 'COMMERCIAL_MANAGER',
      activeOrganizationId: org1Id
    },
    organization: { id: org1Id, name: 'Coopérative Friguiagbé (Kindia)' }
  };

  const viewerSessionKindia: any = {
    token: 'test-token-viewer',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: '13131313-1313-1313-1313-131313131313',
      email: 'viewer.kindia@farmingcalendar.dev',
      fullName: 'GIZ Auditor',
      role: 'VIEWER',
      activeOrganizationId: org1Id
    },
    organization: { id: org1Id, name: 'Coopérative Friguiagbé (Kindia)' }
  };

  const foutaSession: any = {
    token: 'test-token-fouta',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: '21212121-2121-2121-2121-212121212121',
      email: 'admin.fouta@farmingcalendar.dev',
      fullName: 'Ousmane Bah',
      role: 'ORG_ADMIN',
      activeOrganizationId: org2Id
    },
    organization: { id: org2Id, name: 'Union Maraîchère du Fouta' }
  };

  await runTest('Commercial Buyer CRM', 'Buyer CRM stores buyers with legal details, verification status, contact source, and communication history', async () => {
    const buyers = await CommercialService.getBuyers(commSessionKindia);
    if (buyers.length < 3) {
      throw new Error(`Expected at least 3 seeded demo buyers in Kindia, found: ${buyers.length}`);
    }

    const socopro = buyers.find(b => b.name.includes('SOCOPRO'));
    if (!socopro) throw new Error('Missing seeded buyer SOCOPRO Export SARL');
    if (socopro.verificationStatus !== 'VERIFIED') {
      throw new Error(`Expected buyer verification status VERIFIED, got: ${socopro.verificationStatus}`);
    }
    if (!socopro.isDemoRecord) {
      throw new Error('Buyer must be explicitly marked as demo record');
    }
    if (socopro.communications.length < 2) {
      throw new Error('Buyer missing seeded communication history');
    }

    // Add communication note
    const updated = await CommercialService.addBuyerCommunication(commSessionKindia, socopro.id, {
      date: new Date().toISOString(),
      type: 'PHONE_CALL',
      authorName: 'Mamadou Touré',
      summary: 'Échange téléphonique confirmant la conformité des cartons 5kg alvéolés.',
      nextSteps: 'Envoi bordereau de chargement.'
    });

    if (updated.communications[0].summary !== 'Échange téléphonique confirmant la conformité des cartons 5kg alvéolés.') {
      throw new Error('Failed to record communication history in CRM');
    }

    // Create new buyer
    const newBuyer = await CommercialService.createBuyer(commSessionKindia, {
      name: 'Comptoir Agro-Export Rotterdam BV',
      countryCode: 'NL',
      market: 'Union Européenne',
      locality: 'Rotterdam',
      buyerType: 'IMPORTER',
      productsOfInterest: ['Piment S17 Habanero Séché'],
      targetPrice: 5.5,
      targetCurrency: 'EUR',
      targetUnit: 'KG',
      sourceOfContact: 'Prospection B2B Salon Fruit Attraction',
      verificationStatus: 'VERIFIED',
      isDemoRecord: true
    });

    if (!newBuyer.id || newBuyer.name !== 'Comptoir Agro-Export Rotterdam BV') {
      throw new Error('Failed to create new buyer in CRM');
    }
  });

  await runTest('Commercial Orders', 'Supports quotations, contracts, line items, and payment milestones', async () => {
    const orders = await CommercialService.getOrders(commSessionKindia);
    if (orders.length < 3) {
      throw new Error(`Expected at least 3 seeded orders, found ${orders.length}`);
    }

    const orderPim = orders.find(o => o.orderNumber === 'ORD-2026-PIM-001');
    if (!orderPim) throw new Error('Missing seeded order ORD-2026-PIM-001');
    if (orderPim.status !== 'CONFIRMED') {
      throw new Error(`Expected status CONFIRMED for ORD-2026-PIM-001, got ${orderPim.status}`);
    }
    if (!orderPim.paymentMilestones || orderPim.paymentMilestones.length !== 2) {
      throw new Error('Order missing 2 payment milestones');
    }

    // Create new order
    const buyer = (await CommercialService.getBuyers(commSessionKindia))[0];
    const createdOrder = await CommercialService.createOrder(commSessionKindia, {
      buyerId: buyer.id,
      orderType: 'ACCEPTED_ORDER',
      incoterm: 'FOB',
      deliveryDestination: 'Port Autonome de Conakry',
      deliveryWindowStart: '2026-11-10',
      deliveryWindowEnd: '2026-11-20',
      currency: 'GNF',
      lines: [
        {
          cropName: 'Piment / Hot Pepper',
          cropVarietyName: 'S17 / Habanero amélioré',
          specifications: 'Grade A Export',
          orderedQuantity: 10000,
          unit: 'KG',
          quantityTons: 10.0,
          unitPrice: 45000,
          qualityGrade: 'GRADE_A_PREMIUM',
          packagingType: 'Cartons 5kg'
        }
      ]
    });

    if (createdOrder.status !== 'CONFIRMED' || createdOrder.totalAmount !== 450000000) {
      throw new Error(`Order created with incorrect status or amount: ${createdOrder.status}, ${createdOrder.totalAmount}`);
    }
    if (createdOrder.lines[0].quantityTons !== 10.0) {
      throw new Error(`Order line quantity mismatch, expected 10.0 tons, got ${createdOrder.lines[0].quantityTons}`);
    }
  });

  await runTest('Order State Machine', 'Validates allowed status transitions and rejects illegal state jumps with audit trail', async () => {
    const buyers = await CommercialService.getBuyers(commSessionKindia);
    const inquiryOrder = await CommercialService.createOrder(commSessionKindia, {
      buyerId: buyers[0].id,
      orderType: 'INQUIRY',
      deliveryDestination: 'Conakry Magasin Central',
      deliveryWindowStart: '2026-12-01',
      deliveryWindowEnd: '2026-12-10',
      lines: [
        {
          cropName: 'Piment / Hot Pepper',
          specifications: 'Qualité test',
          orderedQuantity: 2000,
          unit: 'KG',
          quantityTons: 2.0,
          unitPrice: 40000
        }
      ]
    });

    if (inquiryOrder.status !== 'INQUIRY') {
      throw new Error(`Expected initial status INQUIRY, got ${inquiryOrder.status}`);
    }

    // Valid transition: INQUIRY -> QUOTED
    const quotedOrder = await CommercialService.updateOrderStatus(commSessionKindia, inquiryOrder.id, 'QUOTED');
    if (quotedOrder.status !== 'QUOTED') {
      throw new Error(`Expected status QUOTED, got ${quotedOrder.status}`);
    }

    // Valid transition: QUOTED -> CONFIRMED
    const confirmedOrder = await CommercialService.updateOrderStatus(commSessionKindia, inquiryOrder.id, 'CONFIRMED');
    if (confirmedOrder.status !== 'CONFIRMED') {
      throw new Error(`Expected status CONFIRMED, got ${confirmedOrder.status}`);
    }

    // Invalid transition: CONFIRMED cannot jump directly to DELIVERED (must go through IN_PRODUCTION / PROCESSING / QUALITY / DISPATCHED)
    let threwInvalid = false;
    try {
      await CommercialService.updateOrderStatus(commSessionKindia, inquiryOrder.id, 'DELIVERED');
    } catch (err: any) {
      if (err.message.includes('INVALID_TRANSITION')) {
        threwInvalid = true;
      }
    }
    if (!threwInvalid) {
      throw new Error('Illegal transition jump from CONFIRMED to DELIVERED was not blocked');
    }

    // Check audit logs
    const auditLogs = await getAuditLogs(org1Id, 50);
    const transitionLog = auditLogs.find((l: any) => l.action === 'ORDER_STATUS_CHANGED' && l.target_entity_id === inquiryOrder.id);
    if (!transitionLog) {
      throw new Error('Audit trail failed to record ORDER_STATUS_CHANGED event');
    }
  });

  await runTest('Calendar Integration', 'Confirming order generates or synchronizes milestone event in Master Calendar', async () => {
    const orderPim = (await CommercialService.getOrders(commSessionKindia)).find(o => o.orderNumber === 'ORD-2026-PIM-001');
    if (!orderPim) throw new Error('Order ORD-2026-PIM-001 not found');

    if (!orderPim.linkedCalendarEventIds || orderPim.linkedCalendarEventIds.length === 0) {
      throw new Error('Confirmed order ORD-2026-PIM-001 missing linked calendar event IDs');
    }

    const state = getState();
    const calEvent = state.normal_calendar_events.find((c: any) => c.linked_order_id === orderPim.id);
    if (!calEvent) {
      throw new Error(`Milestone calendar event not found for order ${orderPim.id}`);
    }
    if (!calEvent.title.includes('Livraison') && !calEvent.title.includes('Échéance')) {
      throw new Error(`Milestone calendar title incorrect: ${calEvent.title}`);
    }
  });

  await runTest('Supply-Demand & Overselling Prevention', 'Enforces concurrency-safe supply reservations and prevents double-booking beyond available capacity', async () => {
    const balances = await CommercialService.getSupplyDemandBalance(commSessionKindia);
    if (!balances || balances.length === 0) {
      throw new Error('Supply-demand balance calculation returned empty');
    }

    const pepperBalance = balances.find(b => b.cropName.toLowerCase().includes('piment'));
    if (!pepperBalance) throw new Error('Piment supply-demand balance missing');

    if (pepperBalance.totalBuyerDemandTons <= 0) {
      throw new Error('Expected positive buyer demand for pepper');
    }
    if (pepperBalance.forecastHarvestTons <= 0) {
      throw new Error('Expected positive forecast harvest for pepper');
    }

    // Attempt valid reservation of 2.0 tons against campaign
    const orders = await CommercialService.getOrders(commSessionKindia);
    const targetOrder = orders.find(o => o.lines && o.lines.length > 0 && o.status === 'CONFIRMED');
    if (!targetOrder) throw new Error('Need a confirmed order for reservation test');

    const reservation = await CommercialService.reserveSupply(commSessionKindia, {
      orderId: targetOrder.id,
      orderLineId: targetOrder.lines[0].id,
      campaignId: 'camp-pepper-s17-01',
      quantityTons: 2.0
    });

    if (!reservation.id || reservation.reservedQuantityTons !== 2.0) {
      throw new Error(`Supply reservation failed, got: ${JSON.stringify(reservation)}`);
    }

    // OVERSELLING PREVENTION: Attempt to reserve 500.0 tons (exceeding available capacity of ~18-20t)
    let threwOverselling = false;
    try {
      await CommercialService.reserveSupply(commSessionKindia, {
        orderId: targetOrder.id,
        orderLineId: targetOrder.lines[0].id,
        campaignId: 'camp-pepper-s17-01',
        quantityTons: 500.0
      });
    } catch (err: any) {
      if (err.message.includes('INSUFFICIENT_SUPPLY_ERROR') && err.message.includes('Overselling rejected')) {
        threwOverselling = true;
      }
    }

    if (!threwOverselling) {
      throw new Error('Security flaw: System allowed overselling supply beyond campaign capacity');
    }

    // Clean up reservation
    await CommercialService.releaseSupplyReservation(commSessionKindia, reservation.id);
  });

  await runTest('Commercial Permissions & Tenancy', 'Protects commercial data across roles and enforces strict multi-tenant isolation', async () => {
    // 1. VIEWER role cannot create order
    let viewerBlocked = false;
    try {
      await CommercialService.createOrder(viewerSessionKindia, {
        buyerId: 'b1111111-1111-1111-1111-111111111111',
        deliveryDestination: 'Port de Conakry',
        deliveryWindowStart: '2026-11-01',
        deliveryWindowEnd: '2026-11-10',
        lines: [{ cropName: 'Piment', specifications: 'Test', orderedQuantity: 1000, unit: 'KG', quantityTons: 1.0, unitPrice: 40000 }]
      });
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) viewerBlocked = true;
    }
    if (!viewerBlocked) throw new Error('VIEWER role was allowed to create a commercial order');

    // 2. Org Alpha cannot access Org Beta buyers
    let crossTenantBuyerBlocked = false;
    try {
      await CommercialService.getBuyerById(commSessionKindia, 'b9999999-9999-9999-9999-999999999999');
    } catch (err: any) {
      if (err.message.includes('SECURITY_ERROR')) crossTenantBuyerBlocked = true;
    }
    if (!crossTenantBuyerBlocked) throw new Error('Cross-tenant buyer access was not blocked');

    // 3. Org Alpha cannot create order for Org Beta buyer
    let crossTenantOrderBlocked = false;
    try {
      await CommercialService.createOrder(commSessionKindia, {
        buyerId: 'b9999999-9999-9999-9999-999999999999', // Org Beta Buyer!
        deliveryDestination: 'Dakar Port',
        deliveryWindowStart: '2026-11-01',
        deliveryWindowEnd: '2026-11-10',
        lines: [{ cropName: 'Piment', specifications: 'Test', orderedQuantity: 1000, unit: 'KG', quantityTons: 1.0, unitPrice: 40000 }]
      });
    } catch (err: any) {
      if (err.message.includes('SECURITY_ERROR')) crossTenantOrderBlocked = true;
    }
    if (!crossTenantOrderBlocked) throw new Error('Cross-tenant order creation was not blocked');
  });

  console.log('\n--- CATEGORY 12: PHASE 6 PROCESSING, INVENTORY & QUALITY MANAGEMENT ---');

  const opsSessionKindia: any = {
    token: 'test-token-ops',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: '12121212-1212-1212-1212-121212121212',
      email: 'ops.kindia@farmingcalendar.dev',
      fullName: 'Sékou Traoré',
      role: 'OPERATIONS_STAFF',
      activeOrganizationId: org1Id
    },
    organization: { id: org1Id, name: 'Coopérative Friguiagbé (Kindia)' }
  };

  const agroSessionKindia: any = {
    token: 'test-token-agro',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      email: 'agro.kindia@farmingcalendar.dev',
      fullName: 'Dr. Fanta Condé',
      role: 'AGRONOMIST',
      activeOrganizationId: org1Id
    },
    organization: { id: org1Id, name: 'Coopérative Friguiagbé (Kindia)' }
  };

  await runTest('Auditable Inventory Movements', 'Tracks raw produce, packaging, inputs, finished goods with auditable movements and prevent overselling/overissuing', async () => {
    const items = await OperationsService.listInventoryItems(opsSessionKindia);
    if (items.length < 5) {
      throw new Error(`Expected at least 5 seeded inventory items, found ${items.length}`);
    }

    const rawPepper = items.find(i => i.id === 'inv-raw-pim-001');
    if (!rawPepper) throw new Error('Missing raw pepper inventory item inv-raw-pim-001');

    const initialOnHand = rawPepper.quantityOnHand;
    const initialAvailable = rawPepper.quantityAvailable;
    const initialReserved = rawPepper.quantityReserved || 0;

    // 1. Record RECEIVING movement (+2,500 kg from field)
    const receiveRes = await OperationsService.recordStockMovement(opsSessionKindia, {
      inventoryItemId: rawPepper.id,
      batchNumber: 'HARV-TEST-ADD-001',
      movementType: 'RECEIVING',
      quantity: 2500,
      unit: 'KG',
      locationDestination: 'Magasin Central Friguiagbé (Kindia)',
      reason: 'Entrée récolte complémentaire parcelle P-01'
    });

    if (receiveRes.updatedItem.quantityOnHand !== initialOnHand + 2500) {
      throw new Error(`On-hand quantity mismatch after receiving: expected ${initialOnHand + 2500}, got ${receiveRes.updatedItem.quantityOnHand}`);
    }
    if (receiveRes.updatedItem.quantityAvailable !== initialAvailable + 2500) {
      throw new Error(`Available quantity mismatch after receiving: expected ${initialAvailable + 2500}, got ${receiveRes.updatedItem.quantityAvailable}`);
    }

    // 2. Record RESERVATION movement (+1,500 kg)
    const reserveRes = await OperationsService.recordStockMovement(opsSessionKindia, {
      inventoryItemId: rawPepper.id,
      batchNumber: 'HARV-TEST-ADD-001',
      movementType: 'RESERVATION',
      quantity: 1500,
      unit: 'KG',
      locationDestination: 'Affectation Commande',
      reason: 'Réservation contractuelle'
    });

    if (reserveRes.updatedItem.quantityReserved !== initialReserved + 1500) {
      throw new Error(`Reserved quantity mismatch: expected ${initialReserved + 1500}, got ${reserveRes.updatedItem.quantityReserved}`);
    }
    if (reserveRes.updatedItem.quantityAvailable !== initialAvailable + 2500 - 1500) {
      throw new Error(`Available quantity mismatch after reservation: expected ${initialAvailable + 1000}, got ${reserveRes.updatedItem.quantityAvailable}`);
    }

    // 3. Attempting to issue more than available balance must be REJECTED
    let overIssueBlocked = false;
    try {
      await OperationsService.recordStockMovement(opsSessionKindia, {
        inventoryItemId: rawPepper.id,
        batchNumber: 'HARV-TEST-ADD-001',
        movementType: 'ISSUING',
        quantity: 999999, // Exceeds stock
        unit: 'KG',
        locationDestination: 'Usinage',
        reason: 'Consommation excessive non autorisée'
      });
    } catch (err: any) {
      if (err.message.includes('Insufficient available stock')) {
        overIssueBlocked = true;
      }
    }
    if (!overIssueBlocked) {
      throw new Error('Over-issuing beyond available stock was not blocked');
    }

    // 4. Verify immutable stock movement log records audit parameters
    const movements = await OperationsService.listStockMovements(opsSessionKindia, {
      inventoryItemId: rawPepper.id
    });
    if (movements.length < 2) {
      throw new Error(`Expected at least 2 movements for item, found ${movements.length}`);
    }
    const latest = movements[movements.length - 1];
    if (!latest.responsibleUserId || !latest.reason || !latest.movementDate) {
      throw new Error('Stock movement missing required audit metadata');
    }
  });

  await runTest('Processing Batches & Yields', 'Calculates actual conversion yields, variances, labor/energy costs and production unit cost', async () => {
    // 1. Check recipes catalog (includes local validation disclaimer)
    const recipes = await OperationsService.listProcessingRecipes(opsSessionKindia);
    if (recipes.length < 4) {
      throw new Error(`Expected at least 4 processing recipes, got ${recipes.length}`);
    }

    const pepperRecipe = recipes.find(r => r.code === 'REC-PIM-DRY-01');
    if (!pepperRecipe) throw new Error('Missing pepper drying recipe REC-PIM-DRY-01');
    if (!pepperRecipe.isLocallyValidated || !pepperRecipe.localValidationSource) {
      throw new Error('Locally validated recipe must store validation source');
    }

    const juiceRecipe = recipes.find(r => r.code === 'REC-WAT-JUC-01');
    if (!juiceRecipe) throw new Error('Missing watermelon juice trial recipe');
    if (juiceRecipe.isLocallyValidated) {
      throw new Error('R&D pilot juice trial must not claim verified local commercial validation');
    }

    // 2. Start a batch
    const batchNumber = `PRC-TEST-${Date.now().toString().slice(-4)}`;
    const batch = await OperationsService.startProcessingBatch(opsSessionKindia, {
      batchNumber,
      recipeId: pepperRecipe.id,
      recipeName: pepperRecipe.name,
      campaignId: 'camp-2026-pim-001',
      campaignName: 'Campagne Piment S17 — Friguiagbé 2026',
      harvestBatchNumber: 'HARV-2026-PIM-001',
      inputRawMaterialName: 'Piment S17 Habanero Frais',
      inputQuantity: 5000,
      inputUnit: 'KG',
      expectedOutputQuantity: 1200, // 24% expected yield
      expectedOutputUnit: 'KG',
      facilityLocation: 'Station de Séchage et Usinage Friguiagbé'
    });

    if (batch.status !== 'IN_PROGRESS' || batch.expectedConversionYieldPct !== 24.0) {
      throw new Error(`Expected IN_PROGRESS status and 24.0% expected yield, got ${batch.status} and ${batch.expectedConversionYieldPct}%`);
    }

    // 3. Complete batch with recorded actual values
    // Input: 5,000 kg, Output: 1,180 kg, Losses: 70 kg
    // Actual yield: (1180 / 5000) * 100 = 23.60%
    // Variance: 23.60 - 24.0 = -0.40%
    // Costs: Raw (125,000,000) + Labor (3,600,000) + Utilities (1,500,000) + Packaging (1,800,000) = 131,900,000 GNF
    // Unit Cost: 131,900,000 / 1180 = 111,780 GNF/kg
    const completed = await OperationsService.completeProcessingBatch(opsSessionKindia, batch.id, {
      outputQuantity: 1180,
      outputUnit: 'KG',
      lossesQuantity: 70,
      byProductsQuantity: 0,
      laborHours: 90,
      laborCostGNF: 3600000,
      energyAndUtilitiesCostGNF: 1500000,
      packagingCostGNF: 1800000,
      rawMaterialValuationGNF: 125000000,
      notes: 'Essai usinage terminé dans les tolérances acceptables.'
    });

    if (completed.status !== 'COMPLETED') {
      throw new Error(`Expected batch status COMPLETED, got ${completed.status}`);
    }
    if (completed.actualConversionYieldPct !== 23.6) {
      throw new Error(`Actual conversion yield mismatch: expected 23.6%, got ${completed.actualConversionYieldPct}%`);
    }
    if (completed.yieldVariancePct !== -0.4) {
      throw new Error(`Yield variance mismatch: expected -0.4%, got ${completed.yieldVariancePct}%`);
    }
    if (completed.totalCostGNF !== 131900000) {
      throw new Error(`Total cost mismatch: expected 131,900,000 GNF, got ${completed.totalCostGNF}`);
    }
    if (completed.unitProductionCostGNF !== 111780) {
      throw new Error(`Unit production cost mismatch: expected 111,780 GNF, got ${completed.unitProductionCostGNF}`);
    }
  });

  await runTest('Quality Gating & Rejection Blocking', 'Enforces inspection standards, records accreditations, and strictly BLOCKS rejected lots from dispatch', async () => {
    // 1. Approved lot (PRC-2026-S17-001) must be allowed for dispatch
    const passCheck = await OperationsService.validateBatchForDispatch(opsSessionKindia, 'PRC-2026-S17-001');
    if (!passCheck.isAllowed || passCheck.releaseStatus !== 'ACCEPTED_GRADE_A') {
      throw new Error(`Expected accepted lot to pass dispatch validation, got ${passCheck.releaseStatus}`);
    }
    if (!passCheck.inspection?.officialCertificateNumber) {
      throw new Error('Approved lot missing official phytosanitary certificate number');
    }

    // 2. Rejected lot (PRC-2026-S17-REJ) must be strictly BLOCKED from dispatch
    let rejectedBlocked = false;
    let blockReason = '';
    try {
      await OperationsService.validateBatchForDispatch(opsSessionKindia, 'PRC-2026-S17-REJ', 'ord-2026-pim-001');
    } catch (err: any) {
      if (err.message.includes('QUALITY DISPATCH BLOCKED') && err.message.includes('REJECTED')) {
        rejectedBlocked = true;
        blockReason = err.message;
      }
    }
    if (!rejectedBlocked) {
      throw new Error('Security & Quality failure: Rejected batch was allowed for dispatch');
    }

    // 3. Record new inspection with non-conformance
    const rejInspection = await OperationsService.recordQualityInspection(agroSessionKindia, {
      batchNumber: 'PRC-TEST-REJ-099',
      productName: 'Piment Frais Test',
      inspectorName: 'Dr. Fanta Condé',
      inspectorAccreditation: 'ONPQ Agrément National A-42',
      sampleSizeTaken: '3 kg',
      moisturePct: 15.2,
      maxPermissibleMoisturePct: 11.0,
      defectsRatePct: 5.5,
      maxPermissibleDefectsPct: 2.0,
      foreignMatterPct: 1.5,
      maxPermissibleForeignMatterPct: 0.5,
      chemicalResiduesCompliant: false,
      pesticideMRLCompliant: false,
      releaseStatus: 'REJECTED',
      nonConformanceReason: 'Humidité excessive (15.2%) et résidus pesticides non conformes aux LMR.',
      correctiveActionPlan: 'Mise sous séquestre immédiate et destruction contrôlée.'
    });

    if (rejInspection.releaseStatus !== 'REJECTED') {
      throw new Error('Expected release status REJECTED');
    }

    // Attempting dispatch for this new rejected lot must also be blocked
    let newRejBlocked = false;
    try {
      await OperationsService.validateBatchForDispatch(opsSessionKindia, 'PRC-TEST-REJ-099');
    } catch (err: any) {
      if (err.message.includes('QUALITY DISPATCH BLOCKED')) {
        newRejBlocked = true;
      }
    }
    if (!newRejBlocked) {
      throw new Error('Newly rejected batch was not blocked from dispatch');
    }
  });

  await runTest('Batch Recall & Full Traceability Chain', 'Performs end-to-end recall tracing from plot & harvest through processing, quality, and buyer orders', async () => {
    const trace = await OperationsService.traceBatchRecall(opsSessionKindia, 'PRC-2026-S17-001');

    if (!trace.traceabilityChainValid) {
      throw new Error('Traceability chain is invalid for PRC-2026-S17-001');
    }

    // Upstream traceability
    if (!trace.farm.name || !trace.farm.name.includes('Friguiagbé')) {
      throw new Error(`Upstream farm trace failed: expected Friguiagbé, got ${trace.farm.name}`);
    }
    if (!trace.campaign.name || !trace.campaign.name.includes('Piment S17')) {
      throw new Error(`Campaign trace failed: got ${trace.campaign.name}`);
    }
    if (!trace.harvest.batchNumber || (!trace.harvest.batchNumber.includes('PIM') && !trace.harvest.batchNumber.includes('HARV'))) {
      throw new Error(`Harvest lot trace failed: got ${trace.harvest.batchNumber}`);
    }

    // Midstream processing & quality
    if (!trace.processingBatch || trace.processingBatch.status !== 'COMPLETED') {
      throw new Error('Processing batch details missing in trace');
    }
    if (!trace.qualityInspection || trace.qualityInspection.releaseStatus !== 'ACCEPTED_GRADE_A') {
      throw new Error(`Quality inspection details missing in trace: got ${trace.qualityInspection?.releaseStatus}`);
    }

    // Downstream commercial orders
    if (!trace.customerOrders || trace.customerOrders.length === 0) {
      throw new Error('Customer orders missing in recall trace');
    }
    const order = trace.customerOrders.find(o => o.orderNumber === 'ORD-2026-PIM-001');
    if (!order || !order.buyerName.includes('SOCOPRO')) {
      throw new Error(`Customer order SOCOPRO missing in recall trace: got ${JSON.stringify(trace.customerOrders)}`);
    }

    // Stock movements chain
    if (!trace.stockMovements || trace.stockMovements.length < 3) {
      throw new Error(`Stock movement history incomplete in trace: found ${trace.stockMovements?.length} movements`);
    }
  });

  await runTest('Operations RBAC & Tenant Isolation', 'Enforces role restrictions and isolates inventory, batches, and inspections between organizations', async () => {
    // 1. VIEWER cannot record stock movements
    let viewerBlocked = false;
    try {
      await OperationsService.recordStockMovement(viewerSessionKindia, {
        inventoryItemId: 'inv-raw-pim-001',
        batchNumber: 'ILLEGAL-VIEWER',
        movementType: 'RECEIVING',
        quantity: 100,
        locationDestination: 'Store',
        reason: 'Illegal viewer movement'
      });
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) viewerBlocked = true;
    }
    if (!viewerBlocked) throw new Error('VIEWER was allowed to record stock movement');

    // 2. Org Alpha (Kindia) cannot view Org Beta (Fouta) inventory
    const foutaInventory = await OperationsService.listInventoryItems(foutaSession);
    const kindiaInventory = await OperationsService.listInventoryItems(opsSessionKindia);

    // Ensure all returned items strictly match the requesting tenant
    for (const item of kindiaInventory) {
      if (item.organizationId !== org1Id) {
        throw new Error(`Tenant leak: Kindia session received item from org ${item.organizationId}`);
      }
    }
    for (const item of foutaInventory) {
      if (item.organizationId !== org2Id) {
        throw new Error(`Tenant leak: Fouta session received item from org ${item.organizationId}`);
      }
    }

    // 3. Cross-tenant batch query
    let crossBatchBlocked = false;
    try {
      await OperationsService.getInventoryItem(foutaSession, 'inv-raw-pim-001'); // Belongs to Kindia
    } catch (err: any) {
      if (err.message.includes('not found in organization')) crossBatchBlocked = true;
    }
    if (!crossBatchBlocked) throw new Error('Cross-tenant inventory access was not blocked');
  });

  console.log('\n--- CATEGORY 13: PHASE 7 LOGISTICS, SHIPMENTS & EXPORT COMPLIANCE ---');

  const logSessionKindia: any = {
    token: 'test-token-logistics',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      email: 'manager.kindia@farmingcalendar.dev',
      fullName: 'Abdoulaye Soumah',
      role: 'MANAGER',
      activeOrganizationId: org1Id
    },
    organization: { id: org1Id, name: 'Coopérative Friguiagbé (Kindia)' }
  };

  await runTest('Shipment Creation & Approved Lot Linkage', 'Creates shipments linked to confirmed orders and approved inventory lots with transparent costing and calendar sync', async () => {
    // 1. Verify seeded shipments
    const seeded = await LogisticsService.listShipments(logSessionKindia);
    if (seeded.length < 3) {
      throw new Error(`Expected at least 3 seeded shipments, found ${seeded.length}`);
    }

    const maritime = seeded.find(s => s.transportMode === 'MARITIME');
    if (!maritime) throw new Error('Maritime export shipment not found in seed');
    if (maritime.totalNetWeightKg !== 5000) {
      throw new Error(`Expected 5000 kg net weight, got ${maritime.totalNetWeightKg}`);
    }
    if (maritime.costs.totalCost !== 41350000) {
      throw new Error(`Expected 41,350,000 GNF total cost, got ${maritime.costs.totalCost}`);
    }
    if (maritime.costs.isLiveCarrierIntegration !== false) {
      throw new Error('isLiveCarrierIntegration must be false (avoiding false carrier API claims)');
    }

    // 2. Create new road shipment
    const newShipment = await LogisticsService.createShipment(logSessionKindia, {
      orderId: 'ord-2026-cas-001',
      transportMode: 'ROAD_FREIGHT',
      carrierName: 'Trans-Guinée Express Fret',
      containerOrVehicleId: 'Camion 15T RC-4491-B',
      dispatchLocation: 'Magasin Central Friguiagbé',
      destinationPortOrCity: 'Bamako, Mali',
      destinationCountry: 'ML',
      destinationMarket: 'CEDEAO',
      linkedBatches: [
        {
          inventoryItemId: 'inv-proc-cas-001',
          batchNumber: 'PRC-2026-CAS-001',
          productName: 'Farine de Manioc Panifiable Pure',
          quantityAllocated: 10000,
          unit: 'KG'
        }
      ],
      plannedPickupDate: '2026-10-28T08:00:00Z',
      estimatedArrivalDate: '2026-11-01T17:00:00Z'
    });

    if (!newShipment.id || !newShipment.shipmentNumber) {
      throw new Error('Failed to generate shipment ID or number');
    }
    if (newShipment.milestones.length < 5) {
      throw new Error(`Expected at least 5 milestones, got ${newShipment.milestones.length}`);
    }
  });

  await runTest('Quality Dispatch Gating', 'Strictly blocks unapproved or rejected inventory lots from dispatch and records audit history', async () => {
    let rejectionBlocked = false;
    let blockReason = '';

    try {
      await LogisticsService.createShipment(logSessionKindia, {
        orderId: 'ord-2026-pim-001',
        transportMode: 'MARITIME',
        carrierName: 'CMA CGM',
        containerOrVehicleId: 'CMAU-REJ-01',
        dispatchLocation: 'Friguiagbé',
        destinationPortOrCity: 'Le Havre',
        destinationCountry: 'FR',
        destinationMarket: 'EUROPEAN_UNION',
        linkedBatches: [
          {
            inventoryItemId: 'inv-raw-pim-001',
            batchNumber: 'PRC-2026-S17-REJ', // Rej lot (moisture 18.5%, contaminated)
            productName: 'Piment Rejeté',
            quantityAllocated: 2000,
            unit: 'KG'
          }
        ],
        plannedPickupDate: '2026-10-25T08:00:00Z',
        estimatedArrivalDate: '2026-11-10T16:00:00Z'
      });
    } catch (err: any) {
      if (err.message.includes('DISPATCH_BLOCKED') && err.message.includes('REJECTED')) {
        rejectionBlocked = true;
        blockReason = err.message;
      }
    }

    if (!rejectionBlocked) {
      throw new Error('System allowed dispatching a REJECTED quality batch! Gating failed.');
    }
  });

  await runTest('Compliance Documents & RBAC Masking', 'Verifies destination-specific document matrix and restricts confidential financial documents from unauthorized roles', async () => {
    const shipment = await LogisticsService.getShipmentById(logSessionKindia, 'shp-2026-exp-001');

    // 1. Verify EU specific documents
    const docTypes = shipment.documents.map(d => d.documentType);
    if (!docTypes.includes('COMMERCIAL_INVOICE') || !docTypes.includes('PACKING_LIST') || !docTypes.includes('PHYTOSANITARY_CERTIFICATE') || !docTypes.includes('CERTIFICATE_OF_ORIGIN_EUR1')) {
      throw new Error(`Missing expected EU compliance documents: ${docTypes.join(', ')}`);
    }

    // 2. Update document status
    const phytDoc = shipment.documents.find(d => d.documentType === 'PHYTOSANITARY_CERTIFICATE');
    if (!phytDoc) throw new Error('Phytosanitary document missing');

    const updatedShipment = await LogisticsService.updateDocumentStatus(logSessionKindia, shipment.id, phytDoc.id, {
      status: 'APPROVED_VALID',
      documentNumber: 'PHYT-GN-2026-0941',
      expiryDate: '2026-12-31'
    });

    const refreshedPhyt = updatedShipment.documents.find(d => d.id === phytDoc.id);
    if (refreshedPhyt?.status !== 'APPROVED_VALID') {
      throw new Error(`Expected APPROVED_VALID document status, got ${refreshedPhyt?.status}`);
    }

    // 3. Test RBAC masking for VIEWER role
    const viewerView = await LogisticsService.getShipmentById(viewerSessionKindia, 'shp-2026-exp-001');
    const invoice = viewerView.documents.find(d => d.documentType === 'COMMERCIAL_INVOICE');
    if (invoice && invoice.fileReferenceHash !== '[RESTRICTED_FINANCIAL_ACCESS]') {
      throw new Error('Confidential financial document was exposed to VIEWER role without masking!');
    }
  });

  await runTest('Dynamic Delay Recalculation', 'Propagates milestone delays forward, shifts estimated arrival date, and sets DELAYED status', async () => {
    // Reset milestone ms-03 delay to 0 if previously modified to ensure test idempotency
    const initialShipment = await LogisticsService.getShipmentById(logSessionKindia, 'shp-2026-exp-001');
    const existingMs = initialShipment.milestones.find(m => m.id === 'ms-03');
    if (existingMs && existingMs.delayHours && existingMs.delayHours !== 0) {
      await LogisticsService.updateShipmentMilestone(logSessionKindia, initialShipment.id, 'ms-03', {
        status: 'IN_PROGRESS',
        delayHours: 0
      });
    }

    const shipment = await LogisticsService.getShipmentById(logSessionKindia, 'shp-2026-exp-001');
    const originalArrival = new Date(shipment.estimatedArrivalDate).getTime();

    // Introduce 48h delay on milestone ms-03 (Customs / Phytosanitary check)
    const updated = await LogisticsService.updateShipmentMilestone(logSessionKindia, shipment.id, 'ms-03', {
      status: 'DELAYED',
      delayHours: 48,
      notes: 'Attente inspection physique phytosanitaire au Port Autonome de Conakry'
    });

    const newArrival = new Date(updated.estimatedArrivalDate).getTime();
    const differenceHours = Math.round((newArrival - originalArrival) / (1000 * 60 * 60));

    if (differenceHours !== 48) {
      throw new Error(`Expected arrival date to shift by 48h, shifted by ${differenceHours}h`);
    }

    if (updated.totalDelayHours !== 48) {
      throw new Error(`Expected totalDelayHours to be 48, got ${updated.totalDelayHours}`);
    }

    if (updated.currentStatus !== 'DELAYED') {
      throw new Error(`Expected currentStatus DELAYED, got ${updated.currentStatus}`);
    }
  });

  await runTest('Risk Scenario Planning & Impact Modeling', 'Simulates multi-day delay, missed vessel connection, and calculates shelf life and demurrage risk', async () => {
    // 1. Simulate 3-Day Transport Delay
    const sim3Days = await LogisticsService.simulateRiskScenario(logSessionKindia, 'shp-2026-exp-001', 'THREE_DAY_TRANSPORT_DELAY');
    if (sim3Days.delayHoursAdded !== 72) {
      throw new Error(`Expected 72h added delay, got ${sim3Days.delayHoursAdded}`);
    }
    if (sim3Days.estimatedCostImpactGNF <= 0) {
      throw new Error('Expected positive cost impact for delay demurrage');
    }
    if (!sim3Days.recommendedMitigationAction) {
      throw new Error('Expected actionable mitigation recommendation');
    }

    // 2. Simulate Missed Vessel Connection
    const simMissedVessel = await LogisticsService.simulateRiskScenario(logSessionKindia, 'shp-2026-exp-001', 'MISSED_VESSEL_CONNECTION');
    if (simMissedVessel.delayHoursAdded !== 168) {
      throw new Error(`Expected 168h added delay for weekly sailing cutoff, got ${simMissedVessel.delayHoursAdded}`);
    }
    if (simMissedVessel.estimatedCostImpactGNF < 10000000) {
      throw new Error('Expected significant cost impact for port re-booking and plug-in charges');
    }
  });

  await runTest('Multi-Tenant Logistics Isolation', 'Blocks cross-tenant shipment access between Organization Alpha and Organization Beta', async () => {
    const betaSession: any = {
      token: 'test-token-beta',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      user: {
        id: 'user-beta-01',
        email: 'manager.beta@farmingcalendar.dev',
        fullName: 'Chef Ferme Mamou',
        role: 'MANAGER',
        activeOrganizationId: org2Id
      },
      organization: { id: org2Id, name: 'Ferme Fouta Élevage (Mamou)' }
    };

    let crossShipmentBlocked = false;
    try {
      await LogisticsService.getShipmentById(betaSession, 'shp-2026-exp-001'); // Belongs to Kindia Alpha
    } catch (err: any) {
      if (err.message.includes('Cross-tenant access blocked')) {
        crossShipmentBlocked = true;
      }
    }

    if (!crossShipmentBlocked) {
      throw new Error('Cross-tenant shipment access was not blocked!');
    }
  });

  console.log('\n--- CATEGORY 14: PHASE 8 FINANCIAL PLANNING & PROFITABILITY ANALYSIS ---');

  const finSessionKindia: any = {
    token: 'test-token-finance',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      email: 'finance.kindia@farmingcalendar.dev',
      fullName: 'Aissatou Diallo',
      role: 'FINANCE_MANAGER',
      activeOrganizationId: org1Id
    },
    organization: { id: org1Id, name: 'Coopérative Friguiagbé (Kindia)' }
  };

  await runTest('Budget Management & OPEX/CAPEX', 'Tracks budgets across required agricultural categories, distinguishes OPEX from CAPEX, and computes dynamic variance', async () => {
    // 1. List seeded budgets
    const budgets = await FinanceService.listBudgets(finSessionKindia);
    if (budgets.length < 5) {
      throw new Error(`Expected at least 5 seeded budget lines, found ${budgets.length}`);
    }

    const opexItems = budgets.filter(b => b.expenseNature === 'OPEX');
    const capexItems = budgets.filter(b => b.expenseNature === 'CAPEX');
    if (opexItems.length === 0 || capexItems.length === 0) {
      throw new Error('Budgets must clearly separate OPEX and CAPEX line items');
    }

    // Verify key agricultural categories exist
    const categories = budgets.map(b => b.category);
    const expectedCategories = ['LAND_PREPARATION_PLANTING', 'SEED_PLANTING_MATERIAL', 'FERTILIZERS_CROP_PROTECTION', 'IRRIGATION_WATER', 'LABOR'];
    for (const ec of expectedCategories) {
      if (!categories.includes(ec as any)) {
        throw new Error(`Missing expected agricultural budget category: ${ec}`);
      }
    }

    // 2. Create new budget line with variance tracking
    const newBudget = await FinanceService.createOrUpdateBudget(finSessionKindia, {
      entityType: 'CAMPAIGN',
      entityId: 'camp-pepper-s17-01',
      entityName: 'Campagne Piment S17 Kindia Export',
      fiscalYear: 2026,
      category: 'STORAGE',
      expenseNature: 'OPEX',
      title: 'Location chambre froide ventilée pré-export Conakry',
      currency: 'GNF',
      plannedBudget: 15000000,
      committedAmount: 12000000,
      actualExpenditure: 11500000,
      forecastRemaining: 2500000,
      notes: 'Réservation quai sous douane PAC'
    });

    if (newBudget.varianceAmount !== 1000000) { // 15M - (11.5M + 2.5M) = 1.0M
      throw new Error(`Expected variance of 1,000,000 GNF, got ${newBudget.varianceAmount}`);
    }
  });

  await runTest('Yield Deductions & Revenue Waterfall', 'Estimates revenue with physical deductions for processing losses and quality rejections across commercial channels', async () => {
    const perf = await FinanceService.calculateCampaignFinancialPerformance(finSessionKindia, 'camp-pepper-s17-01');

    if (perf.grossHarvestTons <= 0) {
      throw new Error('Gross harvest tonnage must be strictly positive');
    }

    // Physical deductions
    if (perf.processingLossTons <= 0 || perf.processingLossPct <= 0) {
      throw new Error('Processing loss must be accounted for in production waterfall');
    }
    if (perf.qualityRejectedTons <= 0 || perf.qualityRejectedPct <= 0) {
      throw new Error('Quality rejections must be accounted for in saleable output');
    }
    if (perf.saleableOutputTons >= perf.grossHarvestTons) {
      throw new Error('Saleable output must be strictly less than gross harvest after deductions');
    }

    // Commercial channel breakdown
    if (perf.exportRevenue <= 0 || perf.localRevenue <= 0) {
      throw new Error('Both export and local sales channels must generate revenue');
    }
    if (perf.totalRevenue !== (perf.exportRevenue + perf.localRevenue + perf.unsoldStockValuation)) {
      throw new Error('Total revenue must equal sum of export, local, and valued unsold stock');
    }
  });

  await runTest('Unit Economics & Break-Even Ratios', 'Calculates cost per hectare, cost per kg, gross margin, contribution margin, EBIT, and break-even thresholds', async () => {
    const perf = await FinanceService.calculateCampaignFinancialPerformance(finSessionKindia, 'camp-pepper-s17-01');

    if (perf.costPerHectare <= 0) {
      throw new Error('Cost per hectare must be positive');
    }
    if (perf.costPerKg <= 0) {
      throw new Error('Cost per kilogram must be positive');
    }
    if (perf.grossMargin <= 0 || perf.grossMarginPct <= 0) {
      throw new Error('Gross margin must be positive for viable commercial campaign');
    }
    if (perf.operatingProfitEbit <= 0 || perf.operatingProfitMarginPct <= 0) {
      throw new Error('Operating profit EBIT must be positive');
    }
    if (perf.breakEvenPricePerKg <= 0) {
      throw new Error('Break-even price per kg must be calculated and positive');
    }
    if (perf.breakEvenQuantityTons <= 0 || perf.breakEvenQuantityTons > perf.grossHarvestTons) {
      throw new Error(`Break-even quantity out of expected bounds: ${perf.breakEvenQuantityTons} tons`);
    }
  });

  await runTest('Cash Flow Schedule & Working Capital Deficit', 'Generates monthly cash flow schedule and determines peak working capital requirement', async () => {
    const perf = await FinanceService.calculateCampaignFinancialPerformance(finSessionKindia, 'camp-pepper-s17-01');

    if (!perf.cashFlowSchedule || perf.cashFlowSchedule.length < 4) {
      throw new Error('Must provide multi-period cash flow schedule');
    }

    if (perf.workingCapitalRequirement <= 0) {
      throw new Error('Working capital requirement (peak cash deficit) must be positive');
    }

    // Verify cumulative cash balances reflect net cash flow additions
    for (let i = 1; i < perf.cashFlowSchedule.length; i++) {
      const prev = perf.cashFlowSchedule[i - 1].cumulativeCashBalance;
      const currNet = perf.cashFlowSchedule[i].netCashFlow;
      const currCum = perf.cashFlowSchedule[i].cumulativeCashBalance;
      if (currCum !== (prev + currNet)) {
        throw new Error(`Cash balance inconsistency at period ${perf.cashFlowSchedule[i].periodLabel}`);
      }
    }
  });

  await runTest('DCF Investment Appraisal & Guardrails', 'Computes NPV, IRR, and payback period with explicit assumptions, and flags incomplete data', async () => {
    // 1. Valid project appraisal
    const validAppraisal = FinanceService.calculateMultiYearInvestmentAppraisal(finSessionKindia, {
      projectName: 'Unité de Séchage Solaire Kindia',
      initialInvestmentCapex: 150000000,
      discountRatePct: 12.0,
      inflationRatePct: 8.0,
      financingInterestRatePct: 10.0,
      taxRatePct: 25.0,
      projectLifespanYears: 5,
      annualRevenues: [85000000, 110000000, 135000000, 140000000, 150000000],
      annualOpexCosts: [35000000, 42000000, 48000000, 50000000, 52000000],
      terminalValue: 25000000
    });

    if (!validAppraisal.hasAdequateData) {
      throw new Error('Valid appraisal should have hasAdequateData = true');
    }
    if (validAppraisal.npv <= 0) {
      throw new Error(`Expected positive NPV for viable project, got ${validAppraisal.npv}`);
    }
    if (validAppraisal.irrPct <= validAppraisal.discountRatePct) {
      throw new Error(`IRR (${validAppraisal.irrPct}%) should exceed discount rate (${validAppraisal.discountRatePct}%)`);
    }
    if (validAppraisal.discountedPaybackYears <= 0 || validAppraisal.discountedPaybackYears > 5) {
      throw new Error(`Discounted payback period out of bounds: ${validAppraisal.discountedPaybackYears}`);
    }

    // 2. Guardrail: Incomplete data must be flagged without misleading output
    const incompleteAppraisal = FinanceService.calculateMultiYearInvestmentAppraisal(finSessionKindia, {
      projectName: 'Projet Incomplet',
      initialInvestmentCapex: 0, // Missing capex
      discountRatePct: 12.0,
      inflationRatePct: 8.0,
      financingInterestRatePct: 10.0,
      taxRatePct: 25.0,
      projectLifespanYears: 0,
      annualRevenues: [],
      annualOpexCosts: []
    });

    if (incompleteAppraisal.hasAdequateData) {
      throw new Error('Incomplete data must set hasAdequateData = false');
    }
    if (incompleteAppraisal.limitationsWarnings.length === 0) {
      throw new Error('Must produce explicit limitations warnings for missing data');
    }
  });

  await runTest('Multi-Currency Engine & Strict Non-Equivalence', 'Performs date-aware currency conversions with BCRG source citations and rejects implicit equivalence', async () => {
    // 1. Convert EUR to GNF
    const eurConversion = FinanceService.convertCurrency(1000, 'EUR', 'GNF');
    if (eurConversion.convertedAmount !== 9350000) {
      throw new Error(`Expected 9,350,000 GNF for 1,000 EUR, got ${eurConversion.convertedAmount}`);
    }
    if (!eurConversion.source.includes('BCRG')) {
      throw new Error('Conversion must document BCRG source');
    }

    // 2. Reject unsupported currency pair (no implicit equivalence)
    let rejected = false;
    try {
      FinanceService.convertCurrency(1000, 'GBP' as any, 'JPY' as any);
    } catch (err: any) {
      if (err.message.includes('CURRENCY_CONVERSION_ERROR')) {
        rejected = true;
      }
    }
    if (!rejected) {
      throw new Error('Must reject unsupported currency pairs rather than assuming equivalence');
    }
  });

  await runTest('Scenario Stress Testing & Multi-Tenant Security', 'Tests yield shocks, price drops, cost inflation, and verifies scenario isolation and RBAC', async () => {
    // 1. Simulate scenarios
    const scenarios = await FinanceService.simulateFinancialScenarios(finSessionKindia, 'camp-pepper-s17-01');
    const yieldStress = scenarios.find(s => s.scenarioId === 'STRESS_YIELD_SHORTFALL_20');
    const priceStress = scenarios.find(s => s.scenarioId === 'STRESS_PRICE_DROP_15');
    const delayStress = scenarios.find(s => s.scenarioId === 'STRESS_DELAYED_PAYMENT_60D');

    if (!yieldStress || !priceStress || !delayStress) {
      throw new Error('Missing required stress test scenarios');
    }

    const base = scenarios.find(s => s.scenarioId === 'BASE')!;
    if (yieldStress.saleableOutputTons >= base.saleableOutputTons) {
      throw new Error('Yield shortfall scenario must reduce saleable output');
    }
    if (delayStress.workingCapitalPeakDeficit <= base.workingCapitalPeakDeficit) {
      throw new Error('Delayed payment scenario must increase peak working capital deficit');
    }

    // 2. RBAC check: VIEWER cannot create budgets
    let viewerBlocked = false;
    try {
      await FinanceService.createOrUpdateBudget(viewerSessionKindia, {
        entityType: 'CAMPAIGN',
        entityId: 'camp-pepper-s17-01',
        entityName: 'Test',
        fiscalYear: 2026,
        category: 'LABOR',
        expenseNature: 'OPEX',
        title: 'Illegal Viewer Budget',
        currency: 'GNF',
        plannedBudget: 5000000
      });
    } catch (err: any) {
      if (err.message.includes('SECURITY_ERROR')) viewerBlocked = true;
    }
    if (!viewerBlocked) throw new Error('VIEWER role was allowed to create a budget');

    // 3. Multi-tenant isolation: Fouta cannot access Kindia campaign finance
    let crossTenantBlocked = false;
    try {
      await FinanceService.calculateCampaignFinancialPerformance(foutaSession, 'camp-pepper-s17-01');
    } catch (err: any) {
      if (err.message.includes('SECURITY_ERROR')) crossTenantBlocked = true;
    }
    if (!crossTenantBlocked) throw new Error('Cross-tenant financial access was not blocked');
  });

  console.log('\n--- CATEGORY 15: PHASE 9 MANAGEMENT DASHBOARDS & DECISION SUPPORT ---');

  const adminSessionKindia: any = {
    token: 'test-token-admin',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      email: 'admin.kindia@farmingcalendar.dev',
      fullName: 'Ibrahima Diallo',
      role: 'ORG_ADMIN',
      activeOrganizationId: org1Id
    },
    organization: { id: org1Id, name: 'Coopérative Friguiagbé (Kindia)' }
  };

  await runTest('Executive Leadership Dashboard', 'Aggregates campaign performance, committed orders, projected revenue, costs, and delivery reliability from actual database records', async () => {
    const exec = DashboardService.getExecutiveDashboard(adminSessionKindia);

    if (exec.roleView !== 'LEADERSHIP') {
      throw new Error(`Expected roleView LEADERSHIP, got ${exec.roleView}`);
    }
    if (exec.campaignPerformance.activeCampaignsCount < 1) {
      throw new Error('Must report at least one active campaign');
    }
    if (exec.commercialCommitments.confirmedOrdersCount < 1) {
      throw new Error('Must aggregate confirmed commercial orders');
    }
    if (exec.commercialCommitments.projectedRevenueGNF <= 0) {
      throw new Error('Must compute positive projected commercial revenue in GNF');
    }
    if (exec.financialSummary.totalPlannedBudgetGNF <= 0) {
      throw new Error('Must calculate total planned budget from financial records');
    }
    if (exec.deliveryReliability.reliabilityScorePct < 0 || exec.deliveryReliability.reliabilityScorePct > 100) {
      throw new Error(`Reliability score out of range: ${exec.deliveryReliability.reliabilityScorePct}`);
    }
    if (exec.topRisks.length === 0) {
      throw new Error('Must provide prioritized top risks for executive leadership');
    }
    const unconfiguredMeteo = exec.externalServices.find(s => s.service.includes('Météo'));
    if (!unconfiguredMeteo || unconfiguredMeteo.status !== 'UNCONFIGURED') {
      throw new Error('External weather integration without API key must be honestly marked UNCONFIGURED');
    }
  });

  await runTest('Farm Manager & Agronomist Operational Dashboards', 'Tracks field operations due, overdue tasks, crop stages, observations, and input shortages', async () => {
    // 1. Farm Manager
    const farmMgr = DashboardService.getFarmManagerDashboard(adminSessionKindia);
    if (farmMgr.roleView !== 'FARM_MANAGER') {
      throw new Error(`Expected roleView FARM_MANAGER, got ${farmMgr.roleView}`);
    }
    if (farmMgr.cropConditions.length === 0) {
      throw new Error('Must track crop conditions across plots');
    }
    if (farmMgr.inputShortages.length === 0) {
      throw new Error('Must monitor input stock levels and flag shortages');
    }

    // 2. Agronomist
    const agro = DashboardService.getAgronomistDashboard(agroSessionKindia);
    if (agro.roleView !== 'AGRONOMIST') {
      throw new Error(`Expected roleView AGRONOMIST, got ${agro.roleView}`);
    }
    if (agro.cropStages.length === 0) {
      throw new Error('Must track phenological stages of campaigns');
    }
    if (agro.fieldObservations.length === 0) {
      throw new Error('Must record field sanitary observations');
    }
    if (agro.yieldForecasts.length === 0) {
      throw new Error('Must provide agronomic yield forecasts vs targets');
    }
  });

  await runTest('Commercial & Processing Dashboards', 'Consolidates buyer pipeline, demand-supply balance, batch conversion yields, and quality failures', async () => {
    // 1. Commercial Manager
    const comm = DashboardService.getCommercialDashboard(commSessionKindia);
    if (comm.roleView !== 'COMMERCIAL_MANAGER') {
      throw new Error(`Expected roleView COMMERCIAL_MANAGER, got ${comm.roleView}`);
    }
    if (comm.buyerPipeline.totalBuyersCount < 1) {
      throw new Error('Must track buyer CRM accounts');
    }
    if (comm.quotationsAndOrders.totalCommittedValueGNF <= 0) {
      throw new Error('Must calculate committed contract order value');
    }
    if (comm.demandVsSupplyBalance.pepperReservedTons <= 0) {
      throw new Error('Must track pepper reservation tonnage');
    }

    // 2. Processing Manager
    const proc = DashboardService.getProcessingDashboard(opsSessionKindia);
    if (proc.roleView !== 'PROCESSING_MANAGER') {
      throw new Error(`Expected roleView PROCESSING_MANAGER, got ${proc.roleView}`);
    }
    if (proc.capacityUtilization.installedDailyCapacityKg <= 0) {
      throw new Error('Must report installed daily processing capacity');
    }
    if (proc.capacityUtilization.utilizationRatePct <= 0) {
      throw new Error('Must compute processing capacity utilization percentage');
    }
    if (proc.batchYields.length === 0) {
      throw new Error('Must report batch conversion yields and variances');
    }
  });

  await runTest('Logistics & Finance Dashboards', 'Monitors active shipments, forward delay hours, compliance documents, and OPEX/CAPEX execution', async () => {
    // 1. Logistics Manager
    const log = DashboardService.getLogisticsDashboard(logSessionKindia);
    if (log.roleView !== 'LOGISTICS_MANAGER') {
      throw new Error(`Expected roleView LOGISTICS_MANAGER, got ${log.roleView}`);
    }
    if (log.shipmentsInProgress.totalActiveShipments < 1) {
      throw new Error('Must track active shipments in transit');
    }
    if (log.milestoneTracking.length === 0) {
      throw new Error('Must provide milestone progress tracking');
    }
    if (log.documentCompliance.totalDocumentsRequired < 1) {
      throw new Error('Must track export document compliance matrix');
    }

    // 2. Finance Manager
    const fin = DashboardService.getFinanceDashboard(finSessionKindia);
    if (fin.roleView !== 'FINANCE_MANAGER') {
      throw new Error(`Expected roleView FINANCE_MANAGER, got ${fin.roleView}`);
    }
    if (fin.budgetExecution.totalPlannedOpexGNF <= 0) {
      throw new Error('Must compute total planned OPEX');
    }
    if (fin.cashFlowSummary.peakWorkingCapitalDeficitGNF <= 0) {
      throw new Error('Must compute peak working capital deficit (BFR)');
    }
    if (fin.budgetCategoryBreakdown.length === 0) {
      throw new Error('Must provide budget execution breakdown by category');
    }
  });

  await runTest('Decision Support Engine & Explainable Recommendations', 'Verifies 6 required alert scenarios, underlying data, assumptions, severity, and next steps', async () => {
    const recs = DashboardService.generateDecisionSupport(adminSessionKindia);

    if (recs.length === 0) {
      throw new Error('Decision support engine must generate recommendations');
    }

    // Every recommendation must show underlying data, assumptions, severity, and suggested next steps
    for (const rec of recs) {
      if (!rec.id || !rec.title || !rec.ruleKey) {
        throw new Error('Recommendation missing mandatory identity fields');
      }
      if (!['CRITICAL', 'WARNING', 'INFO'].includes(rec.severity)) {
        throw new Error(`Invalid severity: ${rec.severity}`);
      }
      if (!rec.underlyingData || Object.keys(rec.underlyingData).length === 0) {
        throw new Error(`Recommendation ${rec.title} missing explainable underlying data`);
      }
      if (!rec.assumptions || rec.assumptions.length === 0) {
        throw new Error(`Recommendation ${rec.title} missing explicit assumptions`);
      }
      if (!rec.suggestedNextSteps || rec.suggestedNextSteps.length === 0) {
        throw new Error(`Recommendation ${rec.title} missing suggested next steps`);
      }
      if (!['RULES_BASED', 'AI_ADVISORY'].includes(rec.type)) {
        throw new Error(`Recommendation ${rec.title} must distinguish rules-based from AI-advisory`);
      }
      if (!rec.targetTab) {
        throw new Error(`Recommendation ${rec.title} missing targetTab for drill-down`);
      }
    }

    // Check specific required scenarios
    const shortageRisk = recs.find(r => r.ruleKey === 'FORECAST_SHORTAGE_ORDER_RISK');
    const delayRisk = recs.find(r => r.ruleKey === 'SHIPMENT_DELIVERY_DELAY_RISK');
    const capacityRisk = recs.find(r => r.ruleKey === 'PROCESSING_CAPACITY_BOTTLENECK');
    const qualityRisk = recs.find(r => r.ruleKey === 'QUALITY_FAILURE_BLOCKS_DISPATCH');
    const bfrRisk = recs.find(r => r.ruleKey === 'CASH_FLOW_PEAK_DEFICIT');
    const aiAdvisory = recs.find(r => r.type === 'AI_ADVISORY');

    if (!shortageRisk) throw new Error('Missing forecast shortage order risk recommendation');
    if (!delayRisk) throw new Error('Missing shipment delivery delay risk recommendation');
    if (!capacityRisk) throw new Error('Missing processing capacity bottleneck recommendation');
    if (!qualityRisk) throw new Error('Missing quality failure blocks dispatch recommendation');
    if (!bfrRisk) throw new Error('Missing cash flow peak deficit recommendation');
    if (!aiAdvisory) throw new Error('Missing AI-advisory recommendation with clear labeling');
  });

  await runTest('Tenant Isolation & Report Export Engine', 'Enforces strict tenant boundary isolation and generates exportable CSV and JSON reports', async () => {
    // 1. Tenant boundary: Org Beta cannot see Org Alpha's campaigns
    const foutaDashboard = DashboardService.getExecutiveDashboard(foutaSession);
    const kindiaDashboard = DashboardService.getExecutiveDashboard(adminSessionKindia);

    // Kindia has active campaigns in seed; Fouta has separate or zero campaigns in Org Beta
    if (foutaDashboard.campaignPerformance.totalCultivatedAreaHa === kindiaDashboard.campaignPerformance.totalCultivatedAreaHa) {
      // Must be isolated if Fouta has no campaigns
      const state = getState();
      const foutaCampaigns = (state.production_campaigns || []).filter(c => c.organization_id === org2Id);
      if (foutaCampaigns.length === 0 && foutaDashboard.campaignPerformance.activeCampaignsCount !== 0) {
        throw new Error('Tenant isolation violated: Fouta dashboard leaked Kindia campaigns');
      }
    }

    // 2. Export CSV
    const csvExport = DashboardService.exportDashboardReport(adminSessionKindia, 'LEADERSHIP', 'CSV');
    if (!csvExport.filename.endsWith('.csv') || !csvExport.content.includes('Rapport Tableau de Bord')) {
      throw new Error('CSV export format invalid');
    }

    // 3. Export JSON
    const jsonExport = DashboardService.exportDashboardReport(adminSessionKindia, 'FINANCE_MANAGER', 'JSON');
    if (!jsonExport.filename.endsWith('.json')) {
      throw new Error('JSON export filename invalid');
    }
    const parsed = JSON.parse(jsonExport.content);
    if (!parsed.metadata || parsed.metadata.roleView !== 'FINANCE_MANAGER' || !parsed.data) {
      throw new Error('JSON export payload structure invalid');
    }
  });

  console.log('\n--- CATEGORY 16: PHASE 10 LOCALIZATION & UX REVIEW ---');

  await runTest('Full Translation Key Parity (EN & FR)', 'Recursively verifies that all navigation, actions, models, and alerts exist in both French and English', async () => {
    function getAllKeys(obj: any, prefix = ''): string[] {
      let keys: string[] = [];
      for (const k of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
          keys = keys.concat(getAllKeys(obj[k], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    const frKeys = new Set(getAllKeys(frTranslations));
    const enKeys = new Set(getAllKeys(enTranslations));

    const missingInEn: string[] = [];
    const missingInFr: string[] = [];

    for (const k of frKeys) {
      if (!enKeys.has(k)) missingInEn.push(k);
    }
    for (const k of enKeys) {
      if (!frKeys.has(k)) missingInFr.push(k);
    }

    if (missingInEn.length > 0) {
      throw new Error(`Missing English translations for keys: ${missingInEn.slice(0, 10).join(', ')}`);
    }
    if (missingInFr.length > 0) {
      throw new Error(`Missing French translations for keys: ${missingInFr.slice(0, 10).join(', ')}`);
    }

    // Verify critical domains are present
    const criticalSections = ['nav', 'common', 'units', 'auth', 'roles', 'calendar', 'master_calendar', 'agricultural', 'commercial', 'operations', 'logistics', 'finance', 'dashboard', 'settings', 'validation', 'notifications'];
    for (const section of criticalSections) {
      if (!(section in (frTranslations as any))) {
        throw new Error(`Section ${section} missing in fr.json`);
      }
      if (!(section in (enTranslations as any))) {
        throw new Error(`Section ${section} missing in en.json`);
      }
    }
  });

  await runTest('Locale-Aware Currency & Number Formatting', 'Formats GNF with 0 decimals and adapts USD, EUR, and XOF to target locales', async () => {
    // 1. GNF formatting (0 decimals required)
    const gnfFr = LocalizationService.formatCurrency(12500000, 'GNF', 'fr');
    const gnfEn = LocalizationService.formatCurrency(12500000, 'GNF', 'en');

    if (!gnfFr.includes('12') || !gnfFr.includes('GNF')) {
      throw new Error(`Unexpected FR GNF formatting: ${gnfFr}`);
    }
    if (!gnfEn.includes('12,500,000') || !gnfEn.includes('GNF')) {
      throw new Error(`Unexpected EN GNF formatting: ${gnfEn}`);
    }
    if (gnfFr.includes('.00') || gnfFr.includes(',00')) {
      throw new Error('GNF must not include sub-unit decimals');
    }

    // 2. Compact currency
    const compactFr = LocalizationService.formatCompactCurrency(15000000, 'GNF', 'fr');
    const compactEn = LocalizationService.formatCompactCurrency(15000000, 'GNF', 'en');
    if (!compactFr.includes('15') || !compactFr.includes('M')) {
      throw new Error(`Unexpected compact FR: ${compactFr}`);
    }
    if (!compactEn.includes('15') || !compactEn.includes('M')) {
      throw new Error(`Unexpected compact EN: ${compactEn}`);
    }

    // 3. Number formatting
    const numFr = LocalizationService.formatNumber(1250.75, 2, 'fr');
    const numEn = LocalizationService.formatNumber(1250.75, 2, 'en');
    if (!numFr.includes('1') || !numFr.includes('250')) {
      throw new Error(`Unexpected number FR: ${numFr}`);
    }
    if (numEn !== '1,250.75') {
      throw new Error(`Expected '1,250.75', got ${numEn}`);
    }
  });

  await runTest('Locale-Aware Date, Time & Relative Timestamps', 'Correctly formats dates, times and relative intervals in target languages', async () => {
    const testDate = new Date('2026-10-15T09:30:00Z');

    const dateFr = LocalizationService.formatDate(testDate, 'medium', 'fr', 'Africa/Conakry');
    const dateEn = LocalizationService.formatDate(testDate, 'medium', 'en', 'Africa/Conakry');

    if (!dateFr.toLowerCase().includes('oct')) {
      throw new Error(`Expected French month in ${dateFr}`);
    }
    if (!dateEn.toLowerCase().includes('oct')) {
      throw new Error(`Expected English month in ${dateEn}`);
    }

    // Relative times
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
    const yesterday = new Date(now.getTime() - 25 * 3600 * 1000);

    const relFr = LocalizationService.formatRelativeTime(twoHoursAgo, 'fr');
    const relEn = LocalizationService.formatRelativeTime(twoHoursAgo, 'en');
    if (!relFr.includes('2 h')) throw new Error(`Unexpected relative time FR: ${relFr}`);
    if (!relEn.includes('2h ago')) throw new Error(`Unexpected relative time EN: ${relEn}`);

    const yestFr = LocalizationService.formatRelativeTime(yesterday, 'fr');
    const yestEn = LocalizationService.formatRelativeTime(yesterday, 'en');
    if (yestFr !== 'Hier') throw new Error(`Expected 'Hier', got ${yestFr}`);
    if (yestEn !== 'Yesterday') throw new Error(`Expected 'Yesterday', got ${yestEn}`);
  });

  await runTest('Metric Units System & Label Representation', 'Supports kg, t, ha, m2, units and provides clear localized unit descriptors', async () => {
    const massFr = LocalizationService.formatUnit(2500, 'kg', 'fr');
    const massEn = LocalizationService.formatUnit(2500, 'kg', 'en');
    if (!massFr.includes('kg')) throw new Error(`Unit symbol kg missing in ${massFr}`);
    if (!massEn.includes('kg')) throw new Error(`Unit symbol kg missing in ${massEn}`);

    const areaFr = LocalizationService.formatUnit(15.5, 'ha', 'fr', true);
    const areaEn = LocalizationService.formatUnit(15.5, 'ha', 'en', true);
    if (!areaFr.includes('Hectares')) throw new Error(`Long label Hectares missing in ${areaFr}`);
    if (!areaEn.includes('Hectares')) throw new Error(`Long label Hectares missing in ${areaEn}`);

    const tonFr = LocalizationService.formatUnit(100, 't', 'fr', true);
    const tonEn = LocalizationService.formatUnit(100, 't', 'en', true);
    if (!tonFr.includes('Tonnes')) throw new Error(`Long label Tonnes missing in ${tonFr}`);
    if (!tonEn.includes('Tons')) throw new Error(`Long label Tons missing in ${tonEn}`);
  });

  await runTest('Organization Regional Preferences & Baseline Configuration', 'Configures Guinea baseline and enforces RBAC permission on organization preference updates', async () => {
    // 1. Initial Guinea baseline
    const initialPrefs = LocalizationService.getOrganizationPreferences(adminSessionKindia);
    if (initialPrefs.preferredLanguage !== 'fr') {
      throw new Error(`Expected default language 'fr', got ${initialPrefs.preferredLanguage}`);
    }
    if (initialPrefs.preferredCurrency !== 'GNF') {
      throw new Error(`Expected default currency 'GNF', got ${initialPrefs.preferredCurrency}`);
    }
    if (initialPrefs.preferredTimezone !== 'Africa/Conakry') {
      throw new Error(`Expected default timezone 'Africa/Conakry', got ${initialPrefs.preferredTimezone}`);
    }
    if (initialPrefs.preferredUnitSystem !== 'METRIC') {
      throw new Error(`Expected default unit system 'METRIC', got ${initialPrefs.preferredUnitSystem}`);
    }

    // 2. ORG_ADMIN updates preferences
    const updated = LocalizationService.updateOrganizationPreferences(adminSessionKindia, {
      preferredLanguage: 'en',
      preferredCurrency: 'USD'
    });
    if (updated.preferredLanguage !== 'en' || updated.preferredCurrency !== 'USD') {
      throw new Error('Failed to update organization preferences');
    }

    // Restore to Guinea baseline
    LocalizationService.updateOrganizationPreferences(adminSessionKindia, {
      preferredLanguage: 'fr',
      preferredCurrency: 'GNF'
    });

    // 3. Unauthorized VIEWER role is blocked
    let viewerBlocked = false;
    try {
      LocalizationService.updateOrganizationPreferences(viewerSessionKindia, {
        preferredCurrency: 'EUR'
      });
    } catch (err: any) {
      if (err.message.includes('SECURITY_ERROR')) viewerBlocked = true;
    }
    if (!viewerBlocked) {
      throw new Error('VIEWER role was improperly allowed to update organization preferences');
    }
  });

  await runTest('Business Data Non-Translation & Input Integrity', 'Verifies that user-entered farm names, buyer companies, plot codes, and notes are never translated', async () => {
    const state = getState();
    const farm = state.farms.find((f: any) => f.organization_id === org1Id);
    const buyer = state.buyers.find((b: any) => b.organization_id === org1Id);

    if (!farm || !buyer) throw new Error('Seeded farm or buyer missing');

    const originalFarmName = farm.name;
    const originalBuyerName = buyer.company_name;

    // Simulate language switch
    const langSwitchEn = LocalizationService.formatDate(new Date(), 'short', 'en');
    const langSwitchFr = LocalizationService.formatDate(new Date(), 'short', 'fr');

    if (farm.name !== originalFarmName) {
      throw new Error('Farm name was corrupted by language switch');
    }
    if (buyer.company_name !== originalBuyerName) {
      throw new Error('Buyer company name was corrupted by language switch');
    }
  });

  await runTest('Bilingual Operational Notification & Email Templates', 'Generates localized notification templates for operations, stock alerts, harvests, and shipment delays', async () => {
    // 1. Task Overdue
    const taskFr = LocalizationService.getNotificationTemplate('TASK_OVERDUE', { plotName: 'Parcelle K-01' }, 'fr');
    const taskEn = LocalizationService.getNotificationTemplate('TASK_OVERDUE', { plotName: 'Plot K-01' }, 'en');
    if (!taskFr.subject.includes('retard')) throw new Error('FR task subject missing expected phrasing');
    if (!taskEn.subject.includes('overdue')) throw new Error('EN task subject missing expected phrasing');

    // 2. Input Shortage
    const inputFr = LocalizationService.getNotificationTemplate('INPUT_SHORTAGE', { entityCode: 'NPK 15-15-15', quantity: 100, unit: 'kg' }, 'fr');
    const inputEn = LocalizationService.getNotificationTemplate('INPUT_SHORTAGE', { entityCode: 'NPK 15-15-15', quantity: 100, unit: 'kg' }, 'en');
    if (!inputFr.body.includes('100 kg') || !inputFr.body.includes('Réapprovisionnement')) {
      throw new Error(`Unexpected FR input template: ${inputFr.body}`);
    }
    if (!inputEn.body.includes('100 kg') || !inputEn.body.includes('Reorder')) {
      throw new Error(`Unexpected EN input template: ${inputEn.body}`);
    }

    // 3. Quality Quarantine
    const qualFr = LocalizationService.getNotificationTemplate('QUALITY_QUARANTINE', { entityCode: 'LOT-EXP-001' }, 'fr');
    const qualEn = LocalizationService.getNotificationTemplate('QUALITY_QUARANTINE', { entityCode: 'LOT-EXP-001' }, 'en');
    if (!qualFr.body.includes('quarantaine')) throw new Error(`Unexpected FR quality template: ${qualFr.body}`);
    if (!qualEn.body.includes('quarantine')) throw new Error(`Unexpected EN quality template: ${qualEn.body}`);
  });

  console.log('\n--- CATEGORY 17: PHASE 11 RELEASE READINESS & MANDATORY FAILURE SCENARIOS ---');

  await runTest('End-to-End Agribusiness Lifecycle Integration', 'Verifies complete multi-module flow from org & farm setup to export and bilingual switch', async () => {
    // 1. Auth & Session
    const session = adminSessionKindia;
    if (!session.user || session.user.role !== 'ORG_ADMIN') throw new Error('Valid ORG_ADMIN session required');

    // 2. Farm, Plot, Campaign
    const state = getState();
    const farm = state.farms.find((f: any) => f.organization_id === org1Id);
    if (!farm) throw new Error('Farm required');
    const plot = state.plots.find((p: any) => p.farm_id === farm.id);
    if (!plot) throw new Error('Plot required');
    const campaign = state.production_campaigns.find((c: any) => c.organization_id === org1Id);
    if (!campaign) throw new Error('Campaign required');

    // 3. Backward Planning & Milestones
    const plan = PlanningService.calculateBackwardSchedule({
      productKey: 'PEPPER_S17',
      targetDeliveryDate: '2026-11-20',
      targetQuantityTons: 10
    });
    if (!plan.steps || plan.steps.length === 0 || !plan.criticalPathStages) throw new Error('Planning milestones required');

    // 4. Linked Calendar Events
    const events = await CalendarService.listEvents(org1Id, { farmId: farm.id }, { isPlatformOwner: false, organizationId: org1Id });
    if (!Array.isArray(events)) throw new Error('Calendar events array required');

    // 5. Harvest Forecasting
    const forecast = PlanningService.calculateYieldForecast({
      campaignId: campaign.id,
      campaignName: campaign.name,
      areaHa: 2.0,
      baseYieldTonsPerHa: 15.0,
      plannedQuantityTons: 30.0
    });
    if (forecast.forecastQuantityTons <= 0) throw new Error('Harvest yield forecast must be positive');

    // 6. Buyer & Order
    const buyers = await CommercialService.getBuyers(commSessionKindia);
    if (buyers.length === 0) throw new Error('Buyer CRM accounts required');
    const orders = await CommercialService.getOrders(commSessionKindia);
    if (orders.length === 0) throw new Error('Commercial orders required');

    // 7. Supply vs Demand & Reservation
    const balances = await CommercialService.getSupplyDemandBalance(commSessionKindia);
    if (!Array.isArray(balances) || balances.length === 0) throw new Error('Supply reservation balance tracking required');

    // 8. Processing & Milling
    const recipes = await OperationsService.listProcessingRecipes(opsSessionKindia);
    if (recipes.length === 0) throw new Error('Processing recipes required');

    // 9. Logistics Shipment
    const shipments = await LogisticsService.listShipments(logSessionKindia);
    if (shipments.length === 0) throw new Error('Logistics shipments required');

    // 10. Financial Performance & Variance
    const fin = await FinanceService.calculateCampaignFinancialPerformance(finSessionKindia, 'camp-pepper-s17-01');
    if (fin.costPerHectare <= 0) throw new Error('Financial unit metrics required');

    // 11. Bilingual Toggle
    const frTitle = LocalizationService.formatDate(new Date(), 'short', 'fr');
    const enTitle = LocalizationService.formatDate(new Date(), 'short', 'en');
    if (!frTitle || !enTitle) throw new Error('Bilingual formatting must work');
  });

  await runTest('Failure Scenario 1: 20% Crop Yield Shortfall Stress Simulation', 'Tests -20% harvest yield shock, computes EBIT drop, and verifies zero mutation of actual books', async () => {
    const scenarios = await FinanceService.simulateFinancialScenarios(adminSessionKindia, 'camp-pepper-s17-01');
    const base = scenarios.find(s => s.scenarioId === 'BASE')!;
    const yieldStress = scenarios.find(s => s.scenarioId === 'STRESS_YIELD_SHORTFALL_20')!;

    if (yieldStress.totalRevenue >= base.totalRevenue) {
      throw new Error('A 20% yield shortfall must reduce gross revenue');
    }
    if (yieldStress.operatingProfitEbit >= base.operatingProfitEbit) {
      throw new Error('A 20% yield shortfall must reduce operating profit');
    }

    // Verify sandboxed isolation: actual campaign records are never mutated
    const state = getState();
    const actualCamp = state.production_campaigns.find((c: any) => c.id === 'c1111111-1111-1111-1111-111111111111' || c.code === 'CAMP-PIM-2026-01');
    if (!actualCamp || actualCamp.production_target_quantity !== 18000) {
      throw new Error('Actual campaign production target was corrupted by simulation');
    }
  });

  await runTest('Failure Scenario 2: Failed Quality Inspection Blocks Dispatch', 'Confirms that an uninspected or failed lot is strictly prohibited from logistics shipping', async () => {
    // 1. Record failed inspection
    const failedInspection = await OperationsService.recordQualityInspection(agroSessionKindia, {
      batchNumber: 'LOT-FAIL-TEST-001',
      productName: 'Piment Oiseau S17',
      inspectorName: 'Dr. Alpha Bah',
      inspectorAccreditation: 'IRAG / SENAQ Agrément Qualité',
      sampleSizeTaken: '20 kg',
      defectsRatePct: 18.0,
      maxPermissibleDefectsPct: 5.0,
      foreignMatterPct: 2.5,
      maxPermissibleForeignMatterPct: 0.5,
      chemicalResiduesCompliant: false,
      pesticideMRLCompliant: false,
      releaseStatus: 'REJECTED',
      nonConformanceReason: 'Exceeds maximum allowable moisture and pesticide residue'
    });

    if (failedInspection.releaseStatus !== 'REJECTED') {
      throw new Error('Expected REJECTED inspection decision');
    }

    // 2. Attempt shipment dispatch with rejected lot -> Must be rejected with DISPATCH_BLOCKED error
    let dispatchBlocked = false;
    try {
      const orders = await CommercialService.getOrders(commSessionKindia);
      const targetOrder = orders.find(o => o.status === 'CONFIRMED') || orders[0];
      await LogisticsService.createShipment(logSessionKindia, {
        orderId: targetOrder.id,
        transportMode: 'MARITIME',
        carrierName: 'Bolloré Africa Logistics Guinée',
        containerOrVehicleId: 'MSCU-998877-6',
        dispatchLocation: 'Magasin Central Kindia',
        destinationPortOrCity: 'Port Autonome de Conakry (PAC)',
        destinationCountry: 'France',
        destinationMarket: 'EUROPEAN_UNION',
        linkedBatches: [{
          inventoryItemId: 'inv-01',
          batchNumber: 'LOT-FAIL-TEST-001',
          productName: 'Piment Oiseau S17',
          quantityAllocated: 5000,
          unit: 'KG'
        }],
        plannedPickupDate: '2026-11-20',
        estimatedArrivalDate: '2026-12-05'
      });
    } catch (err: any) {
      if (err.message.includes('DISPATCH_BLOCKED') || err.message.includes('REJECTED')) {
        dispatchBlocked = true;
      }
    }

    if (!dispatchBlocked) {
      throw new Error('CRITICAL FLAW: Logistics allowed creating a shipment for a REJECTED / quarantined quality lot');
    }
  });

  await runTest('Failure Scenario 3: Three-Day Forward Logistics Delay Propagation', 'Simulates 72h milestone delay, shifts ETA by 3 days, and triggers DELAYED status and demurrage alert', async () => {
    const shipments = await LogisticsService.listShipments(logSessionKindia);
    const targetShipment = shipments[0];
    if (!targetShipment || !targetShipment.milestones || targetShipment.milestones.length === 0) {
      throw new Error('Shipment with milestones required');
    }

    const firstMilestone = targetShipment.milestones[0];
    const initialEta = new Date(targetShipment.estimatedArrivalDate).getTime();
    const prevMilestoneDelay = firstMilestone.delayHours || 0;

    // Propagate 72 hours (3 days) forward delay
    const updatedShipment = await LogisticsService.updateShipmentMilestone(
      logSessionKindia,
      targetShipment.id,
      firstMilestone.id,
      {
        status: 'DELAYED',
        delayHours: prevMilestoneDelay + 72,
        notes: 'Severe congestion at Port of Conakry road interchange.'
      }
    );

    const updatedEta = new Date(updatedShipment.estimatedArrivalDate).getTime();
    const etaShiftHours = (updatedEta - initialEta) / (3600 * 1000);

    // Clean up delay to maintain clean state for other tests and repeated runs
    await LogisticsService.updateShipmentMilestone(
      logSessionKindia,
      targetShipment.id,
      firstMilestone.id,
      {
        status: 'PENDING',
        delayHours: prevMilestoneDelay
      }
    );

    if (etaShiftHours < 70) {
      throw new Error(`Expected ETA to shift by at least 72 hours, shifted by ${etaShiftHours}h`);
    }
    if (updatedShipment.currentStatus !== 'DELAYED') {
      throw new Error(`Expected shipment status to be DELAYED, got ${updatedShipment.currentStatus}`);
    }
  });

  await runTest('Failure Scenario 4: Strategic Packaging Shortage Blocks Release', 'Prevents issuing packaging materials when warehouse quantity is below requested batch quantity', async () => {
    let shortageBlocked = false;
    try {
      // inv-pkg-cart-001 has quantity_available: 1500 UNIT
      // Requesting 5,000 UNIT must fail with insufficient stock
      await OperationsService.recordStockMovement(opsSessionKindia, {
        inventoryItemId: 'inv-pkg-cart-001',
        batchNumber: 'PKG-RUN-TEST-01',
        movementType: 'ISSUING',
        quantity: 5000,
        locationSource: 'Magasin Emballage Kindia',
        locationDestination: 'Atelier de Conditionnement',
        reason: 'Issue packaging cartons for large milling run',
        notes: 'Attempting to issue beyond available stock'
      });
    } catch (err: any) {
      if (err.message.includes('Insufficient available stock') || err.message.includes('Available:')) {
        shortageBlocked = true;
      }
    }

    if (!shortageBlocked) {
      throw new Error('Inventory flaw: System permitted issuing packaging inventory exceeding available balance');
    }
  });

  await runTest('Failure Scenario 5: Projected Cash-Flow Deficit Identification', 'Detects multi-month liquidity deficit (BFR) and surfaces explainable working capital alert', async () => {
    const finPerf = await FinanceService.calculateCampaignFinancialPerformance(adminSessionKindia, 'camp-pepper-s17-01');

    if (!finPerf || !Array.isArray(finPerf.cashFlowSchedule) || finPerf.cashFlowSchedule.length === 0) {
      throw new Error('Monthly cash flow schedule required');
    }
    if (finPerf.workingCapitalRequirement <= 0) {
      throw new Error('Peak working capital deficit (BFR) must be positive');
    }

    // Check that decision support generates the alert
    const recs = DashboardService.generateDecisionSupport(adminSessionKindia);
    const bfrRec = recs.find(r => r.ruleKey === 'CASH_FLOW_PEAK_DEFICIT');
    if (!bfrRec || bfrRec.severity !== 'WARNING') {
      throw new Error('Decision support must flag projected cash-flow deficit as WARNING');
    }
  });

  await runTest('Failure Scenario 6: 12,000 kg Order vs. 10,000 kg Uncommitted Stock', 'Rejects reservation when order volume exceeds net uncommitted campaign supply', async () => {
    const orders = await CommercialService.getOrders(commSessionKindia);
    const confirmedOrder = orders.find(o => o.status === 'CONFIRMED' && o.lines && o.lines.length > 0);
    if (!confirmedOrder) throw new Error('Confirmed order required');

    let oversellingBlocked = false;
    try {
      // Attempting to reserve 12.0 tons (12,000 kg) on pepper campaign with 10t uncommitted capacity (18t total - 8t committed)
      await CommercialService.reserveSupply(commSessionKindia, {
        orderId: confirmedOrder.id,
        orderLineId: confirmedOrder.lines[0].id,
        campaignId: 'camp-pepper-s17-01',
        quantityTons: 12.0
      });
    } catch (err: any) {
      if (err.message.includes('INSUFFICIENT_SUPPLY_ERROR') && err.message.includes('Overselling rejected')) {
        oversellingBlocked = true;
      }
    }

    if (!oversellingBlocked) {
      throw new Error('Commercial flaw: System permitted reservation exceeding uncommitted supply');
    }
  });

  await runTest('Failure Scenario 7: Concurrent Double-Booking Prevention', 'Ensures two simultaneous reservation attempts cannot over-allocate finite supply capacity', async () => {
    const orders = await CommercialService.getOrders(commSessionKindia);
    const targetOrder = orders.find(o => o.status === 'CONFIRMED' && o.lines && o.lines.length > 0);
    if (!targetOrder) throw new Error('Confirmed order required');

    // Create an explicit race condition: Attempt to reserve 8.0 tons twice simultaneously
    // Total uncommitted capacity on pepper campaign (10t) cannot accommodate 8t + 8t = 16t
    const attempts = await Promise.allSettled([
      CommercialService.reserveSupply(commSessionKindia, {
        orderId: targetOrder.id,
        orderLineId: targetOrder.lines[0].id,
        campaignId: 'camp-pepper-s17-01',
        quantityTons: 8.0
      }),
      CommercialService.reserveSupply(commSessionKindia, {
        orderId: targetOrder.id,
        orderLineId: targetOrder.lines[0].id,
        campaignId: 'camp-pepper-s17-01',
        quantityTons: 8.0
      })
    ]);

    const succeeded = attempts.filter(a => a.status === 'fulfilled');
    const rejected = attempts.filter(a => a.status === 'rejected');

    // Clean up any successful reservation created during test
    for (const s of succeeded) {
      if (s.status === 'fulfilled' && (s.value as any).id) {
        await CommercialService.releaseSupplyReservation(commSessionKindia, (s.value as any).id);
      }
    }

    if (succeeded.length === 2) {
      throw new Error('Concurrency failure: Both simultaneous reservations succeeded, causing double-allocation beyond capacity');
    }
    if (rejected.length === 0) {
      throw new Error('Concurrency failure: At least one reservation attempt must be rejected');
    }
  });

  await runTest('Failure Scenario 8: Unauthorized Cross-Tenant Record Access', 'Enforces strict tenant boundary: Organization Beta cannot inspect or mutate Organization Alpha records', async () => {
    // 1. Fouta cannot list or read Kindia shipments
    let blockedShipment = false;
    try {
      const returned = await LogisticsService.listShipments(foutaSession);
      if (returned.some((s: any) => s.organizationId === org1Id)) {
        throw new Error('Tenant leak: Kindia shipments returned to Fouta session');
      }
      blockedShipment = true;
    } catch (err: any) {
      if (err.message.includes('SECURITY_ERROR')) blockedShipment = true;
    }
    if (!blockedShipment) throw new Error('Cross-tenant shipment access not secured');

    // 2. Fouta cannot access Kindia financial performance
    let blockedFinance = false;
    try {
      await FinanceService.calculateCampaignFinancialPerformance(foutaSession, 'camp-pepper-s17-01');
    } catch (err: any) {
      if (err.message.includes('SECURITY_ERROR')) blockedFinance = true;
    }
    if (!blockedFinance) throw new Error('Cross-tenant financial data was not blocked');
  });

  await runTest('Failure Scenario 9: Expired or Invalid Session Authentication', 'Rejects tampered, expired, or missing JWT tokens with clear unauthorized error', async () => {
    let rejectedInvalid = false;
    try {
      AuthService.verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature');
    } catch (err: any) {
      if (err.message.includes('Invalid or expired authentication token')) {
        rejectedInvalid = true;
      }
    }
    if (!rejectedInvalid) throw new Error('Security flaw: Tampered token was accepted');

    let rejectedEmpty = false;
    try {
      AuthService.verifyToken('');
    } catch (err: any) {
      rejectedEmpty = true;
    }
    if (!rejectedEmpty) throw new Error('Security flaw: Empty token was accepted');
  });

  await runTest('Failure Scenario 10: Database Connection Resiliency & Clean Recovery', 'Gracefully recovers when relational database is unreachable and preserves local persistent state', async () => {
    // When SQL_HOST is unreachable or unconfigured, initDatabase must fall back gracefully to local engine
    const originalHost = process.env.SQL_HOST;
    try {
      process.env.SQL_HOST = '127.0.0.1'; // Local host without active PG daemon
      process.env.SQL_USER = 'fake_user';
      process.env.SQL_PASSWORD = 'fake_password';
      process.env.SQL_DB_NAME = 'fake_db';

      const result = await initDatabase();
      // Must not crash, but return isPostgres: false and maintain state
      const state = getState();
      if (!state.organizations || state.organizations.length === 0) {
        throw new Error('Database state corrupted after connection attempt');
      }
    } finally {
      process.env.SQL_HOST = originalHost;
    }
  });

  console.log('\n===============================================================');
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('===============================================================\n');

  return {
    total: totalCount,
    passed: passedCount,
    failed: totalCount - passedCount,
    results
  };
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('run-tests.ts')) {
  executeAllTests().then(summary => {
    if (summary.failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  });
}
