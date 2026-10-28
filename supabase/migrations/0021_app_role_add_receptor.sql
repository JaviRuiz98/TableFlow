-- =============================================================================
-- 0021_app_role_add_receptor.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: VERSIONED IN REPO — remote TableFlow may already include RECEPTOR
-- (added outside migrations). `IF NOT EXISTS` makes re-apply a no-op.
-- Still run via migration history if not recorded; then apply 0022.
--
-- Adds enum value RECEPTOR to public.app_role (ADMIN | USER | RECEPTOR).
-- Must be committed before using the label in 0022 on older Postgres.
-- =============================================================================

alter type public.app_role add value if not exists 'RECEPTOR';
