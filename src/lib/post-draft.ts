// Only post-editor fields belong in a draft; never serialize files or credentials.
export const DRAFT_FIELDS = [
  'type', 'title', 'description', 'description_mentions', 'tags', 'topic',
  'collaboration_status', 'participation_enabled', 'participation_text',
  'participation_kind', 'participation_commitment', 'participation_deadline',
  'sharing_enabled', 'sharing_text', 'sharing_audience', 'sharing_message',
  'outcome_url', 'website_url_draft', 'link_preview', 'collaborator_credits', 'collaborator_names_draft',
  'remove_attachment', 'share_target',
] as const
export type PostDraft = { version: 1; updatedAt: number; submissionId: string; fields: Record<string, string>; attachmentName: string }
export function draftKey(userId: string, postId?: string) {
  return `commons:post-draft:${userId}:${postId ?? 'new'}`
}
export function snapshotDraft(form: FormData, submissionId: string): PostDraft {
  const fields: Record<string, string> = {}
  for (const key of DRAFT_FIELDS) {
    const value = form.get(key)
    fields[key] = typeof value === 'string' ? value : ''
  }
  const attachment = form.get('attachment')
  return { version: 1, updatedAt: Date.now(), submissionId, fields, attachmentName: attachment && typeof attachment === 'object' && 'name' in attachment ? String(attachment.name) : '' }
}
export function readDraft(raw: string | null, now = Date.now()): PostDraft | null {
  try {
    if (!raw || raw.length > 100_000) return null
    const draft = JSON.parse(raw)
    if (draft.version !== 1 || typeof draft.updatedAt !== 'number' || now - draft.updatedAt > 7 * 86400000 || draft.updatedAt > now + 60000 || !validSubmissionId(draft.submissionId) || !draft.fields || typeof draft.fields !== 'object' || typeof draft.attachmentName !== 'string') return null
    const fields: Record<string, string> = {}
    for (const key of DRAFT_FIELDS) {
      if (key === 'share_target' && draft.fields[key] === undefined) { fields[key] = ''; continue }
      if (typeof draft.fields[key] !== 'string') return null
      fields[key] = draft.fields[key]
    }
    return { version: 1, updatedAt: draft.updatedAt, submissionId: draft.submissionId, fields, attachmentName: draft.attachmentName }
  } catch { return null }
}
export function validSubmissionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
export function draftJson(value?: string) {
  try { return JSON.parse(value || 'null') } catch { return null }
}

export function hasDraftContent(draft: PostDraft) {
  return !!draft.attachmentName || ['title', 'description', 'tags', 'website_url_draft', 'participation_text', 'sharing_text', 'collaborator_names_draft'].some(key => !!draft.fields[key]) || !!(draft.fields.collaborator_credits && draft.fields.collaborator_credits !== '[]')
}
