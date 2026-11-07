# FARMING CALENDAR — Architectural Specification & System Architecture

**Product**: FARMING CALENDAR (Agricultural Planning & Agribusiness Management SaaS)  
**Target Market**: Guinea (Kindia, Mamou, Labé, Conakry) & International Agro-Export  
**Release Version**: Production-Ready Candidate (Phases 1 through 11 Completed)

---

## 1. High-Level Architectural Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React 19 + TypeScript + Vite)                     │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌────────────────────────┐  │
│  │   Normal Calendar (5V)  │  │   Master Planning (4P)  │  │  Commercial & CRM (5P) │  │
│  └────────────┬────────────┘  └────────────┬────────────┘  └───────────┬────────────┘  │
│  ┌────────────┴────────────┐  ┌────────────┴────────────┐  ┌───────────┴────────────┐  │
│  │  Inventory & QC (6P)    │  │  Logistics & Trade (7P) │  │  Finance & Budgets(8P) │  │
│  └────────────┬────────────┘  └────────────┬────────────┘  └───────────┬────────────┘  │
│  ┌────────────┴────────────┐  ┌────────────┴────────────┐  ┌───────────┴────────────┐  │
│  │  Role Dashboards (9P)   │  │  Localization (10P)     │  │  89-Test QA Runner(11P)│  │
│  └─────────────────────────┘  └─────────────────────────┘  └────────────────────────┘  │
│                                 │ i18next (FR/EN) + Tailwind CSS                        │
└─────────────────────────────────┼──────────────────────────────────────────────────────┘
                                  │ HTTPS / REST (JSON API /api/v1)
┌─────────────────────────────────▼──────────────────────────────────────────────────────┐
│                       SERVER LAYER (Express.js + TypeScript Runtime)                   │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Security Middleware: Helmet, CORS, Rate Limiting, Token Verification (JWT/Auth) │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────▼───────────────────────────────────────────┐  │
│  │  Multi-Tenant Boundary Isolation Enforcement (requireTenantIsolation)            │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────▼───────────────────────────────────────────┐  │
│  │  Modular Domain Service Layer:                                                   │  │
│  │  • AuthService (Bcrypt, JWT, Session)    • CalendarService (Recurrence, Bridge)  │  │
│  │  • AgriculturalService (Crops, Seasons)  • PlanningService (Backward Engine)     │  │
│  │  • CommercialService (CRM, Allocation)   • OperationsService (Milling, QC, Trace)│  │
│  │  • LogisticsService (Customs, Delay)     • FinanceService (P&L, DCF, BCRG FX)    │  │
│  │  • DashboardService (7 Role Views)       • LocalizationService (Locale/Units)    │  │
│  │  • AuditService (WORM Audit Trail)       • NotificationService (SMS/Email Gate)  │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
└─────────────────────────────────────────┼──────────────────────────────────────────────┘
                                          │ Relational Query Adapter & Pool
┌─────────────────────────────────────────▼──────────────────────────────────────────────┐
│                      PERSISTENCE & STORAGE TIER                                        │
│  ┌───────────────────────────────────────────┐  ┌───────────────────────────────────┐  │
│  │ Primary: PostgreSQL 16+ (Google Cloud SQL) │  │ Local Dev/Fallback: Persistent   │  │
│  │ Connection Pool: pgPool (max: 20, ssl)    │  │ Relational Engine with atomic     │  │
│  │ Migrations: 001-008 idempotent SQL scripts│  │ JSON commit & fsync safety        │  │
│  └───────────────────────────────────────────┘  └───────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles

### 2.1 Multi-Tenant Isolation
1. **Foreign Key Guarantees**: Every business table enforces a non-null `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE`.
2. **Context Resolution**: Caller organization ID is strictly extracted from verified, signed tokens (`session.user.activeOrganizationId`). Query parameters or user input cannot override tenancy context.
3. **Database RLS Policies**: In production PostgreSQL, Row-Level Security (RLS) policies prevent cross-tenant data leaks at the engine level.
4. **Sanitized Error Envelopes**: Cross-tenant attempts throw explicit `SECURITY_ERROR` responses and trigger audited alerts.

### 2.2 Dual-Calendar Bidirectional Synchronization Bridge
The system bridges operational execution with strategic agribusiness planning:
- **Master Calendar**: Contains macro-campaign technical stages (land preparation, nursery, vegetative maintenance, harvest windows) and buyer delivery milestones.
- **Normal Calendar**: Generates granular team assignments, daily work shifts, equipment bookings, and inspection tasks.
- **Bidirectional Sync**:
  - Scheduling an agricultural operation automatically spawns linked `normal_calendar_events`.
  - Confirming a commercial order automatically generates delivery milestone events.
  - Recording delay on a logistics shipment propagates forward to downstream milestones and alerts the Master Calendar.

