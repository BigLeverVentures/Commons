import type { ReactionKind } from '@/lib/reactions'

export function ReactionIcon({kind}:{kind:ReactionKind}) {
 return <span className={`reaction-icon reaction-icon-${kind}`} aria-hidden="true" />
}

/** Simplified Lucide bulb for the small action button; see docs/licenses/lucide.txt. */
export function ReactButtonIcon() {
 return <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
  <path d="M9 18h6M10 22h4" />
 </svg>
}
