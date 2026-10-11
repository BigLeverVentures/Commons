-- Keep all existing reactions; permit one of each kind per fellow per post.
ALTER TABLE public.post_reactions DROP CONSTRAINT post_reactions_pkey;
ALTER TABLE public.post_reactions ADD PRIMARY KEY (post_id, user_id, kind);
NOTIFY pgrst, 'reload schema';
