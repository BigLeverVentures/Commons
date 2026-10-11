-- Posts table: asks, offers, and projects
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.fellows(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ask', 'offer', 'project')),
  title text NOT NULL CHECK (char_length(title) <= 120),
  description text NOT NULL CHECK (char_length(description) <= 2000),
  tags text[] DEFAULT '{}' CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 10),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for RLS + sort performance
CREATE INDEX posts_user_id_idx ON public.posts (user_id);
CREATE INDEX posts_created_at_idx ON public.posts (created_at DESC);

-- Updated_at trigger
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- All authenticated fellows can read all posts
CREATE POLICY "Posts are readable by authenticated users"
  ON public.posts FOR SELECT
  TO authenticated
  USING (true);

-- Fellows can insert their own posts
CREATE POLICY "Fellows can create own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Fellows can update only their own posts
CREATE POLICY "Fellows can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
