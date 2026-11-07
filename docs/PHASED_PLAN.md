# FARMING CALENDAR — Phased Implementation Plan & Technical Registry

## 1. Phased Roadmap Overview

| Phase | Title | Scope & Objectives | Status |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Project Foundation** | Architectural blueprint, bilingual skeleton, Express backend + Vite frontend, shared types, REST healthcheck, PostgreSQL DDL & Drizzle specification, documentation. | **COMPLETED & AWAITING REVIEW** |
| **Phase 1** | **Core Calendars & DB Setup** | Cloud SQL provisioning, Firebase Auth integration, Drizzle schema deployment, Guinea reference seed data, Normal Calendar & Master Calendar CRUD with basic bridge synchronization. | *Next Phase* |
| **Phase 2** | **Agronomic Operations & Yield Forecasting** | Technical itineraries (NPK/organic fertilization, spraying, irrigation), harvest forecast algorithm with confidence grading (A/B/C), labor hour tracking, weather integration. | *Planned* |
| **Phase 3** | **Commercial Off-Take & Cold Chain Logistics** | Buyer demand contracts, purchase orders, cold storage warehouse management, packhouse batch tracking, export logistics (Port of Conakry & Conakry Airport). | *Planned* |
| **Phase 4** | **Multi-Tenant Portals & Outgrower Schemes** | Cooperative member portal, outgrower plot aggregation, financial budgets vs actuals, multi-currency reporting (GNF, EUR, USD, XOF). | *Planned* |
| **Phase 5** | **Offline Mobile Capabilities & Advanced Analytics** | PWA offline synchronization for remote rural Guinea fields, export documentation generator (Phytosanitary Certificates, Packing Lists), multi-year analytics. | *Planned* |

---

## 2. External Services, Credentials & Dependencies Registry

| Feature / Capability | External Service / Provider | Required Credentials / Secrets | Environment Handling |
| :--- | :--- | :--- | :--- |
| **Relational Database** | Google Cloud SQL (PostgreSQL 16+) | `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` | Injected via Cloud SQL Auth Proxy at runtime; Developer edition verified eligible. |
| **User Authentication** | Firebase Auth / Google OAuth | `firebase-applet-config.json` (`projectId`, `appId`, `apiKey`) | Provisioned via `set_up_oauth` / Firebase integration; no client secrets exposed. |
| **Weather & Microclimate** | Open-Meteo / NOAA Agro-climate APIs | None required for free tier; optional API key for high-density radar | Backend proxy route `/api/v1/weather/*` |
| **Satellite & NDVI Soil Data** | Copernicus Sentinel-2 / Landsat | Copernicus API Bearer token | Backend proxy route; optional for Phase 4/5. |
| **SMS / Mobile Field Alerts** | Orange Money Guinée / Twilio / Infobip | API Key & Secret | Stored in server environment secrets; required for rural Guinea field SMS. |

---

## 3. Environmental Constraints & Practical Adjustments

1. **Cloud SQL Provisioning Consent Gate**:
   - The platform strictly forbids provisioning database instances or creating live connections before user consent.
   - *Adjustment*: Phase 0 establishes the complete DDL, Drizzle schemas, and data structures as an architectural contract. In Phase 1, the Cloud SQL consent card (`show_aistudio_ui ui_type: 'cloudsql_setup'`) will be presented to establish the real instance.
2. **ES Module Resolution with Drizzle**:
   - In Node.js `"type": "module"` with `tsx`, all internal file imports must include explicit file extensions (`.ts`, `.json`).
3. **No Database Secrets on Client**:
   - The React frontend communicates strictly with `/api/v1/*`. Database credentials and admin passwords are exclusively accessed on the Node.js server.
4. **Port 3000 Dev Server**:
   - Dev server runs on port 3000 using Express mounting Vite middleware in development mode (`tsx server.ts`).

---

## 4. Key Decisions Requiring Human Input Before Phase 1

1. **Cloud SQL Deployment Region**:
   - Recommended region: `europe-west3` (Frankfurt) or `europe-west1` (Belgium) for optimal latency with West Africa / Guinea.
2. **Primary Crop Portfolio for Initial Seeding**:
   - Recommendation: 4 priority Guinean export crops:
     1. Mangue (*Mangifera indica* - Variétés *Kent*, *Amélie*, *Keitt*)
     2. Ananas (*Ananas comosus* - Variétés *Baronne de Rothschild*, *Queen Victoria*)
     3. Pomme de terre du Fouta (*Solanum tuberosum* - Variété *Nicola*)
     4. Riz pluvial & de mangrove (*Oryza sativa / glaberrima* - Variété *CK-21*)
3. **Authentication Mode**:
   - Google Sign-In via Firebase Auth (standard single sign-on for agribusiness managers and agronomists).
