import { comparePostActivity } from './post-activity'
import { withPostStory } from '@/lib/post-story'
import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isPreviewMode } from '@/lib/runtime'
import { previewPost, readPreview } from '@/lib/preview'
import type { PostWithFellow, ResponseWithFellow } from '@/types'

export async function loadPosts(): Promise<PostWithFellow[]> {
  if (isPreviewMode()) {
    const state = readPreview()
    return state.posts.map(raw => { const post = withPostStory(raw); return ({ ...post, fellow: state.fellows.find(f => f.id === post.user_id) ?? null }) })
      .sort(comparePostActivity)
  }
  const db = await getSupabaseServerClient()
  const posts: PostWithFellow[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('posts').select('*, fellow:fellows!posts_user_id_fkey(name, cohort, avatar_path, avatar_style)')
      .order('created_at', { ascending: false }).order('id').range(offset, offset + 499)
    if (error) throw new Error('Unable to load the board. Please try again.')
    posts.push(...(data ?? []))
    if (!data || data.length < 500) return posts.map(withPostStory).sort(comparePostActivity)
  }
}

export async function loadPost(id: string) {
  if (isPreviewMode()) { const post = previewPost(id); return post ? withPostStory(post) : null }
  const db = await getSupabaseServerClient()
  const { data, error } = await db.from('posts').select('*, fellow:fellows!posts_user_id_fkey(name, cohort, avatar_path, avatar_style, email, bio, personal_links, contribution_preferences)').eq('id', id).maybeSingle()
  if (error) throw new Error('Unable to load this post.')
  return data ? withPostStory(data) : null
}

export async function loadResponses(id: string, userId: string, isAuthor: boolean): Promise<ResponseWithFellow[]> {
  if (isPreviewMode()) {
    const state = readPreview()
    return state.responses.filter(r => r.post_id === id && (isAuthor || r.user_id === userId))
      .map(r => ({ ...r, fellow: state.fellows.find(f => f.id === r.user_id) ?? null }))
  }
  const db = await getSupabaseServerClient()
  let query = db.from('responses').select('id, note, note_mentions, created_at, fellow:fellows!responses_user_id_fkey(id, name, cohort, avatar_path, avatar_style, email)').eq('post_id', id).order('created_at', { ascending: false })
  if (!isAuthor) query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw new Error('Unable to load responses.')
  return (data ?? []) as unknown as ResponseWithFellow[]
}

export async function loadPublicPosts(): Promise<PostWithFellow[]> {
  if (isPreviewMode()) {
    return (await loadPosts()).map(p => ({ ...p, user_id: p.user_id, fellow: { name: p.fellow?.name ?? null, cohort: null, avatar_path: p.fellow?.avatar_path ?? null, avatar_style: p.fellow?.avatar_style ?? null } }))
  }
  const { hasSupabaseConfiguration } = await import('@/lib/runtime')
  if (!hasSupabaseConfiguration()) return []
  const db = await getSupabaseServerClient()
  const posts: PostWithFellow[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('public_posts').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 499)
    if (error) throw new Error('Unable to load the board.')
    posts.push(...(data ?? []).map(p => ({ ...p, is_public: true, user_id: p.author_key, fellow: { name: p.author_name, cohort: null, avatar_path: p.author_avatar_path ?? null, avatar_style: p.author_avatar_style ?? null } })))
    if (!data || data.length < 500) return posts.map(withPostStory).sort(comparePostActivity)
  }
}

export async function loadPublicPost(id: string): Promise<PostWithFellow | null> {
  if (isPreviewMode()) return (await loadPublicPosts()).find(p => p.id === id) ?? null
  const { hasSupabaseConfiguration } = await import('@/lib/runtime')
  if (!hasSupabaseConfiguration()) return null
  const db = await getSupabaseServerClient()
  const { data, error } = await db.from('public_posts').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error('Unable to load this post.')
  return data ? withPostStory({ ...data, is_public: true, user_id: data.author_key, fellow: { name: data.author_name, cohort: null, avatar_path: data.author_avatar_path ?? null, avatar_style: data.author_avatar_style ?? null } }) : null
}

export async function loadPublicProjects(): Promise<PostWithFellow[]> {
  return (await loadPublicPosts()).filter(p => p.type === 'project')
}
