export function isPreviewMode() {
  return process.env.COMMONS_LOCAL_PREVIEW === 'true' && process.env.NODE_ENV === 'development'
}

export function hasSupabaseConfiguration() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
