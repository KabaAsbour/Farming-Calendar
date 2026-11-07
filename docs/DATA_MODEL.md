# FARMING CALENDAR — Relational Data Model (PostgreSQL 16+)

This document defines the relational database architecture designed for PostgreSQL 16+ using Drizzle ORM and standard SQL migrations.

## 1. Entity-Relationship Topology

```
[organizations] ──< [users]
       │
       ├──< [farms] ──< [plots] ──< [production_campaigns] ──< [campaign_harvests]
       │                                  │
       │                                  ├──< [master_operations] ──────────┐
       │                                  │                                   │ (Bidirectional Bridge)
       │                                  ├──< [budgets]                      ▼
       ├──< [normal_calendar_events] <────┴───────────────────────────────────┘
       │        │
       │        └──< [calendar_exceptions]
       │
       ├──< [buyers] ──< [commercial_orders] ──< [supply_reservations]
       │
       ├──< [inventory_items] ──< [inventory_movements]
       │
       ├──< [processing_recipes] ──< [processing_batches] ──< [quality_inspections]
       │
       ├──< [shipments] ──< [shipment_milestones]
       │        │
       │        └──< [compliance_documents]
       │
       ├──< [exchange_rates]
       ├──< [investment_projects]
       ├──< [organization_preferences]
       └──< [audit_logs] (WORM)
```

---

## 2. Table Schemas (DDL Specification)

### 2.1 Identity, Multitenancy & Preferences
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    country_code VARCHAR(2) NOT NULL DEFAULT 'GN',
    org_type VARCHAR(50) NOT NULL DEFAULT 'ENTERPRISE',
    primary_currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Conakry',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'fr',
    preferred_currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    preferred_timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Conakry',
    preferred_unit_system VARCHAR(20) NOT NULL DEFAULT 'METRIC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_pref UNIQUE(organization_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'fr',
    active_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL DEFAULT 'OPERATIONS_STAFF',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Agricultural Core
```sql
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    region VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    total_area_ha NUMERIC(10, 2) NOT NULL DEFAULT 0,
    usable_area_ha NUMERIC(10, 2) NOT NULL DEFAULT 0,
    manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    area_ha NUMERIC(10, 2) NOT NULL,
    soil_type VARCHAR(50) NOT NULL,
    irrigation_system VARCHAR(50) NOT NULL,
    topography VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE RESTRICT,
    season_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    crop_id VARCHAR(50) NOT NULL,
    crop_variety_id VARCHAR(50) NOT NULL,
    planned_area NUMERIC(10, 2) NOT NULL,
    area_unit VARCHAR(10) NOT NULL DEFAULT 'HA',
    planting_window_start DATE NOT NULL,
    planting_window_end DATE NOT NULL,
    expected_harvest_start DATE NOT NULL,
    expected_harvest_end DATE NOT NULL,
    production_target_quantity NUMERIC(12, 2) NOT NULL,
    production_target_unit VARCHAR(20) NOT NULL DEFAULT 'KG',
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    budget_allocated NUMERIC(16, 2) NOT NULL DEFAULT 0,
    budget_currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_harvests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES production_campaigns(id) ON DELETE CASCADE,
    harvest_batch_number VARCHAR(100) NOT NULL,
    harvest_date DATE NOT NULL,
    quantity_harvested NUMERIC(12, 2) NOT NULL,
    quantity_unit VARCHAR(20) NOT NULL DEFAULT 'KG',
    quality_grade VARCHAR(20) NOT NULL DEFAULT 'GRADE_A',
    loss_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
    storage_location VARCHAR(255) NOT NULL,
    destination VARCHAR(50) NOT NULL DEFAULT 'LOCAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 Calendar & Bidirectional Bridge
```sql
CREATE TABLE normal_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- TASK, MEETING, DEADLINE, MAINTENANCE, INSPECTION
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Conakry',
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
    linked_campaign_id UUID REFERENCES production_campaigns(id) ON DELETE SET NULL,
    linked_order_id UUID,
    linked_shipment_id UUID,
    recurrence_rule JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.4 Commercial Agribusiness & Supply Reservations
