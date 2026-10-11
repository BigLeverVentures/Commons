export const PHOTO_BUCKET = 'profile-photos'
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024

export async function preparePhoto(file: File): Promise<
  { bytes: Buffer; type: string; extension: string } | { error: string }
> {
  if (file.size > MAX_PHOTO_BYTES) return { error: 'Choose a photo smaller than 2 MB.' }
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const extension = extensions[file.type]
  if (!extension) return { error: 'Choose a JPEG, PNG, or WebP photo.' }
  const bytes = Buffer.from(await file.arrayBuffer())
  const valid = file.type === 'image/jpeg' ? bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : file.type === 'image/png' ? bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (!valid) return { error: 'This file is not a valid JPEG, PNG, or WebP photo.' }
  return { bytes, type: file.type, extension }
}
