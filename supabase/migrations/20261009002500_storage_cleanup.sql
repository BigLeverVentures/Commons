-- Commit reference retirement and cleanup work together. Retain completed rows
-- as tombstones: all legitimate uploads already use a fresh UUID object path.
CREATE TABLE public.storage_cleanup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('post-attachments', 'profile-photos')),
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error text CHECK (last_error IS NULL OR last_error IN ('storage_unavailable')),
  UNIQUE (bucket, path),
  CHECK (path ~ ('^' || owner_id::text || '/[0-9a-f-]{36}\.' ||
    CASE WHEN bucket = 'profile-photos' THEN '(jpg|png|webp)$' ELSE '(pdf|jpg|png|webp)$' END))
);
ALTER TABLE public.storage_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.storage_cleanup TO service_role;
CREATE INDEX storage_cleanup_pending_idx ON public.storage_cleanup(next_attempt_at)
  WHERE completed_at IS NULL;

-- Every assignment and retirement takes the same lock. BEFORE locks serialize
-- concurrent reference changes; AFTER queries run with a fresh READ COMMITTED
-- snapshot after any lock wait and see the final live-reference set.
CREATE FUNCTION public.guard_storage_reference() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  file_bucket text;
  old_path text;
  new_path text;
  locked_path text;
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    file_bucket := 'post-attachments';
    IF TG_OP <> 'INSERT' THEN old_path := OLD.attachment->>'path'; END IF;
    IF TG_OP <> 'DELETE' THEN new_path := NEW.attachment->>'path'; END IF;
  ELSE
    file_bucket := 'profile-photos';
    IF TG_OP <> 'INSERT' THEN old_path := OLD.avatar_path; END IF;
    IF TG_OP <> 'DELETE' THEN new_path := NEW.avatar_path; END IF;
  END IF;
  FOR locked_path IN SELECT DISTINCT p FROM unnest(ARRAY[old_path,new_path]) AS paths(p)
    WHERE p IS NOT NULL ORDER BY p
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(file_bucket || '/' || locked_path, 0));
  END LOOP;
  IF new_path IS NOT NULL AND new_path IS DISTINCT FROM old_path AND EXISTS (
    SELECT 1 FROM public.storage_cleanup WHERE bucket = file_bucket AND path = new_path
  ) THEN
    RAISE EXCEPTION 'This file was retired. Upload a new file.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.retire_storage_reference() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  file_bucket text;
  old_path text;
  new_path text;
  owner uuid;
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    file_bucket := 'post-attachments'; old_path := OLD.attachment->>'path'; owner := OLD.user_id;
    IF TG_OP <> 'DELETE' THEN new_path := NEW.attachment->>'path'; END IF;
  ELSE
    file_bucket := 'profile-photos'; old_path := OLD.avatar_path; owner := OLD.id;
    IF TG_OP <> 'DELETE' THEN new_path := NEW.avatar_path; END IF;
  END IF;
  IF old_path IS NOT NULL AND old_path IS DISTINCT FROM new_path AND NOT EXISTS (
    SELECT 1 FROM public.posts WHERE file_bucket = 'post-attachments' AND attachment->>'path' = old_path
    UNION ALL
    SELECT 1 FROM public.fellows WHERE file_bucket = 'profile-photos' AND avatar_path = old_path
  ) THEN
    INSERT INTO public.storage_cleanup(owner_id,bucket,path) VALUES(owner,file_bucket,old_path)
      ON CONFLICT(bucket,path) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER guard_post_file BEFORE INSERT OR UPDATE OF attachment OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_storage_reference();
CREATE TRIGGER retire_post_file AFTER UPDATE OF attachment OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.retire_storage_reference();
CREATE TRIGGER guard_profile_file BEFORE INSERT OR UPDATE OF avatar_path OR DELETE ON public.fellows
  FOR EACH ROW EXECUTE FUNCTION public.guard_storage_reference();
CREATE TRIGGER retire_profile_file AFTER UPDATE OF avatar_path OR DELETE ON public.fellows
  FOR EACH ROW EXECUTE FUNCTION public.retire_storage_reference();
REVOKE ALL ON FUNCTION public.guard_storage_reference(), public.retire_storage_reference() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.claim_storage_cleanup(batch_size integer DEFAULT 10)
RETURNS SETOF public.storage_cleanup
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.storage_cleanup SET lease_token=gen_random_uuid(),
    lease_expires_at=now()+interval '5 minutes', attempts=attempts+1
  WHERE id IN (
    SELECT q.id FROM public.storage_cleanup q
    WHERE q.completed_at IS NULL AND q.next_attempt_at <= now()
      AND (q.lease_expires_at IS NULL OR q.lease_expires_at < now())
      AND NOT EXISTS (SELECT 1 FROM public.posts WHERE q.bucket='post-attachments' AND attachment->>'path'=q.path)
      AND NOT EXISTS (SELECT 1 FROM public.fellows WHERE q.bucket='profile-photos' AND avatar_path=q.path)
    ORDER BY q.created_at,q.id LIMIT greatest(1,least(batch_size,10)) FOR UPDATE SKIP LOCKED
  ) RETURNING *;
$$;
CREATE FUNCTION public.finish_storage_cleanup(job_id uuid, claim_token uuid, succeeded boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.storage_cleanup SET
    completed_at=CASE WHEN succeeded THEN now() ELSE NULL END,
    next_attempt_at=CASE WHEN succeeded THEN next_attempt_at ELSE
      now()+make_interval(secs => least(21600, 30 * power(2,least(attempts,10)))::integer) END,
    last_error=CASE WHEN succeeded THEN NULL ELSE 'storage_unavailable' END,
    lease_token=NULL, lease_expires_at=NULL
  WHERE id=job_id AND lease_token=claim_token AND completed_at IS NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_storage_cleanup(integer), public.finish_storage_cleanup(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_storage_cleanup(integer), public.finish_storage_cleanup(uuid,uuid,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
