'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isPreviewMode } from '@/lib/runtime'
import { changePreview } from '@/lib/preview'
import type { ActionState } from '@/types'

const clearedProfile = {
  name: null, cohort: null, location: null, bio: null,
  avatar_path: null, avatar_style: null, personal_links: [],
  interests: [], contribution_preferences: [],
  introduction_emails: false, email_notifications: false,
}

export async function deleteProfile(_previous: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAuth()
  if (form.get('confirmation') !== 'DELETE') return { status: 'error', message: 'Type DELETE to confirm.' }
  if (isPreviewMode()) {
    const found = changePreview(state => {
      const fellow = state.fellows.find(fellow => fellow.id === user.id)
      if (!fellow) return false
      Object.assign(fellow, clearedProfile, { updated_at: new Date().toISOString() })
      return true
    })
    if (!found) return { status: 'error', message: 'Your profile could not be found.' }
  } else {
    const db = await getSupabaseServerClient()
    const { data: fellow, error: readError } = await db.from('fellows').select('avatar_path,updated_at').eq('id', user.id).maybeSingle()
    if (readError || !fellow) return { status: 'error', message: 'Unable to load your profile. Try again.' }
    const { data, error } = await db.from('fellows').update(clearedProfile).eq('id', user.id).eq('updated_at', fellow.updated_at).select('id').maybeSingle()
    if (error || !data) return { status: 'error', message: 'Your profile could not be confirmed deleted. Refresh and try again.' }
  }
  revalidatePath('/', 'layout')
  redirect('/profile?deleted=1')
}

export async function deletePost(postId: string): Promise<ActionState> {
  const user = await requireAuth()
  if (!postId) return { status: 'error', message: 'Your post could not be found.' }
  if (isPreviewMode()) {
    const found = changePreview(state => {
      if (!state.posts.some(post => post.id === postId && post.user_id === user.id)) return false
      state.posts = state.posts.filter(post => post.id !== postId)
      state.responses = state.responses.filter(response => response.post_id !== postId)
      state.reactions = state.reactions.filter(reaction => reaction.post_id !== postId)
      return true
    })
    if (!found) return { status: 'error', message: 'You can only delete your own posts.' }
  } else {
    const db = await getSupabaseServerClient()
    const { data: post, error: readError } = await db.from('posts').select('id,attachment,updated_at').eq('id', postId).eq('user_id', user.id).maybeSingle()
    if (readError || !post) return { status: 'error', message: 'You can only delete your own posts. Refresh and try again.' }
    const { data, error } = await db.from('posts').delete().eq('id', postId).eq('user_id', user.id).eq('updated_at', post.updated_at).select('id').maybeSingle()
    if (error || !data) return { status: 'error', message: 'Your post could not be confirmed deleted. Refresh and try again.' }
  }
  revalidatePath('/', 'layout')
  redirect('/board')
}
