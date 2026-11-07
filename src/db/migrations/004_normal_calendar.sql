-- ============================================================================
-- Migration: 004_normal_calendar.sql
-- Description: Normal Calendar table, relations, and indexes
-- ============================================================================

CREATE TABLE IF NOT EXISTS normal_calendar_events (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'TASK',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Conakry',
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
    linked_campaign_id VARCHAR(100),
    linked_crop_cycle_id UUID,
    linked_master_operation_id UUID,
    linked_order_id UUID,
    linked_shipment_id UUID,
    recurrence_rule JSONB,
    reminders JSONB,
    notes TEXT,
    attachments JSONB,
    color_hex VARCHAR(10),
    tags TEXT[],
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_normal_events_org ON normal_calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_normal_events_time ON normal_calendar_events(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_normal_events_assignee ON normal_calendar_events(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_normal_events_status ON normal_calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_normal_events_farm ON normal_calendar_events(farm_id);

-- Enable RLS
ALTER TABLE normal_calendar_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_normal_events'
    ) THEN
        CREATE POLICY tenant_isolation_normal_events ON normal_calendar_events
            USING (
                organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID
                OR current_setting('app.is_platform_owner', true) = 'true'
            );
    END IF;
END $$;
