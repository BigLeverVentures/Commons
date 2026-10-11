import 'server-only'
import { getSupabaseServerClient } from './supabase/server'
import { isPreviewMode, hasSupabaseConfiguration } from './runtime'
import { readPreview } from './preview'
import { invitationsFor, compareInvitationActivity } from './invitations'
import type { Invitation, InvitationPost } from './invitations'

export async function loadInvitationPage({ page = 1, compact = false, interests }: { page?: number; compact?: boolean; interests?: string[] } = {}): Promise<{ invitations: Invitation[]; more: boolean; now: number }> {
  const now = Date.now()
  const rows: Invitation[] = []
  if (interests && !interests.length) return { now, invitations: [], more: false }
  if (isPreviewMode()) {
    const state = readPreview()
    rows.push(...invitationsFor(state.posts.map(post => ({ ...post, fellow: state.fellows.find(f => f.id === post.user_id) ?? null })), now))
  } else if (hasSupabaseConfiguration()) {
    const db = await getSupabaseServerClient()
    // Fetch every eligible public invitation. The compact view limits height, not membership.
    for (let offset = 0; ; offset += 500) {
      let query = db.from('invitation_rows').select('id,type,title,status,created_at,updated_at,topic,tags,participation,sharing,participation_published_at,sharing_published_at,confirmed_at,author_key,author_name,author_avatar_path,author_avatar_style,invitation_kind,invitation_published_at,resolved_topic')
      if (interests) query = query.in('resolved_topic', interests)
      const { data, error } = await query.order('invitation_published_at', { ascending: false }).order('id').order('invitation_kind').range(offset, offset + 499)
      if (error) throw new Error('Unable to load current invitations.')
      for (const row of data ?? []) {
        const post: InvitationPost = { ...row, user_id: row.author_key, fellow: { name: row.author_name, avatar_path: row.author_avatar_path, avatar_style: row.author_avatar_style } }
        rows.push(...invitationsFor([post], now).filter(item => item.id === `${row.id}:${row.invitation_kind}`))
      }
      if (!data || data.length < 500) break
    }
  }
  const ordered = rows.filter(item => !interests || interests.includes(item.topic)).sort(compareInvitationActivity)
  const offset = (Math.max(1, page) - 1) * 24
  return { now, invitations: compact ? ordered : ordered.slice(offset, offset + 24), more: !compact && ordered.length > offset + 24 }
}
