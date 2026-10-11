import 'server-only'
import { isPreviewMode } from './runtime'
import { previewFellow } from './preview'
import { getSupabaseServerClient } from './supabase/server'
export async function interestsFor(userId: string): Promise<string[]> {
  if (isPreviewMode()) return (await previewFellow())?.interests ?? []
  const db = await getSupabaseServerClient()
  const { data, error } = await db.from('fellows').select('interests').eq('id',userId).maybeSingle()
  if (error) throw new Error('Unable to load your interests.')
  return data?.interests ?? []
}
