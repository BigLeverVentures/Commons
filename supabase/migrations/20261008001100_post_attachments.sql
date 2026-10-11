ALTER TABLE public.posts ADD COLUMN attachment jsonb;
ALTER TABLE public.posts ADD CONSTRAINT valid_post_attachment CHECK (
  attachment IS NULL OR (
    jsonb_typeof(attachment) = 'object'
    AND attachment ?& ARRAY['path','name','type','size']
    AND jsonb_typeof(attachment->'path') = 'string'
    AND (attachment->>'path') ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$')
    AND jsonb_typeof(attachment->'name') = 'string' AND char_length(attachment->>'name') BETWEEN 1 AND 180
    AND jsonb_typeof(attachment->'type') = 'string'
    AND (attachment->>'type') IN ('application/pdf','image/jpeg','image/png','image/webp')
    AND jsonb_typeof(attachment->'size') = 'number' AND (attachment->>'size')::numeric BETWEEN 1 AND 2097152
    AND (attachment->>'size')::numeric = trunc((attachment->>'size')::numeric)
    AND octet_length(attachment::text) <= 1000
  )
);
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('post-attachments','post-attachments',true,2097152,ARRAY['application/pdf','image/jpeg','image/png','image/webp']);
CREATE POLICY "Fellows upload own post attachments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='post-attachments' AND split_part(name,'/',1)=(select auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.fellows WHERE id=(select auth.uid())));
CREATE POLICY "Fellows read own attachment objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='post-attachments' AND split_part(name,'/',1)=(select auth.uid())::text);
CREATE POLICY "Fellows remove own post attachments" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='post-attachments' AND split_part(name,'/',1)=(select auth.uid())::text);

CREATE OR REPLACE VIEW public.public_posts WITH (security_barrier = true) AS
  SELECT p.id, p.type, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name, f.avatar_path AS author_avatar_path, p.collaborators, p.link_preview, p.attachment
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id;
CREATE OR REPLACE VIEW public.public_projects WITH (security_barrier = true) AS
  SELECT p.id, p.title, p.description, p.tags, p.status, p.topic,
    p.created_at, p.updated_at, p.outcome_summary, p.outcome_url, p.built_at,
    f.name AS author_name, f.avatar_path AS author_avatar_path, p.collaborators, p.link_preview, p.attachment
  FROM public.posts p JOIN public.fellows f ON f.id = p.user_id WHERE p.type = 'project';
