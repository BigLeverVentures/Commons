'use client'
import { useRef, useState, useTransition } from 'react'
import { normalizeProjectLink } from '@/lib/post-fields'
import { readWebsitePreview } from '@/lib/website-preview'
import { captureWebsitePreview } from '@/lib/capture-website-preview'
import { ProjectLinkCard } from '@/components/ProjectLinkCard'
import type { Json } from '@/types/database.types'

export function WebsitePreviewField({ link = '', preview = null, label = 'Project website (optional)', onPendingChange, onLinkChange }: { link?: string; preview?: Json | null; label?: string; onPendingChange?: (pending: boolean) => void; onLinkChange?: (url:string)=>void }) {
  const [url, setUrl] = useState(link)
  const [snapshot, setSnapshot] = useState(readWebsitePreview(preview, link))
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const latestUrl = useRef(link)
  const current = snapshot?.url === normalizeProjectLink(url) ? snapshot : null

  function loadPreview() {
    if (pending) return
    const requested = normalizeProjectLink(url)
    setUrl(requested)
    latestUrl.current = requested
    onPendingChange?.(true)
    startTransition(async () => {
      try {
        const result = await captureWebsitePreview(requested)
        if (normalizeProjectLink(latestUrl.current) === requested) { if (result.preview) setSnapshot(result.preview); setMessage(result.message) }
      } catch {
        if (normalizeProjectLink(latestUrl.current) === requested) setMessage('We couldn’t fetch a preview right now. You can still publish your story.')
      } finally { onPendingChange?.(false) }
    })
  }

  return <div className="space-y-3">
    <label htmlFor="outcome_url" className="block text-sm font-medium">{label}</label>
    <div className="flex flex-wrap gap-2">
      <input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" id="outcome_url" name="website_url_draft" maxLength={2000} value={url} onChange={event => { setUrl(event.target.value); onLinkChange?.(event.target.value); latestUrl.current = event.target.value; setMessage('') }} onBlur={() => { const normalized = normalizeProjectLink(url); setUrl(normalized); latestUrl.current = normalized }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); loadPreview() } }} placeholder="project.example.org or https://…" className="min-w-0 flex-1 rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-3 py-2 text-sm" />
      <button type="button" disabled={pending || !url.trim()} onClick={loadPreview} className="rounded-lg border border-[var(--pounamu)]/30 bg-[var(--surface)] px-4 py-2 text-sm font-medium disabled:opacity-50">{pending ? 'Capturing the website…' : current ? 'Refresh preview' : 'Preview website'}</button>
    </div>
    <input type="hidden" name="outcome_url" value={normalizeProjectLink(url)} />
    <input type="hidden" name="link_preview" value={current ? JSON.stringify(current) : ''} />
    <p className="text-xs text-[var(--obsidian-muted)]">Enter a domain or a full URL — we’ll add https:// when needed. Give people a glimpse of your work. We’ll use its social preview image when available, with a website capture as a fallback.</p>
    {message && <p role="status" className="text-sm text-[var(--obsidian-muted)]">{message}</p>}
    {current && <ProjectLinkCard title={current.title} link={current.url} preview={current} />}
  </div>
}
