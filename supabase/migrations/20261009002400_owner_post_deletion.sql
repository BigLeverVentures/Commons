-- Dependent introductions, reactions and outbox entries already cascade.
CREATE POLICY "Fellows can delete own posts"
  ON public.posts FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
GRANT DELETE ON public.posts TO authenticated;
NOTIFY pgrst, 'reload schema';
