ALTER TABLE public.fellows
  ADD COLUMN interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN contribution_preferences text[] NOT NULL DEFAULT '{}',
  ADD COLUMN personal_links jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN avatar_style text;
ALTER TABLE public.fellows ADD CONSTRAINT valid_fellow_interests CHECK (
  cardinality(interests) <= 6 AND array_position(interests,NULL) IS NULL
  AND interests <@ ARRAY['planet','enterprise','learning','care','technology','open']::text[]
);
ALTER TABLE public.fellows ADD CONSTRAINT valid_contribution_preferences CHECK (
  cardinality(contribution_preferences) <= 5 AND array_position(contribution_preferences,NULL) IS NULL
  AND contribution_preferences <@ ARRAY['Feedback','Mentoring','Introductions','Testing','Occasional project help']::text[]
);
ALTER TABLE public.fellows ADD CONSTRAINT valid_avatar_style CHECK (avatar_style IS NULL OR avatar_style IN ('peep-1','peep-2','peep-3','peep-4','peep-5','peep-6'));
CREATE FUNCTION public.valid_personal_links(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE item jsonb;
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'array' OR jsonb_array_length(value)>3 THEN RETURN false; END IF;
  FOR item IN SELECT jsonb_array_elements(value) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
      OR jsonb_typeof(item->'label') IS DISTINCT FROM 'string' OR char_length(item->>'label') NOT BETWEEN 1 AND 40
      OR jsonb_typeof(item->'url') IS DISTINCT FROM 'string' OR char_length(item->>'url') NOT BETWEEN 1 AND 500
      OR (item->>'url') !~ '^https://[^/?#@[:space:]]+([/?#].*)?$' THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;
ALTER TABLE public.fellows ADD CONSTRAINT valid_personal_links CHECK (public.valid_personal_links(personal_links));
CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier=true) AS
  SELECT p.id,p.type,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,
    p.outcome_summary,p.outcome_url,p.built_at,f.name AS author_name,f.avatar_path AS author_avatar_path,
    p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style
  FROM public.posts p JOIN public.fellows f ON f.id=p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier=true) AS
  SELECT p.id,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,
    p.outcome_summary,p.outcome_url,p.built_at,f.name AS author_name,f.avatar_path AS author_avatar_path,
    p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style
  FROM public.posts p JOIN public.fellows f ON f.id=p.user_id WHERE p.type='project';
