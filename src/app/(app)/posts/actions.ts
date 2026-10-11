'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { stageAttachment, removeAttachment } from '@/lib/post-attachments'
import { randomUUID } from 'node:crypto'
import { validSubmissionId } from '@/lib/post-draft'
import { isPreviewMode } from '@/lib/runtime'
import { readPreview, changePreview } from '@/lib/preview'
import { validPostStatus } from '@/lib/post-status'
import { invitationFields } from '@/lib/invitations'
import { TOPICS } from '@/lib/topics'
import type { ActionState } from '@/types'
import { submittedWebsitePreview, retainedWebsitePreview } from '@/lib/website-preview'
import { normalizedBody, mentionField } from '@/lib/mentions'
import { validateMentions } from '@/lib/validate-mentions'
import { creditFields } from '@/lib/collaborator-credits'
import { validateCredits } from '@/lib/validate-credits'
import { selectedShareTarget, normalizeProjectLink, validProjectLink } from '@/lib/post-fields'

function text(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

const POST_TYPES = ['ask', 'offer', 'project'] as const

function sanitizeTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim().toLowerCase().slice(0, 30))
    .filter((t) => t.length > 0)
    .slice(0, 10)
}

export async function createPost(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()
  const submittedId = text(formData, 'submission_id')
  if (submittedId && !validSubmissionId(submittedId)) return {status:'error', message:'Please reopen the editor and try again.'}
  const id = submittedId || randomUUID()
  // A connection can drop after the insert succeeds. Retrying the same draft
  // returns its original post, rather than publishing another copy.
  if (isPreviewMode() && submittedId) {
    const existing = readPreview().posts.find(post => post.id === id)
    if (existing?.user_id === user.id) redirect(`/posts/${id}?saved=created`)
    if (existing) return {status:'error', message:'Please reopen the editor and try again.'}
  }
  const supabase = isPreviewMode() ? null : await getSupabaseServerClient()
  if (supabase && submittedId) {
    const lookup = await supabase.from('posts').select('id').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (lookup.error) return {status:'error', message:'We couldn’t check whether this post was saved. Please try again.'}
    if (lookup.data) redirect(`/posts/${id}?saved=created`)
  }

  const kind = text(formData, 'type')
  const built = kind === 'built'
  const type = built ? 'project' : kind
  const collaborationStatus = text(formData, 'collaboration_status') || 'closed'
  if (built && !validPostStatus(collaborationStatus)) return { status: 'error', message: 'Choose a valid project state.' }
  const outcome_url = normalizeProjectLink(text(formData, 'outcome_url'))
  const title = text(formData, 'title')
  const description = normalizedBody(formData.get('description'))
  const description_mentions=mentionField(formData,'description_mentions',description)
  if(!description_mentions)return {status:'error',message:'Please check the selected names in your description.'}
  const invitation = invitationFields(formData)
  if ('error' in invitation) return { status: 'error', message: invitation.error }
  const tagsRaw = (text(formData, 'tags')) ?? ''

  if (!POST_TYPES.includes(type as (typeof POST_TYPES)[number])) {
    return { status: 'error', message: 'Invalid post type.' }
  }
  if (!title || title.length > 120) {
    return { status: 'error', message: 'Title is required (max 120 characters).' }
  }
  if (!description.trim() || description.length > 2000) {
    return { status: 'error', message: 'Description is required (max 2000 characters).' }
  }

  const credit = creditFields(formData)
  if ('error' in credit) return { status:'error',message:credit.error }
  const collaborators=credit.names,collaborator_credits=credit.credits
  const tags = sanitizeTags(tagsRaw)
  const topic = text(formData, 'topic') || null
  if (topic && !TOPICS.some(t => t.id === topic)) return { status: 'error', message: 'Choose a valid topic.' }
  const is_public = true
  if (built && description.length > 1000) return { status: 'error', message: 'Tell the Built here story in up to 1,000 characters.' }
  if (!validProjectLink(outcome_url)) return { status: 'error', message: 'Use a complete http or https link.' }
  const link_preview = outcome_url ? submittedWebsitePreview(formData, outcome_url) : null
  const mentionError=await validateMentions(description_mentions)
  if(mentionError)return {status:'error',message:mentionError}
  const creditError=await validateCredits(collaborator_credits)
  if(creditError)return {status:'error',message:creditError}
  const upload = await stageAttachment(formData, user.id)
  if ('error' in upload) return { status: 'error', message: upload.error }
  const attachment = upload.attachment
  const share_target = selectedShareTarget(formData.get('share_target'), outcome_url, attachment)
  const completion = built ? { outcome_summary: description, outcome_mentions: description_mentions, outcome_url: outcome_url || null, built_at: new Date().toISOString(), status: collaborationStatus } : { outcome_summary: null, outcome_mentions: [], outcome_url: outcome_url || null, built_at: null, status: 'open' }
  if (isPreviewMode()) {
    const now = new Date().toISOString()
    changePreview(state => state.posts.push({ id, user_id: user.id, type: type as (typeof POST_TYPES)[number], title, description, description_mentions, ...invitation, tags, topic, collaborators, collaborator_credits, link_preview, attachment, share_target, is_public, ...completion, participation_published_at: invitation.participation ? now : null, sharing_published_at: invitation.sharing ? now : null, confirmed_at: null, created_at: now, updated_at: now }))
    revalidatePath('/projects')
    revalidatePath('/projects/[id]', 'page')
    revalidatePath('/board')
    revalidatePath('/built')
    redirect(`/posts/${id}?saved=${built ? 'built' : 'created'}`)
  }

  if (!supabase) return {status:'error', message:'Failed to create post. Please try again.'}

  const { data, error } = await supabase
    .from('posts')
    .insert({ id, user_id: user.id, type, title, description, description_mentions, ...invitation, tags, topic, collaborators, collaborator_credits, link_preview, attachment, share_target, is_public, ...completion })
    .select('id')
    .single()

  if (error) {
    // Covers simultaneous retries and an insert whose response was lost.
    const existing = await supabase.from('posts').select('id,attachment').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (existing.data) {
      revalidatePath('/board')
      revalidatePath('/built')
      redirect(`/posts/${id}?saved=${built ? 'built' : 'created'}`)
    }
    // Even a successful lookup can precede a still-in-flight insert commit.
    // Keep the upload whenever the original write outcome is uncertain.
    return { status: 'error', message: 'Failed to create post. Please try again.' }
  }

  revalidatePath('/projects')
  revalidatePath('/projects/[id]', 'page')
  revalidatePath('/board')
  revalidatePath('/built')
  redirect(`/posts/${data.id}?saved=${built ? 'built' : 'created'}`)
}

