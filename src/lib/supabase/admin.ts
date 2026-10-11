import 'server-only'
import { createClient } from '@supabase/supabase-js'
export function getSupabaseAdminClient(fetcher?: typeof fetch) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, ...(fetcher ? { global: { fetch: fetcher } } : {}) })
}
