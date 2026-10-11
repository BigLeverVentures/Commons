ALTER TABLE public.posts ADD COLUMN link_preview jsonb;
ALTER TABLE public.posts ADD CONSTRAINT bounded_website_preview CHECK (
  link_preview IS NULL OR (jsonb_typeof(link_preview) = 'object' AND octet_length(link_preview::text) <= 6000)
);
CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier = true) AS
  SELECT p.id, p.type, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name, f.avatar_path AS author_avatar_path, p.collaborators, p.link_preview
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier = true) AS
  SELECT p.id, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name, f.avatar_path AS author_avatar_path, p.collaborators, p.link_preview
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id WHERE p.type = 'project';
