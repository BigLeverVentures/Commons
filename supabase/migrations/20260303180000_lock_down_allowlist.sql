-- Lock down auth_email_allowlist: enable RLS, no public SELECT.
-- The auth.users BEFORE INSERT admission trigger is the security boundary.
-- No client-side code should query this table directly.

ALTER TABLE public.auth_email_allowlist ENABLE ROW LEVEL SECURITY;

-- No policies = no access via anon/authenticated roles.
-- Only service_role (used by Supabase triggers/hooks) can read/write.
