# FARMING CALENDAR — Operations, Deployment & Release Readiness Guide

**System**: FARMING CALENDAR (Bilingual Agribusiness ERP & Planning SaaS)  
**Target Architecture**: Node.js 22 LTS, React 19, PostgreSQL 16+ (Google Cloud SQL)  
**Deployment Target**: Google Cloud Run, Containerized Docker / Kubernetes  
**Current Assessment Status**: Ready for Production Release (89/89 Tests Passed — 100%)

---

## 1. Database Operations & Migration Procedures

The persistence layer is governed by sequential, idempotent SQL migration files located in `src/db/migrations/`:
- `001_initial_schema.sql`: Core tenancy, organizations, users, memberships, farms, plots, audit logs.
- `002_security_and_tenancy.sql`: Row-Level Security (RLS) policies and tenancy indices.
- `003_dev_seed.sql`: Sandbox test fixtures (Kindia and Fouta cooperatives).
- `004_normal_calendar.sql`: Calendar events, recurring rules, and exception overrides.
- `005_agricultural_core.sql`: Botanical crops, varieties, campaigns, seasons, and partial harvests.
- `006_commercial_management.sql`: Buyers, sales orders, and concurrency-safe reservations.
- `007_processing_and_inventory.sql`: Inventory items, movements, milling recipes, and quality inspections.
- `008_logistics_and_export.sql`: Shipments, route milestones, and compliance documents.

### 1.1 Running Migrations on a Clean Database
1. Provision a clean PostgreSQL 16 instance.
2. Configure the database connection parameters in environment variables:
   ```bash
   export SQL_HOST="your-cloudsql-ip"
   export SQL_PORT="5432"
   export SQL_USER="farming_app_user"
   export SQL_PASSWORD="your-strong-db-password"
   export SQL_DB_NAME="farming_calendar_prod"
   ```
3. Start the application (`node server.ts` or `npm run build && npm start`).
4. The migration runner checks `_migrations`:
   - Creates the `_migrations` tracking table if not present.
   - Applies each unapplied migration sequentially in a single transaction per migration.
   - Records successful migration filenames with UTC timestamps.

### 1.2 Applying Migrations to an Existing Database
1. Always take an immediate pre-migration snapshot:
   ```bash
   pg_dump -h $SQL_HOST -U $SQL_USER -d $SQL_DB_NAME -Fc -f "pre_migration_backup_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. Run the migration engine:
   Migrations in `src/db/migrations/` use `IF NOT EXISTS` syntax and check existing columns before executing `ALTER TABLE`, ensuring zero mutation of existing production records.
3. Verify migration history:
   ```sql
   SELECT id, name, applied_at FROM _migrations ORDER BY id ASC;
   ```

### 1.3 Migration Rollback Strategy
- For forward-only relational safety, schema modifications are designed to be backward compatible (additive changes: new columns with defaults or nullable constraints).
- In the event of an unrecoverable migration failure:
  1. Halt application traffic via Cloud Run minimum revisions or maintenance redirect.
  2. Restore the pre-migration snapshot using `pg_restore`:
     ```bash
     pg_restore --clean --if-exists -h $SQL_HOST -U $SQL_USER -d $SQL_DB_NAME "pre_migration_backup_YYYYMMDD_HHMMSS.dump"
     ```
  3. Re-deploy the previously verified container tag.

---

## 2. Backup & Restore Procedures

### 2.1 Automated Cloud SQL Backups
- Enable automated daily backups with point-in-time recovery (PITR) with a 7-day transaction log retention window.
- Backups must be located in a separate geographic region from the primary instance.

### 2.2 Manual Cold Backup (Logical Dump)
Execute weekly or prior to major software releases:
```bash
# Export compressed custom-format dump
pg_dump -h $SQL_HOST -p $SQL_PORT -U $SQL_USER -d $SQL_DB_NAME \
  --format=custom --blobs --verbose \
  --file=/backups/farming_calendar_$(date +%Y%m%d_%H%M%S).dump

# Verify dump integrity
pg_restore --list /backups/farming_calendar_$(date +%Y%m%d_%H%M%S).dump > /dev/null
```

### 2.3 Disaster Recovery Restoration
```bash
# Drop active connections to target database
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE datname = 'farming_calendar_prod' AND pid <> pg_backend_pid();

# Restore database schema and data
pg_restore --clean --if-exists --exit-on-error \
  -h $SQL_HOST -p $SQL_PORT -U $SQL_USER -d farming_calendar_prod \
  /backups/farming_calendar_TARGET_TIMESTAMP.dump
```

---

## 3. Environment Variables Reference

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Node environment runtime flag |
| `PORT` | Yes | `3000` | Application HTTP listening port |
| `JWT_SECRET` | Yes | `[RANDOM_64_CHAR_HEX]` | HMAC-SHA256 signing secret for session tokens |
| `SQL_HOST` | Optional | `127.0.0.1` or Cloud SQL IP | PostgreSQL database host (falls back to local if empty) |
| `SQL_PORT` | Optional | `5432` | PostgreSQL database port |
| `SQL_USER` | Optional | `farming_app` | Database username |
| `SQL_PASSWORD` | Optional | `[DATABASE_PASSWORD]` | Database credentials |
| `SQL_DB_NAME` | Optional | `farming_calendar_db` | Relational database schema name |
| `ORANGE_SMS_API_KEY` | Optional | `[ORANGE_API_KEY]` | Orange Guinea SMS API token for grower alerts |
| `TWILIO_ACCOUNT_SID`| Optional | `[TWILIO_SID]` | SMS fallback gateway for international off-takers |
| `TWILIO_AUTH_TOKEN` | Optional | `[TWILIO_TOKEN]` | Twilio authentication token |
| `SENDGRID_API_KEY`  | Optional | `[SENDGRID_KEY]` | Email dispatch gateway for commercial export documents |

*Note: Never commit real credentials to source control. In production, inject secrets via Google Secret Manager or Cloud Run Environment Variables.*

---

## 4. Production Deployment Guide (Google Cloud Run)

### 4.1 Container Build
```bash
# 1. Compile production frontend bundle and TypeScript backend
npm run build

