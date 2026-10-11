import { LinkIcon } from '@/components/LinkIcon'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { loadPublicFellow } from '@/lib/public-fellow'
import { CommonsShell } from '@/components/CommonsShell'
import { FellowAvatar } from '@/components/FellowAvatar'
import { FellowAbout } from '@/components/FellowAbout'
import { PostCard } from '@/components/PostCard'
export const dynamic = 'force-dynamic'

export default async function FellowPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const fellow = await loadPublicFellow(key)
  if (!fellow) notFound()
  const user = await currentUser()
  return <CommonsShell user={user}>
    <Link href="/board" className="text-sm underline underline-offset-4">← Back to the board</Link>
    <header className="mt-6 flex items-center gap-4"><FellowAvatar name={fellow.name} path={fellow.avatarPath} style={fellow.avatarStyle} size={80} /><div><p className="eyebrow">A fellow in the Commons</p><h1 className="type-title mt-2">{fellow.name}</h1></div></header>
    <FellowAbout name={fellow.name} bio={fellow.bio} links={fellow.links} />
    {fellow.directoryUrl && <p className="mt-4 text-sm"><a href={fellow.directoryUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Fellowship directory profile <LinkIcon external /></a><span className="ml-2 text-[var(--obsidian-muted)]">Separate directory sign-in required.</span></p>}
    <h2 className="type-section mb-4 mt-8">In the Commons</h2>
    <div className="grid gap-4 sm:grid-cols-2">{fellow.posts.map(post => <PostCard key={post.id} post={post} />)}</div>
  </CommonsShell>
}
