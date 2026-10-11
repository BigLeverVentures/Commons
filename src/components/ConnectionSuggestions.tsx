import { LinkIcon } from '@/components/LinkIcon'
import { directoryDestination } from '@/lib/fellow-identity'
import type { Suggestion } from '@/lib/matching'

function sourceDestination(value: string): string | null {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value
  return directoryDestination(value)
}

export function ConnectionSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
  if (!suggestions.length) return null
  return <section className="connection-suggestions"><p className="eyebrow">A few possible connections</p><h2>Someone to start a conversation with?</h2><p className="text-sm mt-3 mb-5 text-[var(--obsidian-muted)]">These are shared interests, not promises of availability. Explore their community profiles and posts to start a thoughtful conversation.</p><div className="grid sm:grid-cols-3 gap-3">{suggestions.map(s => {
    const source = sourceDestination(s.source_url)
    return <article key={s.key} className="rounded-2xl bg-[var(--surface)] border border-[var(--border-control)] p-4"><h3 className="font-semibold">{s.name}</h3><p className="text-sm mt-2">Shared interests: {s.evidence.join(', ')}.</p>{s.description && <p className="text-xs mt-3 text-[var(--obsidian-muted)]">{s.description.slice(0,180)}</p>}<p className="text-xs mt-3 text-[var(--obsidian-muted)]">{s.source_label}</p>{source && <a href={source} {...(source.startsWith('/') ? {} : {target:'_blank',rel:'noopener noreferrer'})} className="inline-block text-sm underline mt-4">View profile and posts <LinkIcon external={!source.startsWith('/')} /></a>}</article>
  })}</div></section>
}