export async function updatePost(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()

  const id = text(formData, 'id')
  const title = text(formData, 'title')
  const description = normalizedBody(formData.get('description'))
  const description_mentions=mentionField(formData,'description_mentions',description)
  if(!description_mentions)return {status:'error',message:'Please check the selected names in your description.'}
  const invitation = invitationFields(formData)
  if ('error' in invitation) return { status: 'error', message: invitation.error }
  const tagsRaw = (text(formData, 'tags')) ?? ''

  if (!title || title.length > 120) {
    return { status: 'error', message: 'Title is required (max 120 characters).' }
  }
  if (!description.trim() || description.length > 2000) {
    return { status: 'error', message: 'Description is required (max 2000 characters).' }
  }

  const credit = creditFields(formData)
  if ('error' in credit) return { status:'error',message:credit.error }
  const collaborators=credit.names,collaborator_credits=credit.credits
  const tags = sanitizeTags(tagsRaw)
  const topic = text(formData, 'topic') || null
  if (topic && !TOPICS.some(t => t.id === topic)) return { status: 'error', message: 'Choose a valid topic.' }
  const outcome_url = normalizeProjectLink(text(formData, 'outcome_url'))
  if (!validProjectLink(outcome_url)) return { status: 'error', message: 'Use a complete http or https link.' }
  let link_preview = outcome_url ? submittedWebsitePreview(formData, outcome_url) : null
  const is_public = true
  if (isPreviewMode()) {
    const prior=readPreview().posts.find(p=>p.id===id&&p.user_id===user.id)
    if(!prior)return {status:'error',message:'Post not found or you cannot edit it.'}
    link_preview = retainedWebsitePreview(formData, outcome_url, prior.link_preview)
    const built = !!prior.built_at || text(formData, 'type') === 'built'
    if (built && description.length > 1000) return {status:'error', message:'Tell the Built here story in up to 1,000 characters.'}
    const completion = built ? {outcome_summary:description, outcome_mentions:description_mentions, built_at:prior.built_at || new Date().toISOString()} : {}
    const mentionError=await validateMentions(description_mentions,prior.built_at ? prior.outcome_mentions : prior.description_mentions)
    if(mentionError)return {status:'error',message:mentionError}
    const creditError=await validateCredits(collaborator_credits,prior.collaborator_credits)
    if(creditError)return {status:'error',message:creditError}
    const upload = await stageAttachment(formData, user.id, prior.attachment)
    if ('error' in upload) return { status: 'error', message: upload.error }
    const updated = changePreview(state => {
      const post = state.posts.find(p => p.id === id && p.user_id === user.id)
      if (!post) return false
      const now = new Date().toISOString()
      if (invitation.participation && !post.participation_published_at) post.participation_published_at = now
      if (invitation.sharing && !post.sharing_published_at) post.sharing_published_at = now
      Object.assign(post, { title, description, description_mentions, ...completion, ...invitation, tags, topic, collaborators, collaborator_credits, outcome_url: outcome_url || null, link_preview, attachment: upload.attachment, share_target: selectedShareTarget(formData.get('share_target'), outcome_url, upload.attachment), is_public, updated_at: new Date().toISOString() })
      return true
    })
    if (!updated) return { status: 'error', message: 'Post not found or you cannot edit it.' }
    revalidatePath('/projects')
    revalidatePath('/projects/[id]', 'page')
    revalidatePath('/board')
    revalidatePath('/built')
    revalidatePath(`/posts/${id}`)
    redirect(`/posts/${id}?saved=updated`)
  }

  const supabase = await getSupabaseServerClient()

  const { data: existing, error: lookupError } = await supabase.from('posts').select('attachment,collaborator_credits,description_mentions,outcome_mentions,built_at,link_preview,updated_at').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (lookupError || !existing) return { status: 'error', message: 'Post not found or you cannot edit it.' }
  link_preview = retainedWebsitePreview(formData, outcome_url, existing.link_preview)
  const built = !!existing.built_at || text(formData, 'type') === 'built'
  if (built && description.length > 1000) return {status:'error', message:'Tell the Built here story in up to 1,000 characters.'}
  const completion = built ? {outcome_summary:description, outcome_mentions:description_mentions, built_at:existing.built_at || new Date().toISOString()} : {}
  const mentionError=await validateMentions(description_mentions,existing.built_at ? existing.outcome_mentions : existing.description_mentions)
  if(mentionError)return {status:'error',message:mentionError}
  const creditError=await validateCredits(collaborator_credits,existing.collaborator_credits)
  if(creditError)return {status:'error',message:creditError}
  const upload = await stageAttachment(formData, user.id, existing.attachment)
  if ('error' in upload) return { status: 'error', message: upload.error }

  const { data, error } = await supabase
    .from('posts')
    .update({ title, description, description_mentions, ...completion, ...invitation, tags, topic, collaborators, collaborator_credits, outcome_url: outcome_url || null, link_preview, attachment: upload.attachment, share_target: selectedShareTarget(formData.get('share_target'), outcome_url, upload.attachment), is_public })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('updated_at', existing.updated_at)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    // Only a completed, error-free CAS miss proves this write used no upload.
    // Transport errors may arrive before the database request finishes.
    if (!error && upload.uploadedPath) await removeAttachment(upload.uploadedPath)
    return { status: 'error', message: 'Your post could not be confirmed saved. Refresh to check the latest version before trying again.' }
  }

  // Database triggers retire replaced files transactionally; the cleanup job retries removal.
  revalidatePath('/projects')
  revalidatePath('/projects/[id]', 'page')
  revalidatePath('/board')
  revalidatePath('/built')
  revalidatePath(`/posts/${id}`)
  redirect(`/posts/${id}?saved=updated`)
}

