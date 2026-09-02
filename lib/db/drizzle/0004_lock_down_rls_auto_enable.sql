-- The rls_auto_enable() event-trigger function (see the "ensure_rls" event
-- trigger) is SECURITY DEFINER and was left executable via PostgREST's
-- /rest/v1/rpc/rls_auto_enable endpoint, flagged by Supabase's security
-- advisor as callable by the anon and authenticated roles.
--
-- It's only meant to run as an event trigger callback on CREATE TABLE, never
-- as a direct RPC call, so there's no legitimate reason for API roles to
-- execute it. Note: Postgres grants EXECUTE to PUBLIC by default, and anon /
-- authenticated are implicitly members of PUBLIC — revoking from those roles
-- by name does nothing on its own; the grant has to be revoked from PUBLIC.

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
