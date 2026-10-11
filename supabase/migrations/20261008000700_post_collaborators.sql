ALTER TABLE public.posts ADD COLUMN collaborators text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.posts ADD CONSTRAINT bounded_collaborator_names CHECK (
  cardinality(collaborators) <= 20 AND array_position(collaborators, NULL) IS NULL
  AND length(array_to_string(collaborators, ', ')) <= 2038
);

CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier = true) AS
  SELECT p.id, p.type, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name, f.avatar_path AS author_avatar_path, p.collaborators
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier = true) AS
  SELECT p.id, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name, f.avatar_path AS author_avatar_path, p.collaborators
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id WHERE p.type = 'project';
