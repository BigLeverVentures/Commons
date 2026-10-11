CREATE TABLE public.post_reactions (
 post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.fellows(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('celebrate','inspired','appreciate')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(post_id,user_id)
);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fellows see reactor identities" ON public.post_reactions FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.fellows WHERE id=(SELECT auth.uid())) AND EXISTS(SELECT 1 FROM public.posts WHERE id=post_id));
CREATE POLICY "Fellows react to others posts" ON public.post_reactions FOR INSERT TO authenticated
 WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.user_id<>(SELECT auth.uid())));
CREATE POLICY "Fellows change own reactions" ON public.post_reactions FOR UPDATE TO authenticated
 USING(user_id=(SELECT auth.uid()))
 WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.user_id<>(SELECT auth.uid())));
CREATE POLICY "Fellows remove own reactions" ON public.post_reactions FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.post_reactions TO authenticated;
CREATE VIEW public.reaction_counts WITH(security_barrier=true) AS
 SELECT r.post_id,r.kind,count(*) AS count FROM public.post_reactions r JOIN public.public_posts p ON p.id=r.post_id GROUP BY r.post_id,r.kind;
REVOKE ALL ON public.reaction_counts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.reaction_counts TO anon,authenticated,service_role;
