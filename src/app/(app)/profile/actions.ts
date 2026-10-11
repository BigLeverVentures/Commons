'use server'

import { randomUUID } from 'node:crypto'
import { PHOTO_BUCKET, preparePhoto } from '@/lib/profile-photos'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isPreviewMode } from '@/lib/runtime'
import { changePreview } from '@/lib/preview'
import type { ActionState } from '@/types'
import { TOPICS } from '@/lib/topics'
import { AVATARS, CONTRIBUTIONS, personalLinks } from '@/lib/profile-presence'
import { normalizeCohort } from '@/lib/cohorts'

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()

  const text = (key: string) => { const value = formData.get(key); return typeof value === 'string' ? value.trim() : '' }
  const interests = [...new Set(formData.getAll('interests'))]
  const contribution_preferences = [...new Set(formData.getAll('contribution_preferences'))]
  if (interests.some(value => typeof value !== 'string' || !TOPICS.some(topic => topic.id === value))) return { status: 'error', message: 'Choose interests from the topic list.' }
  if (contribution_preferences.some(value => typeof value !== 'string' || !CONTRIBUTIONS.includes(value as typeof CONTRIBUTIONS[number]))) return { status: 'error', message: 'Choose contributions from the list.' }
  const personal_links = personalLinks([0,1,2].map(index => ({label:text(`link_label_${index}`),url:text(`link_url_${index}`)})))
  if (!personal_links) return { status: 'error', message: 'Give each link a short label and complete HTTPS URL, without login credentials.' }
  const avatar_style = text('avatar_style') || null
  if (avatar_style && !AVATARS.includes(avatar_style as typeof AVATARS[number])) return { status: 'error', message: 'Choose an illustration from the list.' }
  const presence = { interests: interests as string[], contribution_preferences: contribution_preferences as string[], personal_links, avatar_style }
  const introduction_emails = formData.get('introduction_emails') === 'on'
  const email_notifications = formData.get('email_notifications') === 'on'
  const name = text('name')
  const cohort = normalizeCohort(text('cohort'))
  const location = text('location') || null
  const bio = text('bio') || null

  if (!name || name.length > 100) {
    return { status: 'error', message: 'Name is required (max 100 characters).' }
  }
  if (cohort === undefined) return { status: 'error', message: 'Choose a cohort from the list, or leave it unspecified.' }
  if (location && location.length > 100) {
    return { status: 'error', message: 'Location is too long (max 100 characters).' }
  }
  if (bio && bio.length > 300) {
    return { status: 'error', message: 'Bio is too long (max 300 characters).' }
  }

  const file = formData.get('photo')
  const removePhoto = formData.get('remove_photo') === 'on'
  const photo = file instanceof File && file.size > 0 ? await preparePhoto(file) : null
  if (photo && 'error' in photo) return { status: 'error', message: photo.error }
  if (photo && removePhoto) return { status: 'error', message: 'Choose a new photo or remove the current one, then save.' }

  if (isPreviewMode()) {
    changePreview(state => {
      const fellow = state.fellows.find(f => f.id === user.id)
      if (!fellow) throw new Error('Fellow not found')
      if (photo) fellow.avatar_path = `data:${photo.type};base64,${photo.bytes.toString('base64')}`
      else if (removePhoto) fellow.avatar_path = null
      Object.assign(fellow, { ...presence, name, cohort, location, bio, introduction_emails, email_notifications, updated_at: new Date().toISOString() })
    })
    revalidatePath('/', 'layout')
    return { status: 'success', message: 'Profile successfully saved.' }
  }

  const supabase = await getSupabaseServerClient()

  const { data: current, error: currentError } = await supabase.from('fellows').select('avatar_path,updated_at').eq('id', user.id).single()
  if (currentError || !current) return { status: 'error', message: 'Unable to load your profile. Please try again.' }
  const oldPath = current.avatar_path
  const newPath = photo ? `${user.id}/${randomUUID()}.${photo.extension}` : null
  const avatar_path = newPath ?? (removePhoto ? null : oldPath)
  const storage = supabase.storage.from(PHOTO_BUCKET)
  if (photo && newPath) {
    const { error } = await storage.upload(newPath, photo.bytes, { contentType: photo.type, upsert: false })
    if (error) return { status: 'error', message: 'Photo upload failed. Please try again.' }
  }

  const { data, error } = await supabase
    .from('fellows')
    .update({ ...presence, name, cohort, location, bio, introduction_emails, email_notifications, avatar_path })
    .eq('id', user.id)
    .eq('updated_at', current.updated_at)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    // A successful reread cannot rule out a still-in-flight write.
    if (!error && newPath) {
      try { await storage.remove([newPath]) } catch { /* Unused staged-file cleanup is best effort. */ }
    }
    return { status: 'error', message: 'Your profile could not be confirmed saved. Refresh to check the latest version before trying again.' }
  }

  // Replaced photos are retired transactionally and removed by the cleanup job.
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Profile successfully saved.' }
}
