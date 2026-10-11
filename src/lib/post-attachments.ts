import { randomUUID } from 'node:crypto'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { preparePhoto } from '@/lib/profile-photos'
import { isPreviewMode } from '@/lib/runtime'
import type { Json } from '@/types/database.types'

import { ATTACHMENT_BUCKET, MAX_ATTACHMENT_BYTES, readAttachment } from '@/lib/attachment-fields'

export async function prepareAttachment(file: File) {
  if (file.size > MAX_ATTACHMENT_BYTES) return { error: 'Choose a PDF or image up to 2 MB.' }
  if (file.type === 'application/pdf') {
    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.length < 5 || bytes.toString('ascii', 0, 5) !== '%PDF-') return { error: 'This file is not a valid PDF.' }
    return { bytes, type: file.type, extension: 'pdf' }
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return { error: 'Choose a PDF, JPEG, PNG, or WebP file.' }
  return preparePhoto(file)
}

export async function stageAttachment(form: FormData, userId: string, existing: unknown = null): Promise<{ attachment: Json | null; uploadedPath: string | null } | { error: string }> {
  const file = form.get('attachment')
  const remove = form.get('remove_attachment') === 'on'
  const current = readAttachment(existing)
  if (!(file instanceof File) || !file.size) return { attachment: remove ? null : current as Json | null, uploadedPath: null }
  const prepared = await prepareAttachment(file)
  if ('error' in prepared) return prepared
  if (isPreviewMode()) return { error: 'File uploads need the connected backend. You can test links in this local preview.' }
  const path = `${userId}/${randomUUID()}.${prepared.extension}`
  const db = await getSupabaseServerClient()
  try {
    const { error } = await db.storage.from(ATTACHMENT_BUCKET).upload(path, prepared.bytes, { contentType: prepared.type, upsert: false })
    if (error) return { error: 'The attachment could not be uploaded. Please try again.' }
  } catch {
    return { error: 'The attachment could not be uploaded. Please try again.' }
  }
  return { attachment: { path, name: file.name.replace(/[\/\\\x00-\x1f]/g, '_').slice(0, 180) || 'Attachment', type: prepared.type, size: file.size }, uploadedPath: path }
}

export async function removeAttachment(path: string | null) {
  if (!path || isPreviewMode()) return
  try {
    const db = await getSupabaseServerClient()
    const { error } = await db.storage.from(ATTACHMENT_BUCKET).remove([path])
    if (error) console.error('Attachment cleanup failed', { code: error.name })
  } catch {
    console.error('Attachment cleanup could not finish')
  }
}
