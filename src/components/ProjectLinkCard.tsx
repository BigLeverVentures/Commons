import { LinkIcon } from './LinkIcon'
import { validProjectLink } from '@/lib/post-fields'
import { readWebsitePreview } from '@/lib/website-preview'
import { WebsitePreviewImage } from '@/components/WebsitePreviewImage'

export function ProjectLinkCard({ title, link, preview }: { title: string; link: string | null; preview?: unknown }) {
  if (!link || !validProjectLink(link)) return null
  const host = new URL(link).hostname.replace(/^www\./, '')
  const snapshot = readWebsitePreview(preview, link)
  return <a href={link} target="_blank" rel="noopener noreferrer" className="website-preview-card">
    {snapshot && <WebsitePreviewImage image={snapshot.image} title={snapshot.title} />}
    <div className="website-preview-copy"><p className="website-preview-domain">{host}<LinkIcon external /></p><h3>{snapshot?.title || title}</h3>{snapshot?.description && <p className="website-preview-description">{snapshot.description}</p>}<span className="website-preview-cta">Visit website <LinkIcon external /></span></div>
  </a>
}
