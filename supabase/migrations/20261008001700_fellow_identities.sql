-- Public identification fields are separate from email/admission and matching data.
CREATE TABLE public.fellow_identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 1 AND 100),
 cohort text CHECK(cohort ~ '^Cohort [1-8]$'),
 -- Exact configured directory origin/prefix is enforced by the application adapter.
 directory_url text CHECK(directory_url ~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$'),
 active boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.fellow_directory_sources (
 provider text NOT NULL CHECK(length(provider) BETWEEN 1 AND 80),
 source_record_id text NOT NULL CHECK(length(source_record_id) BETWEEN 1 AND 300),
 fellow_identity_id uuid NOT NULL REFERENCES public.fellow_identities(id) ON DELETE RESTRICT,
 PRIMARY KEY(provider,source_record_id)
);
ALTER TABLE public.fellow_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fellow_directory_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fellow_identities,public.fellow_directory_sources FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.fellow_identities,public.fellow_directory_sources TO service_role;
