'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isPreviewMode } from '@/lib/runtime'
import { PREVIEW_COOKIE } from '@/lib/preview'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function signOut() {
  if (isPreviewMode()) (await cookies()).delete(PREVIEW_COOKIE)
  else await (await getSupabaseServerClient()).auth.signOut()
  redirect('/login')
}
