-- All board posts are public; identity/contact records and responses remain protected.
CREATE VIEW public.public_posts WITH (security_barrier = true) AS
  SELECT p.id, p.type, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id;
REVOKE ALL ON public.public_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_posts TO anon, authenticated, service_role;

-- Keep existing shared project URLs working under the new public-board policy.
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier = true) AS
  SELECT p.id, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id
  WHERE p.type = 'project';
