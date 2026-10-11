-- Built here is a milestone; project state describes participation or operation.
ALTER TABLE public.posts DROP CONSTRAINT posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('open', 'closed', 'ended') AND (status <> 'ended' OR type = 'project'));
