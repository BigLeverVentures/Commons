import { SharePost } from '@/components/SharePost'
import { authorProfileHref } from '@/lib/author-profile-key'
import { postConnection } from '@/lib/post-connection'
import { MentionText } from '@/components/MentionText'
import { CollaboratorCredits } from '@/components/CollaboratorCredits'
import { postStatusLabel } from '@/lib/post-status'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { postMetadata } from '@/lib/post-metadata'
import { loadPublicPost, loadPublicProjects } from '@/lib/board-data'
import { PostStory } from '@/components/PostStory'
import { Outcome } from '@/components/Outcome'
export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return postMetadata(await loadPublicPost((await params).id))
}
export default async function PublicProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = (await loadPublicProjects()).find(p => p.id === id)
  if (!post) notFound()
  return <article className="detail-page"><Link href="/projects">← Public projects</Link><PostStory post={post}><p className="eyebrow mt-8">A fellowship project</p><h1>{post.title}</h1><p className="mt-3 text-sm text-[var(--obsidian-muted)]">{postStatusLabel(post.status, post.type)}</p><p className="whitespace-pre-wrap my-6"><MentionText text={post.description} references={post.description_mentions} /></p><p className="text-sm text-[var(--obsidian-muted)]">Shared by <Link href={authorProfileHref(post.user_id)} className="underline underline-offset-4">{post.fellow?.name || 'a community member'}</Link></p><CollaboratorCredits canonical={post.collaborator_credits} legacy={post.collaborators ?? []} /><Outcome post={post} /></PostStory><SharePost postId={id} title={post.title} sharing={post.sharing} website={post.outcome_url} attachment={post.attachment} target={post.share_target} /><div className="mt-5 rounded-2xl border border-[var(--border-control)] bg-[var(--surface)] p-5"><Link href={`/posts/${id}`} className="primary-button">{post.status === 'open' ? postConnection(post.type).action : 'View post and fellow details'}</Link><p className="mt-3 text-sm">Connect privately with the author on the board. Fellow sign-in is required to send a note.</p></div></article>
}
