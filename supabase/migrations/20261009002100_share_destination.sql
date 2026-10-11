ALTER TABLE public.posts ADD COLUMN share_target text;
ALTER TABLE public.posts ADD CONSTRAINT valid_share_target CHECK (share_target IS NULL OR share_target IN ('website','attachment','post'));
-- NULL keeps older clients compatible; readers default to a website where present.
CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier=true) AS
 SELECT p.id,p.type,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,p.outcome_summary,p.outcome_url,p.built_at,
 f.name AS author_name,f.avatar_path AS author_avatar_path,p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style,
 p.participation,p.sharing,p.participation_published_at,p.sharing_published_at,p.confirmed_at,md5(p.user_id::text) AS author_key,p.collaborator_credits,p.description_mentions,p.outcome_mentions,p.share_target
 FROM public.posts p JOIN public.fellows f ON f.id=p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier=true) AS
 SELECT p.id,p.title,p.description,p.tags,p.status,p.topic,p.created_at,p.updated_at,p.outcome_summary,p.outcome_url,p.built_at,
 f.name AS author_name,f.avatar_path AS author_avatar_path,p.collaborators,p.link_preview,p.attachment,f.avatar_style AS author_avatar_style,
 p.participation,p.sharing,p.participation_published_at,p.sharing_published_at,p.confirmed_at,md5(p.user_id::text) AS author_key,p.collaborator_credits,p.description_mentions,p.outcome_mentions,p.share_target
 FROM public.posts p JOIN public.fellows f ON f.id=p.user_id WHERE p.type='project';

