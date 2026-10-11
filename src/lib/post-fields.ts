export function normalizeProjectLink(raw: string): string {
  const link = raw.trim()
  if (!link) return ''
  if (link.startsWith('//')) return `https:${link}`
  if (/^[a-z][a-z0-9+.-]*:(?!\d+(?:[/?#]|$))/i.test(link)) return link
  return `https://${link}`
}

export function parseCollaborators(raw: string): string[] | null {
  if (raw.length > 4000) return null
  const names = raw.split(',').map(name => name.trim()).filter(Boolean)
  const unique = names.filter((name, index) => names.findIndex(other => other.toLowerCase() === name.toLowerCase()) === index)
  return unique.length <= 20 && unique.every(name => name.length <= 100) ? unique : null
}

export function validProjectLink(link: string): boolean {
  if (!link) return true
  try {
    const url = new URL(link)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && link.length <= 2000
  } catch { return false }
}

// Missing/removed resources fall back to the public post; never persist an arbitrary share URL.
export function selectedShareTarget(value: FormDataEntryValue | null, website: string, attachment: unknown): 'website' | 'attachment' | 'post' {
 if(value==='post')return 'post'
 if(value==='attachment')return attachment ? 'attachment' : 'post'
 return website ? 'website' : 'post'
}
