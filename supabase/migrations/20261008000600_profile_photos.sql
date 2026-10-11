ALTER TABLE public.fellows ADD COLUMN avatar_path text;
ALTER TABLE public.fellows ADD CONSTRAINT fellow_photo_own_folder CHECK (
  avatar_path IS NULL OR avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', true, 2097152, ARRAY['image/jpeg','image/png','image/webp']);

CREATE POLICY "Fellows upload their own photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND split_part(name, '/', 1) = (select auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.fellows WHERE id = (select auth.uid())));
CREATE POLICY "Fellows read their own photo objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-photos' AND split_part(name, '/', 1) = (select auth.uid())::text);
CREATE POLICY "Fellows remove their own photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos' AND split_part(name, '/', 1) = (select auth.uid())::text);

CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier = true) AS
  SELECT p.id, p.type, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name, f.avatar_path AS author_avatar_path
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier = true) AS
  SELECT p.id, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name, f.avatar_path AS author_avatar_path
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id WHERE p.type = 'project';
