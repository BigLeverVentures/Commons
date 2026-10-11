-- Fellows table: one row per authenticated fellow
CREATE TABLE public.fellows (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text CHECK (char_length(name) <= 100),
  cohort text,
  location text CHECK (char_length(location) <= 100),
  bio text CHECK (char_length(bio) <= 300),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fellows_updated_at
  BEFORE UPDATE ON public.fellows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-create fellow on first login (SECURITY DEFINER, idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.fellows (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.fellows ENABLE ROW LEVEL SECURITY;

-- All authenticated fellows can read all fellows
CREATE POLICY "Fellows are readable by authenticated users"
  ON public.fellows FOR SELECT
  TO authenticated
  USING (true);

-- Fellows can only update their own row
CREATE POLICY "Fellows can update own row"
  ON public.fellows FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