export async function updatePostStatus(
  postId: string,
  newStatus: string
) {
  if (!validPostStatus(newStatus)) {
    throw new Error('Invalid status')
  }

  const user = await requireAuth()
  if (isPreviewMode()) {
    changePreview(state => {
      const post = state.posts.find(p => p.id === postId && p.user_id === user.id)
      if (!post) throw new Error('Post not found or you cannot edit it.')
      post.status = newStatus
      post.updated_at = new Date().toISOString()
    })
    revalidatePath('/projects')
    revalidatePath('/projects/[id]', 'page')
    revalidatePath('/board')
    revalidatePath('/built')
    revalidatePath(`/posts/${postId}`)
    return
  }

  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from('posts')
    .update({ status: newStatus })
    .eq('id', postId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    throw new Error('Failed to update status')
  }

  revalidatePath('/projects')
  revalidatePath('/projects/[id]', 'page')
  revalidatePath('/board')
  revalidatePath('/built')
  revalidatePath(`/posts/${postId}`)
}

export async function respondToPost(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()

  const postId = text(formData, 'post_id')
  const note = normalizedBody(formData.get('note'))
  const note_mentions=mentionField(formData,'note_mentions',note,10)
  if(!note_mentions)return {status:'error',message:'Please check the selected names in your note.'}

  if (!note.trim() || note.length > 500) {
    return { status: 'error', message: 'Note is required (max 500 characters).' }
  }

  const mentionError=await validateMentions(note_mentions)
  if(mentionError)return {status:'error',message:mentionError}
  if (isPreviewMode()) {
    const error = changePreview(state => {
      const post = state.posts.find(p => p.id === postId)
      if (!post || post.status !== 'open' || post.user_id === user.id) return 'This post is not open for your response.'
      if (state.responses.some(r => r.post_id === postId && r.user_id === user.id)) return 'You have already responded to this post.'
      state.responses.push({ id: randomUUID(), post_id: postId, user_id: user.id, note, note_mentions, created_at: new Date().toISOString() })
      return null
    })
    if (error) return { status: 'error', message: error }
    revalidatePath(`/posts/${postId}`)
    return { status: 'success', message: 'Your introduction is saved. The author can read it on this post. Replies arrive by email.' }
  }

  const supabase = await getSupabaseServerClient()

  const { error } = await supabase
    .from('responses')
    .insert({ post_id: postId, user_id: user.id, note, note_mentions })

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'You have already responded to this post.' }
    }
    return { status: 'error', message: 'Failed to respond. Please try again.' }
  }

  revalidatePath(`/posts/${postId}`)
  return { status: 'success', message: 'Your introduction is saved. The author can read it on this post. Replies arrive by email.' }
}

export async function confirmPostCurrent(postId: string): Promise<ActionState> {
  const user = await requireAuth()
  if (isPreviewMode()) {
    const found = changePreview(state => { const post=state.posts.find(p=>p.id===postId && p.user_id===user.id); if(!post)return false;post.confirmed_at=new Date().toISOString();return true })
    if(!found)return {status:'error',message:'You cannot confirm this post.'}
  } else {
    const db=await getSupabaseServerClient()
    const {data,error}=await db.from('posts').update({confirmed_at:new Date().toISOString()}).eq('id',postId).eq('user_id',user.id).select('id').maybeSingle()
    if(error||!data)return {status:'error',message:'We couldn’t save this confirmation.'}
  }
  revalidatePath('/board');revalidatePath(`/posts/${postId}`)
  return {status:'success',message:'Your invitation is confirmed as current.'}
}
