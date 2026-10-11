import { fetchWebsitePreview, readWebsitePreview } from '@/lib/website-preview'
import type { WebsitePreview } from '@/lib/website-preview'

export type PreviewCapture = { preview: WebsitePreview | null; message: string }
const unavailable = 'Website image unavailable. Retry the preview, or publish with the website link.'

// Shared by the website field and the full post preview. Shared hosting may be
// refused by the provider, so retry the public capture from the author's browser.
export async function captureWebsitePreview(link: string, fetcher: typeof fetch = fetch): Promise<PreviewCapture> {
  try {
    const response = await fetcher(`/api/website-preview?${new URLSearchParams({ url: link })}`, {
      signal: AbortSignal.timeout(15000), cache: 'no-store', redirect: 'error', headers: { 'X-Commons-Preview': '1' },
    })
    const result = await response.json()
    if (!response.ok) return { preview: null, message: result.message || unavailable }
    const preview = readWebsitePreview(result.preview, link)
    if (preview) return { preview, message: 'Website preview ready.' }
  } catch { /* A bounded server attempt may time out before public capture completes. */ }
  const preview = await fetchWebsitePreview(link, fetcher)
  return { preview, message: preview ? 'Website preview ready.' : unavailable }
}
