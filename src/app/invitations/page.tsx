import { COMMUNITY } from '@/config/community'
import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { interestsFor } from '@/lib/fellow-presence'
import { loadInvitationPage } from '@/lib/invitation-data'
import { CommonsShell } from '@/components/CommonsShell'
import { InvitationRow } from '@/components/InvitationRow'
export default async function InvitationsPage({searchParams}:{searchParams:Promise<{page?:string;interests?:string}>}) {
 const user=await currentUser(),params=await searchParams
 const page=Math.min(10000,Math.max(1,Number.parseInt(params.page??'1',10)||1))
 const personal=!!user&&params.interests==='1'
 const interests=personal?await interestsFor(user.id):undefined
 const {invitations,more}=await loadInvitationPage({page,interests})
 const suffix=personal?'&interests=1':''
 return <CommonsShell user={user}><Link href="/board" className="text-sm underline">← Back to board</Link><header className="my-7"><p className="eyebrow">Find a way to participate</p><h1 className="type-title mt-2">Happening in {COMMUNITY.name}</h1><p className="mt-3 text-sm text-[var(--obsidian-muted)]">{personal?'Current invitations in your interests.':'Current asks, offers and requests to help spread the word.'} Recent activity appears first, including edits and confirmations. Dates show when an invitation was published, updated or confirmed.</p>{personal&&<Link href="/invitations" className="mt-3 inline-block text-sm underline">Explore across {COMMUNITY.name} →</Link>}</header>{invitations.length?<div className="invitation-grid">{invitations.map(item=><InvitationRow key={item.id} invitation={item}/>)}</div>:<p className="rounded-xl border border-dashed border-[var(--border-control)] p-5">{personal?'No current invitations match your interests on this page.':'No current invitations on this page.'}</p>}<nav aria-label="Invitation pages" className="mt-6 flex gap-6">{page>1&&<Link href={`/invitations?page=${page-1}${suffix}`} className="underline">Previous</Link>}{more&&<Link href={`/invitations?page=${page+1}${suffix}`} className="underline">Next</Link>}</nav></CommonsShell>
}
