ALTER TABLE public.fellows ADD COLUMN email_notifications boolean NOT NULL DEFAULT true;

CREATE FUNCTION public.protect_fellow_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (NEW.email IS DISTINCT FROM OLD.email OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'Fellow identity changes require an administrator';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_fellow_identity BEFORE UPDATE ON public.fellows
  FOR EACH ROW EXECUTE FUNCTION public.protect_fellow_identity();

CREATE TABLE public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.fellows(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('response','nudge')),
  dedupe_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  cancelled_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz,
  last_error text
);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
CREATE INDEX notification_pending_idx ON public.notification_outbox(next_attempt_at)
  WHERE delivered_at IS NULL AND cancelled_at IS NULL;

CREATE FUNCTION public.queue_response_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notification_outbox(recipient_id,post_id,kind,dedupe_key)
    SELECT p.user_id,p.id,'response','response:' || NEW.id::text
    FROM public.posts p JOIN public.fellows f ON f.id=p.user_id
    WHERE p.id=NEW.post_id AND f.email_notifications
    ON CONFLICT(dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER queue_response_email AFTER INSERT ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.queue_response_email();

CREATE FUNCTION public.queue_quiet_post_nudges() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.notification_outbox(recipient_id,post_id,kind,dedupe_key)
    SELECT DISTINCT ON (p.user_id) p.user_id,p.id,'nudge',
      'nudge:' || p.user_id::text || ':' || to_char(now() AT TIME ZONE 'UTC','YYYY-MM')
    FROM public.posts p JOIN public.fellows f ON f.id=p.user_id
    WHERE p.status='open' AND p.built_at IS NULL AND p.updated_at < now()-interval '14 days'
      AND f.email_notifications AND NOT EXISTS (SELECT 1 FROM public.responses r WHERE r.post_id=p.id)
    ORDER BY p.user_id,p.updated_at,p.id
    ON CONFLICT(dedupe_key) DO NOTHING;
$$;

CREATE FUNCTION public.claim_notifications(batch_size integer DEFAULT 10)
RETURNS SETOF public.notification_outbox
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.notification_outbox SET lease_expires_at=now()+interval '5 minutes',attempts=attempts+1
    WHERE id IN (
      SELECT id FROM public.notification_outbox
      WHERE delivered_at IS NULL AND cancelled_at IS NULL AND attempts < 6
        AND next_attempt_at <= now() AND (lease_expires_at IS NULL OR lease_expires_at < now())
      ORDER BY created_at,id LIMIT greatest(1,least(batch_size,10)) FOR UPDATE SKIP LOCKED
    ) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.queue_quiet_post_nudges() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_notifications(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.queue_quiet_post_nudges() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_notifications(integer) TO service_role;
GRANT SELECT ON public.fellows,public.posts,public.responses,public.directory_profiles TO service_role;
GRANT SELECT,UPDATE ON public.notification_outbox TO service_role;
