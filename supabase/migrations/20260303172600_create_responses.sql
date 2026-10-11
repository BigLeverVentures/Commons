-- Responses table: expressions of interest on posts
CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.fellows(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(note) <= 500),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- RLS
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Response author OR post author can read responses
CREATE POLICY "Response visible to author and post author"
  ON public.responses FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR (select auth.uid()) = (SELECT user_id FROM public.posts WHERE id = post_id)
  );

-- Fellows can insert responses to posts
CREATE POLICY "Fellows can respond to posts"
  ON public.responses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
