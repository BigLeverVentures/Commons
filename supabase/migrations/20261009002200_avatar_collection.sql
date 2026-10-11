BEGIN;
ALTER TABLE public.fellows DROP CONSTRAINT valid_avatar_style;
ALTER TABLE public.fellows ADD CONSTRAINT valid_avatar_style CHECK (avatar_style IS NULL OR avatar_style ~ '^peep-([1-9]|[12][0-9]|3[0-6])$');
COMMIT;
