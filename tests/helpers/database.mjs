import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
export const alice = '10000000-0000-4000-8000-000000000001'
export const bob = '10000000-0000-4000-8000-000000000002'
export const outsider = '10000000-0000-4000-8000-000000000003'
export const post = '20000000-0000-4000-8000-000000000001'

export async function database() {
  return initializeDatabase(new PGlite())
}

export async function initializeDatabase(db) {
  await db.exec(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
    END $$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id), name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated, anon;
    GRANT ALL ON storage.objects TO authenticated, anon;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
    -- Model Supabase baseline grants before migrations, so migration REVOKEs survive.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated, anon;
  `)
  for (const migration of fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(fs.readFileSync(`supabase/migrations/${migration}`, 'utf8'))
  }
  await db.exec(`
    INSERT INTO public.auth_email_allowlist(email) VALUES ('alice@example.test'), ('bob@example.test');
    INSERT INTO auth.users VALUES ('${alice}', 'alice@example.test'), ('${bob}', 'bob@example.test');
    UPDATE public.fellows SET name = 'Alice' WHERE id = '${alice}';
    UPDATE public.fellows SET name = 'Bob' WHERE id = '${bob}';
  `)
  return db
}

export async function asUser(db, id, sql, params = []) {
  return db.transaction(async tx => {
    await tx.exec('SET LOCAL ROLE authenticated')
    await tx.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [id])
    return tx.query(sql, params)
  })
}