```sql
CREATE TABLE buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    buyer_type VARCHAR(50) NOT NULL, -- SUPERMARKET_CHAIN, EXPORT_TRADER, PROCESSOR
    country_code VARCHAR(2) NOT NULL,
    market VARCHAR(50) NOT NULL, -- DOMESTIC_GUINEA, REGIONAL_CEDEAO, INTERNATIONAL_EXPORT
    locality VARCHAR(100) NOT NULL,
    target_currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commercial_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'INQUIRY',
    delivery_destination VARCHAR(255) NOT NULL,
    delivery_window_start DATE NOT NULL,
    delivery_window_end DATE NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    total_amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
    lines JSONB NOT NULL DEFAULT '[]'::jsonb,
    payment_milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supply_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES commercial_orders(id) ON DELETE CASCADE,
    order_line_id VARCHAR(50) NOT NULL,
    campaign_id UUID NOT NULL REFERENCES production_campaigns(id) ON DELETE RESTRICT,
    campaign_name VARCHAR(255) NOT NULL,
    reserved_quantity_tons NUMERIC(10, 2) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- HARVESTED_STOCK, FORECAST_HARVEST
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    reservation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.5 Inventory, Milling & Quality Inspections
```sql
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- RAW_PRODUCE, PACKAGING_MATERIAL, INPUT_FERTILIZER, PROCESSED_GOOD
    quantity_available NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'KG',
    storage_location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- RECEIVING, ISSUING, TRANSFER, ADJUSTMENT
    quantity NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    location_source VARCHAR(255) NOT NULL,
    location_destination VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE processing_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    recipe_name VARCHAR(255) NOT NULL,
    input_quantity NUMERIC(12, 2) NOT NULL,
    input_unit VARCHAR(20) NOT NULL,
    output_quantity NUMERIC(12, 2),
    output_unit VARCHAR(20),
    actual_conversion_yield_pct NUMERIC(6, 2),
    total_cost_gnf NUMERIC(16, 2) NOT NULL DEFAULT 0,
    unit_production_cost_gnf NUMERIC(16, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inspection_number VARCHAR(100) NOT NULL UNIQUE,
    batch_number VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inspector_name VARCHAR(255) NOT NULL,
    inspector_accreditation VARCHAR(255) NOT NULL,
    defects_rate_pct NUMERIC(5, 2) NOT NULL,
    foreign_matter_pct NUMERIC(5, 2) NOT NULL,
    release_status VARCHAR(50) NOT NULL, -- RELEASED, REJECTED, QUARANTINE
    non_conformance_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.6 Logistics & Export Compliance
```sql
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_number VARCHAR(100) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES commercial_orders(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(255) NOT NULL,
    destination_market VARCHAR(50) NOT NULL,
    transport_mode VARCHAR(50) NOT NULL, -- MARITIME, AIR_FREIGHT, ROAD_FREIGHT
    carrier_name VARCHAR(255) NOT NULL,
    container_or_vehicle_id VARCHAR(100) NOT NULL,
    current_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT_PLANNING',
    total_delay_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    is_dispatch_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_arrival_date TIMESTAMPTZ NOT NULL,
    milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.7 Financial Management & WORM Audit Trail
```sql
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    expense_nature VARCHAR(10) NOT NULL DEFAULT 'OPEX',
    planned_budget NUMERIC(16, 2) NOT NULL,
    actual_expenditure NUMERIC(16, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(16, 6) NOT NULL,
    rate_date DATE NOT NULL,
    source_attribution VARCHAR(100) NOT NULL, -- Banque Centrale de la République de Guinée (BCRG)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    target_entity_id VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_org_time ON audit_logs(organization_id, created_at DESC);
```