# 2. Build Docker container image
docker build -t gcr.io/YOUR_PROJECT_ID/farming-calendar:v1.0.0 .

# 3. Push to Google Artifact Registry / Container Registry
docker push gcr.io/YOUR_PROJECT_ID/farming-calendar:v1.0.0
```

### 4.2 Cloud Run Service Deployment
```bash
gcloud run deploy farming-calendar-app \
  --image gcr.io/YOUR_PROJECT_ID/farming-calendar:v1.0.0 \
  --platform managed \
  --region europe-west3 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "JWT_SECRET=jwt-signing-secret:latest,SQL_PASSWORD=cloudsql-db-password:latest" \
  --add-cloudsql-instances YOUR_PROJECT_ID:europe-west3:farming-calendar-pg
```

### 4.3 Custom Domains & HTTPS
- Map custom domains (e.g. `app.farmingcalendar.com`) via Cloud Run Domain Mapping or Cloud Load Balancing.
- Google Cloud automatically provisions and renews managed SSL/TLS certificates.

---

## 5. Security Audit Findings & Hardening

1. **Authentication & Session Tokens**:
   - Passwords hashed using bcrypt with salt work factor 10.
   - JWT tokens signed using HMAC-SHA256 with 24-hour expiration.
   - Tampered and empty tokens are strictly rejected (validated in automated tests).
2. **Tenant Isolation**:
   - `requireTenantIsolation` server middleware verifies caller tenancy before executing queries.
   - Cross-tenant shipment, financial, and agronomic accesses are blocked with `SECURITY_ERROR`.
3. **Audit Logging (WORM)**:
   - High-privilege actions (member invitations, order state transitions, status updates, logins) are recorded in `audit_logs`.
4. **Input Validation**:
   - Rejection reasons are mandatory when rejecting quality batches.
   - Tonnage reservation requests are checked against available capacity.

---

## 6. Known Issues, Trade-offs & Limitations

1. **Third-Party Carrier Live Tracking**:
   - Real-time telemetry from commercial shipping lines (CMA CGM, Maersk, Bolloré) is not currently connected to live carrier satellite APIs. The system models contractual transit days and delay hours with transparent notices (`isLiveCarrierIntegration: false`).
2. **Notification Delivery Providers**:
   - SMS and email notification services are architected with clean provider interfaces (`NotificationService`). If credentials (`ORANGE_SMS_API_KEY`, `TWILIO_AUTH_TOKEN`, `SENDGRID_API_KEY`) are unconfigured, notifications are safely queued in local storage with `UNCONFIGURED_PENDING_PROVIDER` status without making false delivery claims.
3. **Relational Database Engine**:
   - The application automatically connects to PostgreSQL when `SQL_HOST` is supplied. When unconfigured, it operates on a persistent, crash-safe local relational engine with atomic commit logging.

---

## 7. Release Readiness Checklist

| Category | Verification Item | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **Testing** | Complete Automated Test Suite (89 tests) | **PASSED** | 89 / 89 Passed (100%) in `test/run-tests.ts` |
| **Testing** | End-to-End Agribusiness Lifecycle Integration | **PASSED** | Validated in Category 17 Test 1 |
| **Resilience** | 20% Harvest Yield Shortfall Shock | **PASSED** | Simulation verifies revenue drop & 0 book mutation |
| **Resilience** | Failed Quality Inspection Blocks Dispatch | **PASSED** | Rejected lot blocked with `DISPATCH_BLOCKED` |
| **Resilience** | 72-Hour Forward Logistics Delay Cascade | **PASSED** | Forward delay shifts ETA and triggers `DELAYED` |
| **Resilience** | Strategic Packaging Shortage Gating | **PASSED** | Over-issuing blocked when balance is insufficient |
| **Resilience** | Working Capital Peak Deficit (BFR) Alert | **PASSED** | Decision support engine surfaces warning |
| **Resilience** | Overselling Prevention (12,000 kg vs 10,000 kg)| **PASSED** | Blocked with `INSUFFICIENT_SUPPLY_ERROR` |
| **Resilience** | Concurrent Double-Booking Prevention | **PASSED** | Simultaneous over-allocation rejected |
| **Security** | Cross-Tenant Boundary Isolation | **PASSED** | Organization Alpha cannot access Organization Beta |
| **Security** | Tampered / Expired Session Token Rejection | **PASSED** | Rejected with `Invalid or expired authentication token` |
| **Reliability**| Database Connection Failure & Fallback | **PASSED** | Recovers gracefully without state loss |
| **Localization**| 100% French / English Parity | **PASSED** | Verified in Category 16 Test 1 |
| **Localization**| GNF 0-Decimal & West Africa Formatting | **PASSED** | Verified in Category 16 Test 2 |
| **Build** | TypeScript Compilation & Linting | **PASSED** | `tsc --noEmit` exits with 0 errors |
