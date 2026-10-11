import Link from 'next/link'
import { InvitationRow } from './InvitationRow'
import { selectInvitations } from '@/lib/invitations'
import type { Invitation } from '@/lib/invitations'

export function Happening({ invitations, now }: { invitations: Invitation[]; now: number }) {
  const chosen = selectInvitations(invitations, now, 5)
  return <section aria-labelledby="happening-title" className="happening">
    <h3 id="happening-title" className="type-card">Happening in the Commons</h3>
    {chosen.length ? <div className="invitation-grid">
      {chosen.map(item => <InvitationRow key={item.id} invitation={item} compactMobile />)}
    </div> : <div className="happening-empty text-sm text-[var(--obsidian-muted)]">
      <p>The next invitation could be yours. Add a way to get involved when you publish an ask, offer or project.</p>
      <Link href="/posts/new" className="mt-2 inline-block underline">Share an invitation →</Link>
    </div>}
  </section>
}
