export const ATTACHMENT_BUCKET = 'post-attachments'
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024
export type Attachment = { path: string; name: string; type: string; size: number }

export function readAttachment(value: unknown): Attachment | null {
  if (!value || typeof value !== 'object') return null
  const file = value as Attachment
  if (typeof file.path !== 'string' || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(file.path)) return null
  if (typeof file.name !== 'string' || !file.name || file.name.length > 180) return null
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return null
  if (!Number.isInteger(file.size) || file.size < 1 || file.size > MAX_ATTACHMENT_BYTES) return null
  return file
}

