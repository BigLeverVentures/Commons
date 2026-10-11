-- Enforce admission at the actual insertion boundary, for every auth client.
CREATE OR REPLACE FUNCTION public.check_email_allowed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.auth_email_allowlist
    WHERE lower(trim(email)) = lower(trim(NEW.email))
  ) THEN
    RAISE EXCEPTION 'Email not allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_fellow_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_email_allowed();

-- Enforce the same response conditions as the UI even for direct API calls.
DROP POLICY "Fellows can respond to posts" ON public.responses;
CREATE POLICY "Fellows can respond to open posts by others"
  ON public.responses FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_id AND status = 'open'
        AND user_id <> (select auth.uid())
    )
  );
