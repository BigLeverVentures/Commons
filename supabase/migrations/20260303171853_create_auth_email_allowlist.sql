-- Auth email allowlist: gates who can sign up
CREATE TABLE public.auth_email_allowlist (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Block non-allowlisted signups at the database level
-- This is the AUTHORITATIVE security gate
CREATE OR REPLACE FUNCTION public.check_email_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.auth_email_allowlist WHERE email = NEW.email
  ) THEN
    RAISE EXCEPTION 'Email not allowed';
  END IF;
  RETURN NEW;
END;
$$;

-- A later migration installs this trigger on auth.users. This trigger function
-- is not a Supabase JSON Auth Hook; do not configure it in Authentication > Hooks.
