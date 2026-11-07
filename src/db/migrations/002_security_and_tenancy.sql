-- ============================================================================
-- Migration: 002_security_and_tenancy.sql
-- Description: Indexes, Foreign Keys & Row Level Security (RLS) policies
-- ============================================================================

-- Fast lookup indexes for tenant queries
CREATE INDEX IF NOT EXISTS idx_memberships_org ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_org ON farms(organization_id);
CREATE INDEX IF NOT EXISTS idx_plots_org ON plots(organization_id);
CREATE INDEX IF NOT EXISTS idx_plots_farm ON plots(farm_id);
CREATE INDEX IF NOT EXISTS idx_audit_org_time ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);

-- Enable Row Level Security (PostgreSQL)
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS Policies (PostgreSQL)
-- When session variable 'app.current_organization_id' is set:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_farms'
    ) THEN
        CREATE POLICY tenant_isolation_farms ON farms
            USING (
                organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID
                OR current_setting('app.is_platform_owner', true) = 'true'
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_plots'
    ) THEN
        CREATE POLICY tenant_isolation_plots ON plots
            USING (
                organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID
                OR current_setting('app.is_platform_owner', true) = 'true'
            );
    END IF;
END $$;
