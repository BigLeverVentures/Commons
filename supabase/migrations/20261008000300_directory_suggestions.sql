-- Narrow private matching index; the existing directory remains the source of truth.
CREATE TABLE public.directory_profiles (
  record_id text PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  tags text[] NOT NULL DEFAULT '{}',
  source_url text NOT NULL DEFAULT '',
  imported_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.directory_profiles ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies. Only the service role/admin imports and reads this index.

REVOKE ALL ON public.directory_profiles FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.directory_profiles TO service_role;
