BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.fellows DROP CONSTRAINT valid_avatar_style;
ALTER TABLE public.fellows ADD CONSTRAINT valid_avatar_style CHECK (avatar_style IS NULL OR avatar_style ~ '^peep-([1-9]|[1-3][0-9]|4[0-8])$');
COMMIT;
