-- Existing values keep their meaning; 'ended' also covers asks no longer needed and offers no longer offered.
ALTER TABLE public.posts DROP CONSTRAINT posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check CHECK(status IN ('open','closed','ended'));
