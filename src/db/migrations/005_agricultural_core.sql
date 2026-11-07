-- ============================================================================
-- Migration: 005_agricultural_core.sql
-- Description: Phase 3 Agricultural Core master data, campaigns, operations,
--              partial harvests, inputs, equipment, suppliers, and methods
-- ============================================================================

-- 1. Crops Master Catalog
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    scientific_name VARCHAR(150),
    category VARCHAR(50) NOT NULL,
    growth_cycle_days INT NOT NULL DEFAULT 90,
    default_spacing_cm VARCHAR(50),
    water_requirement_mm INT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. Crop Varieties
CREATE TABLE IF NOT EXISTS crop_varieties (
    id UUID PRIMARY KEY,
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    maturity_days_min INT NOT NULL,
    maturity_days_max INT NOT NULL,
    expected_yield_per_ha_tons NUMERIC(10, 2) NOT NULL DEFAULT 0,
    heat_tolerance VARCHAR(50) DEFAULT 'HIGH',
    disease_resistances TEXT,
    characteristics TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 3. Agricultural Seasons
CREATE TABLE IF NOT EXISTS agricultural_seasons (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 4. Agricultural Methods
CREATE TABLE IF NOT EXISTS agricultural_methods (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('PLANTING', 'HARVESTING')),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    equipment_needed TEXT,
    labor_intensity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    locality VARCHAR(100),
    rating NUMERIC(3, 1) DEFAULT 4.5,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 6. Agricultural Inputs
CREATE TABLE IF NOT EXISTS agricultural_inputs (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'KG',
    default_dosage VARCHAR(100),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    cost_per_unit NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
    safety_precautions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 7. Agricultural Equipment
CREATE TABLE IF NOT EXISTS agricultural_equipment (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    serial_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    maintenance_schedule VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 8. Field Teams
CREATE TABLE IF NOT EXISTS field_teams (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    leader_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    members_count INT NOT NULL DEFAULT 5,
    skills TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. Production Campaigns
CREATE TABLE IF NOT EXISTS production_campaigns (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    season_id UUID REFERENCES agricultural_seasons(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
    crop_id UUID NOT NULL REFERENCES crops(id),
    crop_variety_id UUID NOT NULL REFERENCES crop_varieties(id),
    planned_area NUMERIC(10, 4) NOT NULL,
    area_unit VARCHAR(20) NOT NULL DEFAULT 'HA',
    planting_window_start DATE NOT NULL,
    planting_window_end DATE NOT NULL,
    expected_harvest_start DATE NOT NULL,
    expected_harvest_end DATE NOT NULL,
    production_target_quantity NUMERIC(14, 2) NOT NULL,
    production_target_unit VARCHAR(20) NOT NULL DEFAULT 'KG',
    manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    field_team_id UUID REFERENCES field_teams(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    budget_code VARCHAR(50),
    budget_allocated NUMERIC(16, 2) NOT NULL DEFAULT 0,
    budget_actual_spend NUMERIC(16, 2) NOT NULL DEFAULT 0,
    budget_currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    planting_method_id UUID REFERENCES agricultural_methods(id) ON DELETE SET NULL,
    harvesting_method_id UUID REFERENCES agricultural_methods(id) ON DELETE SET NULL,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_campaign_dates CHECK (planting_window_start <= planting_window_end AND expected_harvest_start <= expected_harvest_end),
    CONSTRAINT chk_campaign_positive_area CHECK (planned_area > 0),
    CONSTRAINT chk_campaign_positive_target CHECK (production_target_quantity > 0)
);

-- 10. Campaign Operations
CREATE TABLE IF NOT EXISTS campaign_operations (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES production_campaigns(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    planned_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
    planned_quantity NUMERIC(12, 2),
    actual_quantity NUMERIC(12, 2),
    quantity_unit VARCHAR(50),
    labor_workers_count INT,
    labor_hours NUMERIC(6, 2),
    cost_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    cost_currency VARCHAR(3) NOT NULL DEFAULT 'GNF',
    responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    field_team_id UUID REFERENCES field_teams(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES agricultural_equipment(id) ON DELETE SET NULL,
    input_id UUID REFERENCES agricultural_inputs(id) ON DELETE SET NULL,
    input_batch_number VARCHAR(100),
    input_quantity_used NUMERIC(12, 2),
    pest_or_disease_name VARCHAR(150),
    incidence_rate_pct NUMERIC(5, 2),
    severity_level VARCHAR(50),
    observation_notes TEXT,
    linked_calendar_event_id UUID REFERENCES normal_calendar_events(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 11. Campaign Harvests (Multiple partial harvests per campaign)
CREATE TABLE IF NOT EXISTS campaign_harvests (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES production_campaigns(id) ON DELETE CASCADE,
    operation_id UUID REFERENCES campaign_operations(id) ON DELETE SET NULL,
    harvest_batch_number VARCHAR(100) NOT NULL,
    harvest_date DATE NOT NULL,
    quantity_harvested NUMERIC(14, 2) NOT NULL,
    quantity_unit VARCHAR(50) NOT NULL DEFAULT 'KG',
    quality_grade VARCHAR(50) NOT NULL DEFAULT 'GRADE_A',
    loss_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
    storage_location VARCHAR(150),
    moisture_pct NUMERIC(5, 2),
    brix_level NUMERIC(5, 2),
    workers_count INT NOT NULL DEFAULT 4,
    supervisor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    destination VARCHAR(50) NOT NULL DEFAULT 'LOCAL_MARKET',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_harvest_quantities CHECK (quantity_harvested >= 0 AND loss_quantity >= 0)
);

-- Indexes for performance & tenancy filtering
CREATE INDEX IF NOT EXISTS idx_crops_org ON crops(organization_id);
CREATE INDEX IF NOT EXISTS idx_varieties_crop ON crop_varieties(crop_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON production_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_farm ON production_campaigns(farm_id);
CREATE INDEX IF NOT EXISTS idx_operations_campaign ON campaign_operations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_harvests_campaign ON campaign_harvests(campaign_id);
