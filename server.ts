import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './src/db/connection.ts';
import { AuthService } from './src/services/auth.service.ts';
import { OrgService } from './src/services/org.service.ts';
import { getAuditLogs, logAuditEvent } from './src/services/audit.service.ts';
import {
  requireAuth,
  requireRole,
  requireTenantIsolation,
  rateLimiter,
  AuthenticatedRequest
} from './src/middleware/auth.middleware.ts';
import { CalendarService } from './src/services/calendar.service.ts';
import { AgriculturalService } from './src/services/agricultural.service.ts';
import { CommercialService } from './src/services/commercial.service.ts';
import { OperationsService } from './src/services/operations.service.ts';
import { LogisticsService } from './src/services/logistics.service.ts';
import { FinanceService } from './src/services/finance.service.ts';
import { DashboardService } from './src/services/dashboard.service.ts';
import { LocalizationService } from './src/services/localization.service.ts';
import { executeAllTests } from './test/run-tests.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Initialize DB and run migrations
  const dbStatus = await initDatabase();

  app.use(express.json());

  // API request logger
  app.use((req, _res, next) => {
    if (req.url.startsWith('/api/')) {
      const timestamp = new Date().toISOString();
      console.log(`[API ${req.method}] ${req.url} (${timestamp})`);
    }
    next();
  });

  // ==========================================
  // Public Diagnostic & System Endpoints
  // ==========================================

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'UP',
        service: 'Farming Calendar API (Phase 1 Foundation)',
        environment: process.env.NODE_ENV || 'development',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          configuredDriver: dbStatus.isPostgres ? 'PostgreSQL (Cloud SQL)' : 'Persistent Relational Engine (PostgreSQL Compatible)',
          isPostgresConnected: dbStatus.isPostgres,
          schemaVersion: '003_dev_seed.sql'
        },
        systemMemory: {
          rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        }
      }
    });
  });

  app.get('/api/v1/system/info', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        appName: 'Farming Calendar SaaS',
        phase: 'PHASE 1: FOUNDATION AND SECURITY',
        marketScope: {
          primaryMarket: 'Guinea (Conakry, Kindia, Mamou, Labé, Kankan, Nzérékoré)',
          expansionScope: 'ECOWAS / International Agribusiness',
          supportedCurrencies: ['GNF', 'USD', 'EUR', 'XOF'],
          defaultLocale: 'fr',
          supportedLocales: ['fr', 'en']
        },
        rolesConfigured: [
          'PLATFORM_OWNER',
          'ORG_ADMIN',
          'MANAGER',
          'AGRONOMIST',
          'COMMERCIAL_MANAGER',
          'FINANCE_MANAGER',
          'OPERATIONS_STAFF',
          'VIEWER'
        ],
        tenancyIsolation: {
          enforcement: 'Database RLS & Server-side Middleware Tenant Isolation',
          crossTenantAccess: 'Strictly prohibited'
        }
      }
    });
  });

  app.get('/api/v1/system/schema-spec', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        engine: 'PostgreSQL 16+ via Cloud SQL / Drizzle ORM',
        migrationTable: '_migrations',
        tables: [
          'organizations',
          'users',
          'organization_memberships',
          'farms',
          'plots',
          'audit_logs'
        ]
      }
    });
  });

  // Automated System Security & RBAC Test Suite Execution
  app.post('/api/v1/system/run-tests', async (_req: Request, res: Response) => {
    try {
      const summary = await executeAllTests();
      res.json({
        success: true,
        data: summary
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'TEST_EXECUTION_ERROR', message: err.message }
      });
    }
  });

  // ==========================================
  // Authentication & Session Endpoints
  // ==========================================

  // User Registration
  app.post('/api/v1/auth/register', rateLimiter(20, 60000), async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, organizationName, preferredLanguage, countryCode } = req.body;
      const session = await AuthService.register({
        email,
        password,
        fullName,
        organizationName,
        preferredLanguage,
        countryCode,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: session,
        message: 'User registered and organization created successfully'
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: err.message }
      });
    }
  });

  // User Login
  app.post('/api/v1/auth/login', rateLimiter(30, 60000), async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Email and password are required' }
        });
      }

      const session = await AuthService.login({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: session
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: { code: 'LOGIN_FAILED', message: err.message }
      });
    }
  });

  // Get Current Authenticated User & Session Info
  app.get('/api/v1/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      res.json({
        success: true,
        data: {
          userId: user.userId,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          isPlatformOwner: user.isPlatformOwner
        }
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  // Switch Active Organization Context
  app.post('/api/v1/auth/switch-org', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetOrganizationId } = req.body;
      if (!targetOrganizationId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'targetOrganizationId is required' }
        });
      }

      const session = await AuthService.switchOrganization(req.user!.userId, targetOrganizationId);
      res.json({
        success: true,
        data: session
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'ORG_SWITCH_FAILED', message: err.message }
      });
    }
  });

  // Logout (Audited token disposal)
  app.post('/api/v1/auth/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await logAuditEvent({
        organizationId: req.user!.organizationId,
        userId: req.user!.userId,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        action: 'LOGOUT',
        targetEntity: 'AUTH',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Successfully logged out'
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LOGOUT_ERROR', message: err.message }
      });
    }
  });

  // ==========================================
  // Organizations & Membership Endpoints
  // ==========================================

  // List Organizations
  app.get('/api/v1/organizations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgs = await OrgService.listOrganizations({
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId
      });
      res.json({ success: true, data: orgs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
    }
  });

  // Create Organization (Requires ORG_ADMIN or PLATFORM_OWNER)
  app.post('/api/v1/organizations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, countryCode, orgType, primaryCurrency, contactEmail } = req.body;
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Organization name is required' }
        });
      }

      const org = await OrgService.createOrganization({
        name,
        countryCode,
        orgType,
        primaryCurrency,
        contactEmail: contactEmail || req.user!.email,
        creatorUserId: req.user!.userId,
        creatorEmail: req.user!.email,
        ipAddress: req.ip
      });

      res.status(201).json({ success: true, data: org });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_ORG_FAILED', message: err.message } });
    }
  });

  // Get Organization Details with Tenant Isolation
  app.get(
    '/api/v1/organizations/:orgId',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const org = await OrgService.getOrganizationById(req.params.orgId, {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        });
        res.json({ success: true, data: org });
      } catch (err: any) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
      }
    }
  );

  // List Organization Members
  app.get(
    '/api/v1/organizations/:orgId/members',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const members = await OrgService.getMembers(req.params.orgId, {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        });
        res.json({ success: true, data: members });
      } catch (err: any) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
      }
    }
  );

  // Add Member / Assign Role in Organization (Requires ORG_ADMIN role)
  app.post(
    '/api/v1/organizations/:orgId/members',
    requireAuth,
    requireTenantIsolation('orgId'),
    requireRole(['ORG_ADMIN']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { email, role } = req.body;
        if (!email || !role) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Email and role are required' }
          });
        }

        const result = await OrgService.addMember({
          organizationId: req.params.orgId,
          email,
          role,
          callerUserId: req.user!.userId,
          callerEmail: req.user!.email,
          callerRole: req.user!.role,
          callerIsPlatformOwner: req.user!.isPlatformOwner
        });

        res.status(201).json({ success: true, data: result });
      } catch (err: any) {
        res.status(400).json({ success: false, error: { code: 'ADD_MEMBER_FAILED', message: err.message } });
      }
    }
  );

  // ==========================================
  // Farms & Plots Endpoints (Tenant-Isolated)
  // ==========================================

  // List Farms for Organization
  app.get(
    '/api/v1/organizations/:orgId/farms',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const farms = await OrgService.listFarms(req.params.orgId, {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        });
        res.json({ success: true, data: farms });
      } catch (err: any) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
      }
    }
  );

  // Create Farm in Organization (Requires ORG_ADMIN or MANAGER)
  app.post(
    '/api/v1/organizations/:orgId/farms',
    requireAuth,
    requireTenantIsolation('orgId'),
    requireRole(['ORG_ADMIN', 'MANAGER']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name, code, region, prefecture, totalAreaHa, usableAreaHa } = req.body;
        if (!name || !code || !region) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Name, code, and region are required' }
          });
        }

        const farm = await OrgService.createFarm({
          organizationId: req.params.orgId,
          name,
          code,
          region,
          prefecture,
          totalAreaHa,
          usableAreaHa,
          callerUserId: req.user!.userId,
          callerEmail: req.user!.email,
          callerRole: req.user!.role,
          callerIsPlatformOwner: req.user!.isPlatformOwner
        });

        res.status(201).json({ success: true, data: farm });
      } catch (err: any) {
        res.status(400).json({ success: false, error: { code: 'CREATE_FARM_FAILED', message: err.message } });
      }
    }
  );

  // List Plots for Farm
  app.get(
    '/api/v1/organizations/:orgId/farms/:farmId/plots',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const plots = await OrgService.listPlots(req.params.farmId, {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        });
        res.json({ success: true, data: plots });
      } catch (err: any) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
      }
    }
  );

  // Create Plot for Farm (Requires ORG_ADMIN, MANAGER, or AGRONOMIST)
  app.post(
    '/api/v1/organizations/:orgId/farms/:farmId/plots',
    requireAuth,
    requireTenantIsolation('orgId'),
    requireRole(['ORG_ADMIN', 'MANAGER', 'AGRONOMIST']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name, code, areaHectares, soilType, irrigationType } = req.body;
        if (!name || !code) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Plot name and code are required' }
          });
        }

        const plot = await OrgService.createPlot({
          farmId: req.params.farmId,
          organizationId: req.params.orgId,
          name,
          code,
          areaHectares,
          soilType,
          irrigationType,
          callerUserId: req.user!.userId,
          callerEmail: req.user!.email,
          callerRole: req.user!.role,
          callerIsPlatformOwner: req.user!.isPlatformOwner
        });

        res.status(201).json({ success: true, data: plot });
      } catch (err: any) {
        res.status(400).json({ success: false, error: { code: 'CREATE_PLOT_FAILED', message: err.message } });
      }
    }
  );

  // ==========================================
  // Normal Calendar Endpoints (Tenant-Isolated)
  // ==========================================

  // List calendar events with recurrence expansion and filters
  app.get(
    '/api/v1/organizations/:orgId/calendar/events',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          status: req.query.status as any,
          eventType: req.query.eventType as any,
          priority: req.query.priority as any,
          assignedUserId: req.query.assignedUserId as string,
          farmId: req.query.farmId as string,
          plotId: req.query.plotId as string,
          relatedRecordType: req.query.relatedRecordType as string,
          sortBy: req.query.sortBy as any,
          searchQuery: req.query.searchQuery as string
        };

        const events = await CalendarService.listEvents(req.params.orgId, filters, {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        });

        res.json({ success: true, data: events });
      } catch (err: any) {
        res.status(403).json({ success: false, error: { code: 'CALENDAR_FETCH_ERROR', message: err.message } });
      }
    }
  );

  // Get single event by ID
  app.get(
    '/api/v1/organizations/:orgId/calendar/events/:eventId',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const event = await CalendarService.getEventById(req.params.eventId, {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        });
        res.json({ success: true, data: event });
      } catch (err: any) {
        res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: err.message } });
      }
    }
  );

  // Create new calendar event or task
  app.post(
    '/api/v1/organizations/:orgId/calendar/events',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const event = await CalendarService.createEvent({
          organizationId: req.params.orgId,
          title: req.body.title,
          description: req.body.description,
          eventType: req.body.eventType,
          status: req.body.status,
          priority: req.body.priority,
          startDateTime: req.body.startDateTime,
          endDateTime: req.body.endDateTime,
          allDay: req.body.allDay,
          timezone: req.body.timezone,
          assignedToUserId: req.body.assignedToUserId,
          dueDate: req.body.dueDate,
          farmId: req.body.farmId,
          plotId: req.body.plotId,
          linkedCampaignId: req.body.linkedCampaignId,
          linkedCropCycleId: req.body.linkedCropCycleId,
          linkedMasterOperationId: req.body.linkedMasterOperationId,
          linkedOrderId: req.body.linkedOrderId,
          linkedShipmentId: req.body.linkedShipmentId,
          recurrence: req.body.recurrence,
          remindersMinutesBefore: req.body.remindersMinutesBefore,
          notes: req.body.notes,
          attachments: req.body.attachments,
          colorHex: req.body.colorHex,
          tags: req.body.tags,
          caller: {
            userId: req.user!.userId,
            email: req.user!.email,
            role: req.user!.role,
            isPlatformOwner: req.user!.isPlatformOwner,
            organizationId: req.user!.organizationId
          }
        });

        res.status(201).json({ success: true, data: event });
      } catch (err: any) {
        res.status(400).json({ success: false, error: { code: 'CREATE_EVENT_FAILED', message: err.message } });
      }
    }
  );

  // Update existing calendar event or occurrence
  app.put(
    '/api/v1/organizations/:orgId/calendar/events/:eventId',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const event = await CalendarService.updateEvent({
          id: req.params.eventId,
          updates: req.body.updates || req.body,
          updateMode: req.body.updateMode,
          occurrenceDate: req.body.occurrenceDate,
          caller: {
            userId: req.user!.userId,
            email: req.user!.email,
            role: req.user!.role,
            isPlatformOwner: req.user!.isPlatformOwner,
            organizationId: req.user!.organizationId
          }
        });

        res.json({ success: true, data: event });
      } catch (err: any) {
        res.status(400).json({ success: false, error: { code: 'UPDATE_EVENT_FAILED', message: err.message } });
      }
    }
  );

  // Delete event (or occurrence)
  app.delete(
    '/api/v1/organizations/:orgId/calendar/events/:eventId',
    requireAuth,
    requireTenantIsolation('orgId'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const result = await CalendarService.deleteEvent({
          id: req.params.eventId,
          deleteMode: req.body?.deleteMode || (req.query.deleteMode as any),
          occurrenceDate: req.body?.occurrenceDate || (req.query.occurrenceDate as string),
          caller: {
            userId: req.user!.userId,
            email: req.user!.email,
            role: req.user!.role,
            isPlatformOwner: req.user!.isPlatformOwner,
            organizationId: req.user!.organizationId
          }
        });

        res.json(result);
      } catch (err: any) {
        res.status(400).json({ success: false, error: { code: 'DELETE_EVENT_FAILED', message: err.message } });
      }
    }
  );

  // ==========================================
  // Agricultural Core Endpoints (Tenant-Isolated)
  // ==========================================

  // 1. Crops & Varieties
  app.get('/api/v1/organizations/:orgId/agricultural/crops', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const crops = await AgriculturalService.listCrops(req.params.orgId, {
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId
      });
      res.json({ success: true, data: crops });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_CROPS_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/agricultural/crops', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const crop = await AgriculturalService.createCrop(req.params.orgId, req.body, {
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId,
        role: req.user!.role,
        userId: req.user!.userId
      });
      res.status(201).json({ success: true, data: crop });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_CROP_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/agricultural/varieties', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const varieties = await AgriculturalService.listVarieties(
        req.params.orgId,
        req.query.cropId as string,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        }
      );
      res.json({ success: true, data: varieties });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_VARIETIES_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/agricultural/varieties', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const variety = await AgriculturalService.createVariety(req.params.orgId, req.body, {
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId,
        role: req.user!.role,
        userId: req.user!.userId
      });
      res.status(201).json({ success: true, data: variety });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_VARIETY_FAILED', message: err.message } });
    }
  });

  // 2. Master Catalog: Seasons, Methods, Suppliers, Inputs, Equipment, Teams
  app.get('/api/v1/organizations/:orgId/agricultural/seasons', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasons = await AgriculturalService.listSeasons(req.params.orgId, {
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId
      });
      res.json({ success: true, data: seasons });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_SEASONS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/agricultural/methods', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const methods = await AgriculturalService.listMethods(
        req.params.orgId,
        req.query.methodType as any,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        }
      );
      res.json({ success: true, data: methods });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_METHODS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/agricultural/suppliers', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const suppliers = await AgriculturalService.listSuppliers(req.params.orgId, {
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId
      });
      res.json({ success: true, data: suppliers });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_SUPPLIERS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/agricultural/inputs', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const inputs = await AgriculturalService.listInputs(req.params.orgId, {
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId
      });
      res.json({ success: true, data: inputs });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_INPUTS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/agricultural/equipment', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const equipment = await AgriculturalService.listEquipment(req.params.orgId, {
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId
      });
      res.json({ success: true, data: equipment });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_EQUIPMENT_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/agricultural/teams', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teams = await AgriculturalService.listFieldTeams(req.params.orgId, {
        isPlatformOwner: req.user!.isPlatformOwner,
        organizationId: req.user!.organizationId
      });
      res.json({ success: true, data: teams });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_TEAMS_FAILED', message: err.message } });
    }
  });

  // 3. Campaigns
  app.get('/api/v1/organizations/:orgId/agricultural/campaigns', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const campaigns = await AgriculturalService.listCampaigns(
        req.params.orgId,
        {
          farmId: req.query.farmId as string,
          cropId: req.query.cropId as string,
          status: req.query.status as string,
          searchQuery: req.query.searchQuery as string
        },
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        }
      );
      res.json({ success: true, data: campaigns });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_CAMPAIGNS_FAILED', message: err.message } });
    }
  });

  // Convenience endpoint for current user's organization campaigns
  app.get('/api/v1/agricultural/campaigns', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const campaigns = await AgriculturalService.listCampaigns(
        req.user!.organizationId,
        {
          farmId: req.query.farmId as string,
          cropId: req.query.cropId as string,
          status: req.query.status as string,
          searchQuery: req.query.searchQuery as string
        },
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        }
      );
      res.json({ success: true, data: campaigns });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_CAMPAIGNS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/agricultural/campaigns/:campaignId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const campaign = await AgriculturalService.getCampaign(
        req.params.campaignId,
        req.params.orgId,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        }
      );
      res.json({ success: true, data: campaign });
    } catch (err: any) {
      res.status(404).json({ success: false, error: { code: 'GET_CAMPAIGN_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/agricultural/campaigns', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const campaign = await AgriculturalService.createCampaign(
        req.params.orgId,
        req.body,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId,
          role: req.user!.role,
          userId: req.user!.userId
        }
      );
      res.status(201).json({ success: true, data: campaign });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_CAMPAIGN_FAILED', message: err.message } });
    }
  });

  app.patch('/api/v1/organizations/:orgId/agricultural/campaigns/:campaignId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const campaign = await AgriculturalService.updateCampaign(
        req.params.campaignId,
        req.params.orgId,
        req.body,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId,
          role: req.user!.role,
          userId: req.user!.userId
        }
      );
      res.json({ success: true, data: campaign });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_CAMPAIGN_FAILED', message: err.message } });
    }
  });

  // 4. Operations (with calendar sync)
  app.get('/api/v1/organizations/:orgId/agricultural/operations', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ops = await AgriculturalService.listOperations(
        req.params.orgId,
        req.query.campaignId as string,
        {
          operationType: req.query.operationType as string,
          status: req.query.status as string
        },
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        }
      );
      res.json({ success: true, data: ops });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_OPERATIONS_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/agricultural/operations', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const op = await AgriculturalService.createOperation(
        req.params.orgId,
        req.body,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId,
          role: req.user!.role,
          userId: req.user!.userId
        }
      );
      res.status(201).json({ success: true, data: op });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_OPERATION_FAILED', message: err.message } });
    }
  });

  app.patch('/api/v1/organizations/:orgId/agricultural/operations/:opId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const op = await AgriculturalService.updateOperation(
        req.params.opId,
        req.params.orgId,
        req.body,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId,
          role: req.user!.role,
          userId: req.user!.userId
        }
      );
      res.json({ success: true, data: op });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_OPERATION_FAILED', message: err.message } });
    }
  });

  // 5. Partial Harvests (Multiple events preserving history)
  app.get('/api/v1/organizations/:orgId/agricultural/harvests', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const harvests = await AgriculturalService.listHarvests(
        req.params.orgId,
        req.query.campaignId as string,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId
        }
      );
      res.json({ success: true, data: harvests });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_HARVESTS_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/agricultural/harvests', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const harvest = await AgriculturalService.recordHarvest(
        req.params.orgId,
        req.body,
        {
          isPlatformOwner: req.user!.isPlatformOwner,
          organizationId: req.user!.organizationId,
          role: req.user!.role,
          userId: req.user!.userId
        }
      );
      res.status(201).json({ success: true, data: harvest });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'RECORD_HARVEST_FAILED', message: err.message } });
    }
  });

  // Helper to extract session object from authenticated request
  function makeSession(req: AuthenticatedRequest, orgIdParam?: string) {
    const orgId = orgIdParam || req.params.orgId || req.user!.organizationId;
    return {
      token: req.headers.authorization ? req.headers.authorization.substring(7) : '',
      userId: req.user!.userId,
      currentOrganizationId: orgId,
      role: req.user!.role,
      email: req.user!.email,
      user: {
        id: req.user!.userId,
        email: req.user!.email,
        fullName: req.user!.email,
        role: req.user!.role,
        activeOrganizationId: orgId,
        isPlatformOwner: req.user!.isPlatformOwner
      },
      organization: {
        id: orgId,
        name: 'Organization'
      }
    };
  }

  // ==========================================
  // Commercial Module Endpoints (Phase 5)
  // ==========================================

  app.get('/api/v1/organizations/:orgId/commercial/buyers', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const buyers = await CommercialService.getBuyers(session, req.query as any);
      res.json({ success: true, data: buyers });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_BUYERS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/commercial/buyers/:buyerId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const buyer = await CommercialService.getBuyerById(session, req.params.buyerId);
      res.json({ success: true, data: buyer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_BUYER_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/commercial/buyers', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const buyer = await CommercialService.createBuyer(session, req.body);
      res.status(201).json({ success: true, data: buyer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_BUYER_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/commercial/buyers/:buyerId/communications', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const comm = await CommercialService.addBuyerCommunication(session, req.params.buyerId, req.body);
      res.status(201).json({ success: true, data: comm });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'ADD_COMMUNICATION_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/commercial/orders', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const orders = await CommercialService.getOrders(session, req.query as any);
      res.json({ success: true, data: orders });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_ORDERS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/commercial/orders/:orderId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const order = await CommercialService.getOrderById(session, req.params.orderId);
      res.json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_ORDER_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/commercial/orders', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const order = await CommercialService.createOrder(session, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_ORDER_FAILED', message: err.message } });
    }
  });

  app.patch('/api/v1/organizations/:orgId/commercial/orders/:orderId/status', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const updated = await CommercialService.updateOrderStatus(session, req.params.orderId, req.body.status);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_ORDER_STATUS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/commercial/supply-balance', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const balance = await CommercialService.getSupplyDemandBalance(session);
      res.json({ success: true, data: balance });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_SUPPLY_BALANCE_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/commercial/reservations', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const reservation = await CommercialService.reserveSupply(session, req.body);
      res.status(201).json({ success: true, data: reservation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_RESERVATION_FAILED', message: err.message } });
    }
  });

  // ==========================================
  // Operations, Inventory & Quality Endpoints (Phase 6)
  // ==========================================

  app.get('/api/v1/organizations/:orgId/operations/inventory', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const items = await OperationsService.listInventoryItems(session, req.query as any);
      res.json({ success: true, data: items });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_INVENTORY_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/operations/inventory/movements', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const movement = await OperationsService.recordStockMovement(session, req.body);
      res.status(201).json({ success: true, data: movement });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'RECORD_MOVEMENT_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/operations/movements', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const movements = await OperationsService.listStockMovements(session, req.query as any);
      res.json({ success: true, data: movements });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_MOVEMENTS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/operations/recipes', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const recipes = await OperationsService.listProcessingRecipes(session);
      res.json({ success: true, data: recipes });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_RECIPES_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/operations/batches', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const batches = await OperationsService.listProcessingBatches(session, req.query as any);
      res.json({ success: true, data: batches });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_BATCHES_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/operations/batches', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const batch = await OperationsService.startProcessingBatch(session, req.body);
      res.status(201).json({ success: true, data: batch });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'START_BATCH_FAILED', message: err.message } });
    }
  });

  app.patch('/api/v1/organizations/:orgId/operations/batches/:batchId/complete', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const completed = await OperationsService.completeProcessingBatch(session, req.params.batchId, req.body);
      res.json({ success: true, data: completed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'COMPLETE_BATCH_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/operations/inspections', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const inspections = await OperationsService.listQualityInspections(session, req.query as any);
      res.json({ success: true, data: inspections });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_INSPECTIONS_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/operations/inspections', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const inspection = await OperationsService.recordQualityInspection(session, req.body);
      res.status(201).json({ success: true, data: inspection });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'RECORD_INSPECTION_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/operations/recall-trace', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const batchNumber = req.query.batchNumber as string;
      const trace = await OperationsService.traceBatchRecall(session, batchNumber);
      res.json({ success: true, data: trace });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TRACE_RECALL_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/operations/check-dispatch', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const batchNumber = req.query.batchNumber as string;
      const check = await OperationsService.validateBatchForDispatch(session, batchNumber);
      res.json({ success: true, data: check });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CHECK_DISPATCH_FAILED', message: err.message } });
    }
  });

  // ==========================================
  // Logistics & Export Trade Endpoints (Phase 7)
  // ==========================================

  app.get('/api/v1/organizations/:orgId/logistics/shipments', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const shipments = await LogisticsService.listShipments(session, req.query as any);
      res.json({ success: true, data: shipments });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LIST_SHIPMENTS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/logistics/shipments/:shipmentId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const shipment = await LogisticsService.getShipmentById(session, req.params.shipmentId);
      res.json({ success: true, data: shipment });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_SHIPMENT_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/logistics/shipments', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const shipment = await LogisticsService.createShipment(session, req.body);
      res.status(201).json({ success: true, data: shipment });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_SHIPMENT_FAILED', message: err.message } });
    }
  });

  app.patch('/api/v1/organizations/:orgId/logistics/shipments/:shipmentId/milestones/:milestoneId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const updated = await LogisticsService.updateShipmentMilestone(session, req.params.shipmentId, req.params.milestoneId, req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_MILESTONE_FAILED', message: err.message } });
    }
  });

  app.patch('/api/v1/organizations/:orgId/logistics/shipments/:shipmentId/documents/:documentId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const updated = await LogisticsService.updateDocumentStatus(session, req.params.shipmentId, req.params.documentId, req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_DOCUMENT_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/logistics/shipments/:shipmentId/simulate-scenario', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const simulation = await LogisticsService.simulateRiskScenario(session, req.params.shipmentId, req.body.scenarioType, req.body);
      res.json({ success: true, data: simulation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'SIMULATE_SCENARIO_FAILED', message: err.message } });
    }
  });

  // ==========================================
  // Finance & Profitability Module Endpoints (Phase 8)
  // ==========================================

  app.get('/api/v1/organizations/:orgId/finance/budgets', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const budgets = await FinanceService.listBudgets(session, req.query as any);
      res.json({ success: true, data: budgets });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_BUDGETS_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/finance/budgets', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const budget = await FinanceService.createOrUpdateBudget(session, req.body);
      res.status(201).json({ success: true, data: budget });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'SAVE_BUDGET_FAILED', message: err.message } });
    }
  });

  app.delete('/api/v1/organizations/:orgId/finance/budgets/:budgetId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      await FinanceService.deleteBudget(session, req.params.budgetId);
      res.json({ success: true, message: 'Budget deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'DELETE_BUDGET_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/finance/exchange-rates', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const rates = FinanceService.getExchangeRates(session);
      res.json({ success: true, data: rates });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_RATES_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/finance/exchange-rates', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const rate = await FinanceService.setExchangeRate(session, req.body);
      res.status(201).json({ success: true, data: rate });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'SET_RATE_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/finance/performance/campaigns/:campaignId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const perf = await FinanceService.calculateCampaignFinancialPerformance(session, req.params.campaignId, req.query as any);
      res.json({ success: true, data: perf });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_PERFORMANCE_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/finance/scenarios/campaigns/:campaignId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const scenarios = await FinanceService.simulateFinancialScenarios(session, req.params.campaignId);
      res.json({ success: true, data: scenarios });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'SIMULATE_SCENARIOS_FAILED', message: err.message } });
    }
  });

  app.post('/api/v1/organizations/:orgId/finance/dcf-appraisal', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const appraisal = FinanceService.calculateMultiYearInvestmentAppraisal(session, req.body);
      res.json({ success: true, data: appraisal });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'DCF_APPRAISAL_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/finance/export/campaigns/:campaignId', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const format = (req.query.format as string) === 'JSON' ? 'JSON' : 'CSV';
      const file = await FinanceService.exportFinancialReport(session, req.params.campaignId, format);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Type', file.contentType);
      res.send(file.content);
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'EXPORT_REPORT_FAILED', message: err.message } });
    }
  });

  // ==========================================
  // Management Dashboards & Decision Support (Phase 9)
  // ==========================================

  app.get('/api/v1/organizations/:orgId/dashboards/role/:roleView', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const roleView = (req.params.roleView || 'LEADERSHIP').toUpperCase();
      let data: any;

      switch (roleView) {
        case 'FARM_MANAGER':
          data = DashboardService.getFarmManagerDashboard(session, req.query as any);
          break;
        case 'AGRONOMIST':
          data = DashboardService.getAgronomistDashboard(session, req.query as any);
          break;
        case 'COMMERCIAL_MANAGER':
          data = DashboardService.getCommercialDashboard(session, req.query as any);
          break;
        case 'PROCESSING_MANAGER':
          data = DashboardService.getProcessingDashboard(session, req.query as any);
          break;
        case 'LOGISTICS_MANAGER':
          data = DashboardService.getLogisticsDashboard(session, req.query as any);
          break;
        case 'FINANCE_MANAGER':
          data = DashboardService.getFinanceDashboard(session, req.query as any);
          break;
        case 'LEADERSHIP':
        default:
          data = DashboardService.getExecutiveDashboard(session, req.query as any);
          break;
      }

      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_DASHBOARD_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/dashboards/recommendations', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const thresholds: any = {
        costOverrunTolerancePct: req.query.costOverrunTolerancePct ? Number(req.query.costOverrunTolerancePct) : 5,
        shipmentDelayToleranceHours: req.query.shipmentDelayToleranceHours ? Number(req.query.shipmentDelayToleranceHours) : 24,
        safetyStockBufferPct: req.query.safetyStockBufferPct ? Number(req.query.safetyStockBufferPct) : 15,
        cashDeficitThresholdGNF: req.query.cashDeficitThresholdGNF ? Number(req.query.cashDeficitThresholdGNF) : 0,
        qualityFailureTolerancePct: req.query.qualityFailureTolerancePct ? Number(req.query.qualityFailureTolerancePct) : 0
      };
      const recommendations = DashboardService.generateDecisionSupport(session, thresholds, req.query as any);
      res.json({ success: true, data: recommendations });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_RECOMMENDATIONS_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/dashboards/export', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const roleView = (req.query.roleView as any) || 'LEADERSHIP';
      const format = (req.query.format as string) === 'JSON' ? 'JSON' : 'CSV';
      const file = DashboardService.exportDashboardReport(session, roleView, format);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Type', file.contentType);
      res.send(file.content);
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'EXPORT_DASHBOARD_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/organizations/:orgId/dashboards/external-status', requireAuth, requireTenantIsolation('orgId'), async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const status = DashboardService.getExternalServicesStatus();
      res.json({ success: true, data: status });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_EXTERNAL_STATUS_FAILED', message: err.message } });
    }
  });

  // ==========================================
  // Organization Preferences & Localization (Phase 10)
  // ==========================================

  app.get('/api/v1/organizations/:orgId/preferences', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const prefs = LocalizationService.getOrganizationPreferences(session);
      res.json({ success: true, data: prefs });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'GET_PREFERENCES_FAILED', message: err.message } });
    }
  });

  app.put('/api/v1/organizations/:orgId/preferences', requireAuth, requireTenantIsolation('orgId'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session: any = makeSession(req);
      const updated = LocalizationService.updateOrganizationPreferences(session, req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_PREFERENCES_FAILED', message: err.message } });
    }
  });

  // ==========================================
  // Audit Logs Endpoints
  // ==========================================

  app.get('/api/v1/audit-logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Platform owner can view all logs; others only see their organization logs
      const orgId = req.user!.isPlatformOwner ? undefined : req.user!.organizationId;
      const logs = await getAuditLogs(orgId, 100);

      if (req.user!.isPlatformOwner) {
        // Log that platform owner accessed audit logs
        await logAuditEvent({
          userId: req.user!.userId,
          userEmail: req.user!.email,
          userRole: 'PLATFORM_OWNER',
          action: 'PLATFORM_OWNER_AUDIT_INSPECTION',
          targetEntity: 'AUDIT_LOGS',
          ipAddress: req.ip
        });
      }

      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AUDIT_FETCH_ERROR', message: err.message } });
    }
  });

  // Explicit JSON 404 handler for ALL /api/* routes so they NEVER fall through to Vite SPA or static HTML
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'API_ENDPOINT_NOT_FOUND',
        message: `Endpoint API introuvable : ${req.method} ${req.originalUrl || req.url}`
      }
    });
  });

  // Client static assets in production or Vite middleware in development
  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Centralized Error Handling Middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[UNHANDLED ERROR]', err);
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: isProduction ? 'An unexpected server error occurred' : err.message
      }
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FARMING CALENDAR SERVER] Running at http://0.0.0.0:${PORT}`);
    console.log(`[FARMING CALENDAR SERVER] Mode: ${isProduction ? 'production' : 'development'}`);
  });
}

startServer().catch((err) => {
  console.error('[FARMING CALENDAR SERVER FATAL]', err);
  process.exit(1);
});
