# FARMING CALENDAR — REST API Specification

**Base URL**: `/api/v1`  
**Authentication**: HTTP Bearer Token (`Authorization: Bearer <JWT_TOKEN>`)  
**Standard Response Envelope**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional localized status message",
  "meta": { "total": 100, "page": 1, "pageSize": 25 }
}
```
**Standard Error Envelope**:
```json
{
  "success": false,
  "error": {
    "code": "SECURITY_ERROR | VALIDATION_ERROR | NOT_FOUND | CONFLICT",
    "message": "Human-readable explanation of error",
    "details": [ ... ]
  }
}
```

---

## 1. Authentication & Tenant Identity

### `POST /api/v1/auth/register`
Creates a new user profile, bcrypt password hash, and default tenant organization context.
- **Access**: Public (Rate-limited: 20 req/min)
- **Body**: `{ email, password, fullName, organizationName, preferredLanguage, countryCode }`
- **Returns**: `201 Created` with AuthSession and signed JWT token.

### `POST /api/v1/auth/login`
Authenticates credentials and issues signed HMAC-SHA256 JWT token (24-hour validity).
- **Access**: Public (Rate-limited: 30 req/min)
- **Body**: `{ email, password }`
- **Returns**: `200 OK` with user profile, active organization context, and role.

### `GET /api/v1/auth/me`
Retrieves authenticated user session, current role, and active organization.
- **Access**: Authenticated

### `POST /api/v1/auth/switch-org`
Switches caller's active tenant organization context.
- **Access**: Authenticated (User must belong to target organization)
- **Body**: `{ targetOrganizationId: UUID }`

### `POST /api/v1/auth/logout`
Terminates session and records audited `USER_LOGOUT` security event.
- **Access**: Authenticated

---

## 2. Organization & Membership Management

### `GET /api/v1/organizations`
Lists accessible organizations (`PLATFORM_OWNER` views all; others view assigned organizations).

### `GET /api/v1/organizations/:orgId`
Retrieves organization profile, country code, base currency, and time zone. Enforces tenant boundary.

### `GET /api/v1/organizations/:orgId/members`
Lists organization users and roles. Requires `ORG_ADMIN` or `PLATFORM_OWNER`.

### `POST /api/v1/organizations/:orgId/members`
Invites or updates a team member's role. Requires `ORG_ADMIN`.
- **Roles**: `PLATFORM_OWNER`, `ORG_ADMIN`, `MANAGER`, `AGRONOMIST`, `COMMERCIAL_MANAGER`, `FINANCE_MANAGER`, `OPERATIONS_STAFF`, `VIEWER`.

### `GET /api/v1/organizations/:orgId/preferences`
Retrieves regional formatting settings (preferredLanguage, preferredCurrency, timezone, unitSystem).

### `PUT /api/v1/organizations/:orgId/preferences`
Updates regional preferences. Requires `ORG_ADMIN` or `PLATFORM_OWNER`.
- **Body**: `{ preferredLanguage: 'fr'|'en', preferredCurrency: 'GNF'|'USD'|'EUR'|'XOF', preferredTimezone: string, preferredUnitSystem: 'METRIC' }`

---

## 3. Normal Calendar & Event Management

### `GET /api/v1/organizations/:orgId/calendar/events`
Lists calendar events with date window filters, category filters, and recurring event expansion.
- **Query Params**: `startDate`, `endDate`, `eventType`, `status`, `priority`, `farmId`, `cropCampaignId`

### `POST /api/v1/organizations/:orgId/calendar/events`
Creates a calendar event or recurring series.
- **Body**: `{ title, description, eventType, startDateTime, endDateTime, allDay, priority, recurrenceRule, assignedToUserId, farmId, plotId, linkedCampaignId, linkedOrderId, linkedShipmentId }`

### `PUT /api/v1/organizations/:orgId/calendar/events/:eventId`
Updates an event. Supports `updateMode: 'SINGLE_OCCURRENCE' | 'SERIES'`.

### `DELETE /api/v1/organizations/:orgId/calendar/events/:eventId`
Deletes an event occurrence or whole series without deleting unaffected records.

---

## 4. Agricultural Core & Production Campaigns

### `GET /api/v1/organizations/:orgId/farms` & `POST /api/v1/organizations/:orgId/farms`
Manages agricultural holdings, total/usable hectare area, GPS coordinates, and manager assignment.

### `GET /api/v1/organizations/:orgId/plots` & `POST /api/v1/organizations/:orgId/plots`
Manages parcels, soil classification, irrigation type, and topography.

### `GET /api/v1/organizations/:orgId/crops` & `GET /api/v1/organizations/:orgId/crops/:cropId/varieties`
Accesses botanical catalog: Cassava (Bonoua, Bocou 1), Pepper (Bird's Eye, S17 Habanero), Watermelon (Kaolack, Crimson Sweet).

### `GET /api/v1/organizations/:orgId/campaigns` & `POST /api/v1/organizations/:orgId/campaigns`
Creates and manages production campaigns linking crop variety, farm, plot, season, target tons, and budget.

### `POST /api/v1/organizations/:orgId/campaigns/:campaignId/operations`
Schedules agricultural operations (land prep, planting, irrigation, weeding, harvest) and auto-syncs linked calendar items.

### `POST /api/v1/organizations/:orgId/campaigns/:campaignId/harvests`
Records progressive partial harvest passes with quality grading, loss tracking, and storage location.

---

## 5. Master Calendar & Backward Planning Engine

### `POST /api/v1/organizations/:orgId/planning/backward-schedule`
Calculates reverse agricultural schedule from buyer delivery target.
- **Body**: `{ targetDeliveryDate: 'YYYY-MM-DD', targetQuantityTons: number, productKey: string, customDurations?: object }`
- **Returns**: Schedule feasibility score, critical path stages, preparation start date, days until kickoff, and actionable alternative scenarios if infeasible.

### `POST /api/v1/organizations/:orgId/planning/yield-forecast`
Calculates transparent agronomic harvest yield:
`Yield = Area (ha) * BaseYield (t/ha) * IrrigationFactor * SoilFactor * (1 - LossRatePct)`.

### `GET /api/v1/organizations/:orgId/planning/conflicts`
Detects parcel overlaps, overdue cultural operations, and delivery deadline mismatch alerts.

---

## 6. Commercial Management & Buyer CRM

### `GET /api/v1/organizations/:orgId/buyers` & `POST /api/v1/organizations/:orgId/buyers`
B2B Buyer CRM storing corporate registration, buyer type, target market, incoterms, and communication history.

### `GET /api/v1/organizations/:orgId/orders` & `POST /api/v1/organizations/:orgId/orders`
Manages commercial orders, pricing per kg/ton, payment milestones (advance/balance), and Master Calendar milestones.

### `PATCH /api/v1/organizations/:orgId/orders/:orderId/status`
Enforces state-machine transition validation:
`INQUIRY -> QUOTED -> NEGOTIATING -> CONFIRMED -> IN_PRODUCTION -> PROCESSING -> QUALITY_INSPECTION -> DISPATCHED -> DELIVERED -> COMPLETED`.

### `GET /api/v1/organizations/:orgId/commercial/supply-demand-balance`
Aggregates crop-by-crop matrix comparing confirmed buyer demand against forecast and harvested supply.

### `POST /api/v1/organizations/:orgId/commercial/reservations`
Concurrency-safe stock reservation preventing double-allocation and overselling beyond uncommitted capacity.

### `DELETE /api/v1/organizations/:orgId/commercial/reservations/:reservationId`
Releases an active reservation and restores uncommitted campaign supply.

---

## 7. Processing, Inventory & Quality Management

### `GET /api/v1/organizations/:orgId/inventory/items`
Lists raw produce, packaging items, agrochemical inputs, and finished goods with storage locations and balances.

### `POST /api/v1/organizations/:orgId/inventory/movements`
Records stock movements (`RECEIVING`, `ISSUING`, `TRANSFER`, `ADJUSTMENT`) with overselling prevention.

### `POST /api/v1/organizations/:orgId/processing/batches`
Launches transformation batches from agronomic recipes (e.g. fresh pepper to dried spice, cassava to flour).

### `POST /api/v1/organizations/:orgId/processing/batches/:batchId/complete`
Calculates actual conversion yield %, variance, labor/utilities/packaging costs, and finished good unit cost.

### `POST /api/v1/organizations/:orgId/quality/inspections`
Records HACCP/GlobalGAP sanitary and phytosanitary inspections. Enforces accreditation and release status (`RELEASED`, `REJECTED`, `QUARANTINE`).

### `GET /api/v1/organizations/:orgId/quality/traceability/recall/:batchNumber`
Performs forward and backward genealogical recall tracing from plot, inputs, harvest passes, milling, quality checks, to customer shipments.

---

## 8. Logistics, Shipments & Export Trade

### `GET /api/v1/organizations/:orgId/shipments` & `POST /api/v1/organizations/:orgId/shipments`
Plans maritime, air, and road shipments with packaging pallet specs and transparent freight costing.
- **Quality Gating**: Strictly blocks creating shipments for uninspected or `REJECTED` quality batches.

### `PATCH /api/v1/organizations/:orgId/shipments/:shipmentId/milestones/:milestoneId`
Updates progress milestones (customs clearance, port departure, arrival) and propagates forward delays across all downstream milestones and ETA.

### `PATCH /api/v1/organizations/:orgId/shipments/:shipmentId/documents/:documentId`
Reviews compliance documents (EUR1, ONPQ Phytosanitary Certificate, Bill of Lading, Packing List, Commercial Invoice).

---

## 9. Financial Planning & Cost Analysis

### `GET /api/v1/organizations/:orgId/finance/campaigns/:campaignId`
Calculates campaign P&L, direct costs, cost per hectare, cost per kg, gross margin, contribution margin, EBIT, and break-even thresholds.

### `GET /api/v1/organizations/:orgId/finance/campaigns/:campaignId/cashflow`
Projects multi-month cash flow schedule and calculates peak working capital requirement (BFR).

### `POST /api/v1/organizations/:orgId/finance/campaigns/:campaignId/stress-test`
Simulates financial scenarios (-20% yield shortfall, -15% price drop, 60-day buyer delay) in sandboxed isolation.

### `POST /api/v1/organizations/:orgId/finance/dcf`
Computes multi-year Discounted Cash Flow (DCF), Net Present Value (NPV), and Internal Rate of Return (IRR).

### `GET /api/v1/organizations/:orgId/finance/exchange-rates`
Retrieves daily official BCRG exchange rates (GNF per USD, EUR, XOF) for financial reporting.

---

## 10. Management Dashboards & Decision Support

### `GET /api/v1/organizations/:orgId/dashboards/role-view?role=ROLE_NAME`
Delivers 7 tailored executive and management dashboards populated directly from live database tables:
- `LEADERSHIP`, `FARM_MANAGER`, `AGRONOMIST`, `COMMERCIAL_MANAGER`, `PROCESSING_MANAGER`, `LOGISTICS_MANAGER`, `FINANCE_MANAGER`.

### `GET /api/v1/organizations/:orgId/dashboards/decision-support`
Returns rule-based, explainable recommendations with verified root cause, underlying assumptions, urgency score, and next steps:
1. `YIELD_SHORTFALL_RECALIBRATION`
2. `UNCOMMITTED_HARVEST_STOCK`
3. `QUALITY_DEFECT_RATE_SPIKE`
4. `SHIPMENT_FORWARD_DELAY`
5. `CASH_FLOW_PEAK_DEFICIT`
6. `OPEX_BUDGET_OVERRUN`

### `GET /api/v1/organizations/:orgId/dashboards/export?format=csv|json&reportType=REPORT_NAME`
Generates downloadable, tenant-isolated data exports for external reporting and auditing.

---

## 11. Testing & Health Endpoints

### `GET /api/v1/health`
System liveness check reporting uptime, database status, and active persistence engine.

### `POST /api/v1/tests/run`
Executes the full automated test suite (89/89 tests) and returns structured category breakdown and duration metrics.
