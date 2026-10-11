import 'server-only'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isPreviewMode, hasSupabaseConfiguration } from './runtime'
import { previewFellow } from './preview'

export async function currentUser() {
  if (isPreviewMode()) {
    const fellow = await previewFellow()
    return fellow ? { id: fellow.id, email: fellow.email } : null
  }
  if (!hasSupabaseConfiguration()) return null
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error ? null : user
}

export async function requireAuth() {
  const user = await currentUser()
  if (!user) redirect('/login')
  return user
}
