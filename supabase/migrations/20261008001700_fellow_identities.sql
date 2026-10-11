-- Public identification fields are separate from email/admission and matching data.
CREATE TABLE public.fellow_identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 1 AND 100),
 cohort text CHECK(cohort ~ '^Cohort [1-8]$'),
 directory_url text CHECK(directory_url ~ '^https://directory\.example\.org/#/fellow/[A-Za-z0-9_-]+$'),
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
-- Fictional identity fixture; replaced by test setup in the generic bootstrap unit.
INSERT INTO public.fellow_identities(id,display_name,directory_url)
 VALUES('90000000-0000-4000-8000-000000000001','Morgan Rivera','https://directory.example.org/#/fellow/morgan_rivera');
