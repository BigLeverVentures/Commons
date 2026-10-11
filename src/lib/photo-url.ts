export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(path)) return path
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)) return null
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL
  return origin ? `${origin}/storage/v1/object/public/profile-photos/${path}` : null
}
