import { COMMUNITY } from '@/config/community'
import Link from 'next/link'
import { LinkIcon } from '@/components/LinkIcon'
import { personalLinks } from '@/lib/profile-presence'
export function FellowAbout({ name, bio, links, contributions, profileHref }: { profileHref?: string; name?: string; bio?: string | null; links?: unknown; contributions?: string[] }) {
  const destinations = personalLinks(links ?? []) ?? []
  if (!bio && !destinations.length && !contributions?.length) return null
  const heading = name ? `About ${name}` : `About the ${COMMUNITY.memberSingular}`
  return <section aria-label={heading} className="mt-4 rounded-xl border border-[var(--border-control)] bg-[var(--surface)] p-4 text-base">
    <h2 className="type-card mb-3">{profileHref ? <Link href={profileHref} className="underline underline-offset-4">{heading}</Link> : heading}</h2>
    {bio && <p className="whitespace-pre-wrap">{bio}</p>}
    {!!contributions?.length && <p className="mt-2 text-[var(--obsidian-muted)]">Happy to help with: {contributions.join(', ')}.</p>}
    {!!destinations.length && <div className="mt-3 flex flex-wrap gap-4">{destinations.map((link,index) => <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{link.label} <LinkIcon external /></a>)}</div>}
  </section>
}
