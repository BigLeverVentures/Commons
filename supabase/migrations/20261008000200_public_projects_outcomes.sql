ALTER TABLE public.posts
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN topic text CHECK (topic IN ('planet', 'enterprise', 'learning', 'care', 'technology', 'open')),
  ADD COLUMN outcome_summary text CHECK (char_length(outcome_summary) BETWEEN 1 AND 1000),
  ADD COLUMN outcome_url text CHECK (char_length(outcome_url) <= 2000 AND outcome_url ~ '^https?://'),
  ADD COLUMN built_at timestamptz,
  ADD CONSTRAINT only_projects_public CHECK (NOT is_public OR type = 'project'),
  ADD CONSTRAINT outcome_has_summary CHECK (built_at IS NULL OR outcome_summary IS NOT NULL);

-- Deliberate public projection. No email, directory profile, author UUID, or responses.
-- The owner-executed view bypasses base-table RLS ONLY for explicitly published projects.
CREATE VIEW public.public_projects WITH (security_barrier = true) AS
  SELECT p.id, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id
  WHERE p.is_public AND p.type = 'project';
REVOKE ALL ON public.public_projects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_projects TO anon, authenticated;