### 2.3 Strict Concurrency & Supply Allocation Safety
- **Anti-Double-Booking**: Supply reservations compare requested tonnage against `uncommittedAvailableTons` = `TotalCampaignSupply - ActiveCommittedReservations`.
- **Atomic State Transitions**: Commercial orders enforce a finite state machine:
  `INQUIRY -> QUOTED -> NEGOTIATING -> CONFIRMED -> IN_PRODUCTION -> PROCESSING -> QUALITY_INSPECTION -> DISPATCHED -> DELIVERED -> COMPLETED`.
  Invalid jumps (e.g. from `CONFIRMED` straight to `DELIVERED`) are strictly rejected.

### 2.4 Traceability & Food Safety Gating
- **Quality Gating**: Logistics shipments cannot be staged or dispatched with uninspected or `REJECTED` inventory lots. Attempted creation is blocked with `DISPATCH_BLOCKED`.
- **End-to-End Recall**: The traceability engine provides bidirectional tracing from seed, plot, chemical application, harvest pass, milling conversion batch, quality lab certification, and outgoing buyer consignment.

### 2.5 Explainable Decision Support Architecture
The decision support engine computes 6 rule-based recommendations based on actual database values, explicit agronomic thresholds, and transparent assumptions:
1. `YIELD_SHORTFALL_RECALIBRATION`: Triggered when harvest variance exceeds -15%.
2. `UNCOMMITTED_HARVEST_STOCK`: Triggered when unreserved stock exceeds 5 tons.
3. `QUALITY_DEFECT_RATE_SPIKE`: Triggered when defect rate exceeds acceptable tolerances.
4. `SHIPMENT_FORWARD_DELAY`: Triggered when cumulative shipment delay exceeds 24 hours.
5. `CASH_FLOW_PEAK_DEFICIT`: Triggered when projected BFR deficit threatens liquidity.
6. `OPEX_BUDGET_OVERRUN`: Triggered when actual spend exceeds budget allocation.

---

## 3. Database Schema Overview (35 Relational Tables)

| Category | Primary Tables |
| :--- | :--- |
| **Identity & Security** | `organizations`, `users`, `organization_memberships`, `audit_logs`, `organization_preferences` |
| **Farm Management** | `farms`, `plots`, `agricultural_seasons`, `field_teams` |
| **Botanical Master** | `crops`, `crop_varieties`, `agricultural_methods`, `suppliers`, `agricultural_inputs`, `agricultural_equipment` |
| **Crop Operations** | `production_campaigns`, `campaign_harvests`, `master_operations` |
| **Calendar Engine** | `normal_calendar_events`, `calendar_exceptions` |
| **Commercial CRM** | `buyers`, `commercial_orders`, `order_lines`, `supply_reservations` |
| **Inventory & Milling** | `inventory_items`, `inventory_movements`, `processing_recipes`, `processing_batches`, `quality_inspections` |
| **Logistics & Trade** | `shipments`, `shipment_milestones`, `compliance_documents` |
| **Financial Management**| `budgets`, `exchange_rates`, `investment_projects` |

---

## 4. RBAC Permission Matrix

| Role | Operational Scope | Typical Persona |
| :--- | :--- | :--- |
| `PLATFORM_OWNER` | Global platform administration & cross-tenant inspection | System Architect / SaaS Operator |
| `ORG_ADMIN` | Organization configuration, memberships, regional settings | Cooperative President / Executive Director |
| `MANAGER` | General farm management, operational approval, budgets | General Operations Manager |
| `AGRONOMIST` | Technical itineraries, plot assignment, crop monitoring, QC | Agronomic Director / Extension Officer |
| `COMMERCIAL_MANAGER` | Buyer CRM, off-take orders, supply reservations, shipments | Sales & Export Commercial Director |
| `FINANCE_MANAGER` | OPEX/CAPEX budgets, cash flow, FX rates, DCF models | Financial Controller / CFO |
| `OPERATIONS_STAFF` | Task completion, stock movement logging, machine operations | Field Technician / Packhouse Operator |
| `VIEWER` | Read-only audit access (financial documents masked) | External Auditor / Certifying Inspector |
