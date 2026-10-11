import { validProjectLink } from '@/lib/post-fields'

export type WebsitePreview = { url: string; title: string; description: string; image: string }

export function canPreviewWebsite(link: string): boolean {
  if (!link || !validProjectLink(link)) return false
  const url = new URL(link)
  const host = url.hostname.toLowerCase()
  return /\.[a-z]{2,63}$/.test(host) && !/\.(localhost|local|internal|test|invalid|example)$/.test(host) && (!url.port || ['80', '443'].includes(url.port))
}

function safePreviewImage(image: unknown): image is string {
  if (typeof image !== 'string' || image.length > 2000) return false
  try {
    const url = new URL(image)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && canPreviewWebsite(image)
  } catch { return false }
}

export function readWebsitePreview(value: unknown, link?: string | null): WebsitePreview | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (typeof data.url !== 'string' || !canPreviewWebsite(data.url) || (link !== undefined && data.url !== link)) return null
  if (typeof data.title !== 'string' || !data.title || data.title.length > 180 || typeof data.description !== 'string' || data.description.length > 600 || !safePreviewImage(data.image)) return null
  return { url: data.url, title: data.title, description: data.description, image: data.image }
}

export function submittedWebsitePreview(form: FormData, link: string): WebsitePreview | null {
  const raw = form.get('link_preview')
  if (typeof raw !== 'string' || raw.length > 5000) return null
  try { return readWebsitePreview(JSON.parse(raw), link) } catch { return null }
}

// An omitted or failed recapture must not erase a valid image for the same URL.
export function retainedWebsitePreview(form: FormData, link: string, existing: unknown): WebsitePreview | null {
  return link ? submittedWebsitePreview(form, link) ?? readWebsitePreview(existing, link) : null
}

export async function fetchWebsitePreview(link: string, fetcher: typeof fetch = fetch, onFailure?: (reason: string) => void): Promise<WebsitePreview | null> {
  if (!canPreviewWebsite(link)) return null
  const endpoint = new URL('https://api.microlink.io')
  endpoint.searchParams.set('url', link)
  endpoint.searchParams.set('screenshot', 'true')
  try {
    const response = await fetcher(endpoint, { signal: AbortSignal.timeout(35000), redirect: 'manual', cache: 'no-store', credentials: 'omit' })
    if (!response.ok) { onFailure?.(`The preview service returned HTTP ${response.status}.`); return null }
    const raw = await response.text()
    if (raw.length > 100000) return null
    const result = JSON.parse(raw)
    if (result.status !== 'success') { onFailure?.('The preview service could not capture this website.'); return null }
    return readWebsitePreview({ url: link, title: String(result.data?.title || new URL(link).hostname).slice(0, 180), description: String(result.data?.description || '').slice(0, 600), image: safePreviewImage(result.data?.image?.url) ? result.data.image.url : result.data?.screenshot?.url }, link)
  } catch (error) { onFailure?.(error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 180) : 'Preview request failed.'); return null }
}
