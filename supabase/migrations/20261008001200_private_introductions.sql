-- Keep existing notification choices; split reminders from introduction email.
ALTER TABLE public.fellows ADD COLUMN introduction_emails boolean NOT NULL DEFAULT true;
UPDATE public.fellows SET introduction_emails = email_notifications;
ALTER TABLE public.notification_outbox ADD COLUMN response_id uuid REFERENCES public.responses(id) ON DELETE SET NULL;
UPDATE public.notification_outbox o SET response_id = r.id
FROM public.responses r WHERE o.kind = 'response' AND o.dedupe_key = 'response:' || r.id::text;

CREATE OR REPLACE FUNCTION public.queue_response_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notification_outbox(recipient_id,post_id,response_id,kind,dedupe_key)
    SELECT p.user_id,p.id,NEW.id,'response','response:' || NEW.id::text
    FROM public.posts p JOIN public.fellows f ON f.id=p.user_id
    WHERE p.id=NEW.post_id AND f.introduction_emails
    ON CONFLICT(dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$$;
