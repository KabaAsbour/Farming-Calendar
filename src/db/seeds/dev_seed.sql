-- ============================================================================
-- Development Seed Data: dev_seed.sql
-- NOT FOR PRODUCTION - Clearly labeled test fixtures for Phase 1 verification
-- Standard development password for all seed accounts: "DevPass2026!"
-- ============================================================================

-- Bcrypt hash for password "DevPass2026!" with 10 rounds:
-- $2a$10$qR6FkGgK/v6M6jK1kZ9mye3L2eM7eU8WjR8Z5v7UqWf.R5yQ9Y2eq

-- 1. Organizations
INSERT INTO organizations (
    id, name, slug, country_code, org_type, primary_currency, timezone, contact_email, is_active
) VALUES 
('11111111-1111-1111-1111-111111111111', 'Coopérative Friguiagbé (Kindia)', 'coop-friguiagbe-kindia', 'GN', 'COOPERATIVE', 'GNF', 'Africa/Conakry', 'contact@kindia-coop.gn', true),
('22222222-2222-2222-2222-222222222222', 'Union Maraîchère du Fouta (Labé)', 'union-maraichere-fouta', 'GN', 'COOPERATIVE', 'GNF', 'Africa/Conakry', 'contact@fouta-union.gn', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Test Users (with bcrypt hash)
INSERT INTO users (
    id, email, password_hash, full_name, preferred_language, is_active, is_platform_owner
) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Ibrahima Diallo (Platform Owner)', 'fr', true, true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin.kindia@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Mariama Camara (Org Admin)', 'fr', true, false),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'manager.kindia@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Abdoulaye Soumah (Manager)', 'fr', true, false),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'agro.kindia@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Dr. Fanta Condé (Agronomist)', 'fr', true, false),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'comm.kindia@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Mamadou Touré (Commercial Mgr)', 'fr', true, false),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'finance.kindia@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Aissatou Barry (Finance Mgr)', 'fr', true, false),
('12121212-1212-1212-1212-121212121212', 'ops.kindia@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Sékou Traoré (Operations Staff)', 'fr', true, false),
('13131313-1313-1313-1313-131313131313', 'viewer.kindia@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Audit & Inspection GIZ (Viewer)', 'fr', true, false),
('21212121-2121-2121-2121-212121212121', 'admin.fouta@farmingcalendar.dev', '$2a$10$7R6vD8YgO4uA7sQy5zT8fOuTf3T6yG9o4.A7vB6Z8jG7vB6yE9Q2e', 'Ousmane Bah (Org Admin Fouta)', 'fr', true, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Memberships
INSERT INTO organization_memberships (id, organization_id, user_id, role, is_primary) VALUES
('m1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PLATFORM_OWNER', true),
('m2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ORG_ADMIN', true),
('m3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'MANAGER', true),
('m4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'AGRONOMIST', true),
('m5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'COMMERCIAL_MANAGER', true),
('m6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'FINANCE_MANAGER', true),
('m7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '12121212-1212-1212-1212-121212121212', 'OPERATIONS_STAFF', true),
('m8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '13131313-1313-1313-1313-131313131313', 'VIEWER', true),
('m9999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', '21212121-2121-2121-2121-212121212121', 'ORG_ADMIN', true)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 4. Sample Farms (Tenant Isolated)
INSERT INTO farms (id, organization_id, name, code, region, prefecture, total_area_ha, usable_area_ha) VALUES
('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Exploitation Friguiagbé', 'FARM-FRIG-01', 'Basse-Guinée', 'Kindia', 45.0, 38.5),
('f2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Ferme Horticole Timbi-Madina', 'FARM-TIMBI-01', 'Moyenne-Guinée', 'Pita/Labé', 80.0, 72.0)
ON CONFLICT (organization_id, code) DO NOTHING;

-- 5. Sample Plots
INSERT INTO plots (id, organization_id, farm_id, name, code, area_hectares, soil_type, irrigation_type, current_status) VALUES
('p1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'Parcelle Mangues Kent A1', 'PLOT-MNG-A1', 12.5, 'Sablo-limoneux', 'DRIP', 'CULTIVATED'),
('p2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'Parcelle Pomme de Terre F1', 'PLOT-PDT-F1', 15.0, 'Volcanique riche', 'SPRINKLER', 'PLANNED')
ON CONFLICT (farm_id, code) DO NOTHING;
