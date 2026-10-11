-- All board posts are public, including asks and offers.
-- The public views already expose every type; remove the earlier project-only rule.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS only_projects_public;
