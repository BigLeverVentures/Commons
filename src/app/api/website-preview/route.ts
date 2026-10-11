import { currentUser } from '@/lib/auth'
import { normalizeProjectLink } from '@/lib/post-fields'
import { canPreviewWebsite, fetchWebsitePreview } from '@/lib/website-preview'

const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request) {
  if (!await currentUser()) return Response.json({ preview: null, message: 'Please sign in again. Your draft is still here.' }, { status: 401, headers })
  if (request.headers.get('X-Commons-Preview') !== '1') return Response.json({ preview: null, message: 'Open Preview from the project form.' }, { status: 403, headers })
  const link = normalizeProjectLink(new URL(request.url).searchParams.get('url') ?? '')
  if (!canPreviewWebsite(link)) return Response.json({ preview: null, message: 'Enter a website address, such as project.example.org or https://project.example.org.' }, { status: 400, headers })
  const preview = await fetchWebsitePreview(link)
  return Response.json({ preview, message: preview ? 'Website preview ready.' : 'We couldn’t fetch a preview right now. Try again later, or publish your story with the website link.' }, { headers })
}
