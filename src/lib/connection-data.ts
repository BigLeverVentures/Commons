import 'server-only'
import { requireAuth } from '@/lib/auth'
import { readPreview } from '@/lib/preview'
import { isPreviewMode } from '@/lib/runtime'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { loadPosts } from '@/lib/board-data'
import { suggestConnections, type Candidate } from '@/lib/matching'
import type { Fellow, Post } from '@/types'

export async function connectionsFor(post: Post) {
  const user = await requireAuth()
  if (post.user_id !== user.id) return []
  const admin = isPreviewMode() ? null : getSupabaseAdminClient()
  let candidates: Candidate[] = []
  if (admin) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await admin.from('directory_profiles').select('record_id,name,email,description,tags,source_url,imported_at').order('record_id').range(offset,offset + 499)
      if (error) throw new Error('Unable to load connection suggestions.')
      candidates.push(...(data ?? []).map(row => ({ key: row.record_id, name: row.name, email: row.email, description: row.description, tags: row.tags, source_url: row.source_url, source_label: `Directory snapshot · imported ${new Date(row.imported_at).toISOString().slice(0,10)}` })))
      if (!data || data.length < 500) break
    }
  }
  if (!candidates.length) {
    const fellows: Pick<Fellow, 'id' | 'name' | 'email' | 'bio'>[] = isPreviewMode() ? readPreview().fellows : []
    if (!isPreviewMode()) {
      const db = await getSupabaseServerClient()
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db.from('fellows').select('id,name,email,bio').order('id').range(offset, offset + 499)
        if (error) throw new Error('Unable to load connection suggestions.')
        fellows.push(...(data ?? []))
        if (!data || data.length < 500) break
      }
    }
    const posts = await loadPosts()
    candidates = fellows.filter(f => !!f.name).map(f => ({ key:f.id, name:f.name!, email:f.email, description:f.bio ?? '', tags:posts.filter(p => p.user_id === f.id && p.status === 'open').flatMap(p => p.tags ?? []), source_url:'/projects', source_label:'Fellow profile and open board posts' }))
  }
  return suggestConnections(post, candidates, user.email ?? '')
}
