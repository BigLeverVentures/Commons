import { DeletePost } from '@/components/DeletePost'
import { LinkIcon } from '@/components/LinkIcon'
import { ClearPostDraft } from '@/components/ClearPostDraft'
import { authorProfileHref } from '@/lib/author-profile-key'
import { postConnection } from '@/lib/post-connection'
import { MentionText } from '@/components/MentionText'
import { postStatusLabel } from '@/lib/post-status'
import { postMetadata } from '@/lib/post-metadata'
import { supportLink } from '@/lib/support'
import { CollaboratorCredits } from '@/components/CollaboratorCredits'
import { Reactions } from '@/components/Reactions'
import { reactionsFor } from '@/lib/reaction-data'
import { ConfirmCurrent } from '@/components/ConfirmCurrent'
import { FellowAbout } from '@/components/FellowAbout'
import { FellowAvatar } from '@/components/FellowAvatar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { loadPost, loadPublicPost, loadResponses } from '@/lib/board-data'
import { ResponseForm } from '@/components/ResponseForm'
import { connectionsFor } from '@/lib/connection-data'
import { ConnectionSuggestions } from '@/components/ConnectionSuggestions'
import { PostStory } from '@/components/PostStory'
import { Outcome } from '@/components/Outcome'
import { CommonsShell } from '@/components/CommonsShell'
import { StatusToggle } from '@/components/StatusToggle'
import type { ResponseWithFellow } from '@/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return postMetadata(await loadPublicPost((await params).id))
}

export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const { id } = await params
  const user = await currentUser()
  const post = user ? await loadPost(id) : await loadPublicPost(id)

  if (!post) notFound()

  const appreciation = await reactionsFor(id,user?.id)
  const isAuthor = !!user && post.user_id === user.id
  const saved = (await searchParams).saved
  const confirmation = saved === 'built' ? 'Your Built here project was successfully published.' : saved === 'created' ? 'Your post was successfully published.' : saved === 'updated' ? 'Your post was successfully saved.' : null
  const suggestions = isAuthor && post.status === 'open' ? await connectionsFor(post) : []
  const displayName = post.fellow?.name ?? 'A fellow'

  const responses: ResponseWithFellow[] = user ? await loadResponses(id, user.id, isAuthor) : []
  const hasResponded = !isAuthor && responses.length > 0

  const connection = postConnection(post.type)

  const typeColors: Record<string, string> = {
    ask: 'kind-ask',
    offer: 'kind-offer',
    project: 'kind-project',
  }

  return (
    <CommonsShell user={user}>
      {isAuthor && confirmation && user && <ClearPostDraft userId={user.id} postId={id} updatedAt={post.updated_at} />}
      <Link
        href="/board"
        className="text-sm text-[var(--obsidian-muted)] hover:text-[var(--obsidian)] mb-4 inline-block"
      >
        &larr; Back to board
      </Link>

      {isAuthor && confirmation && <p role="status" className="mb-4 rounded-lg bg-[var(--forest)]/10 p-4 text-sm text-[var(--forest)]">{confirmation}</p>}
      <div className="post-detail-card">
        <PostStory post={post}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <span className={`text-sm font-medium capitalize ${typeColors[post.type] ?? ''}`}>
              {post.type}
            </span>
            <span className="ml-2 text-sm text-[var(--obsidian-muted)]">{postStatusLabel(post.status, post.type)}</span>
            <h1 className="type-title mt-1">{post.title}</h1>
          </div>
          {isAuthor && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/posts/${id}/edit`}
                className="rounded-lg border border-[var(--obsidian)]/10 px-3 py-1.5 text-sm hover:bg-[var(--obsidian)]/5"
              >
                Edit post
              </Link>
              <StatusToggle postId={id} currentStatus={post.status} postType={post.type} />
              <DeletePost postId={id} />
            </div>
          )}
        </div>

        <Outcome post={post} />
        <p className="text-base whitespace-pre-wrap mb-4"><MentionText text={post.description} references={post.description_mentions} /></p>

        <CollaboratorCredits canonical={post.collaborator_credits} legacy={post.collaborators ?? []} />
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--limestone)] px-2 py-0.5 text-xs text-[var(--obsidian-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-[var(--obsidian-muted)]">
          <FellowAvatar name={displayName} path={post.fellow?.avatar_path} style={post.fellow?.avatar_style} />
          Posted by <Link href={authorProfileHref(post.user_id)} className="underline underline-offset-4">{displayName}</Link>
          {post.fellow?.cohort && ` · ${post.fellow.cohort}`}
          {' · '}
          {new Date(post.created_at).toLocaleDateString()}
          {post.updated_at !== post.created_at && ` · Updated ${new Date(post.updated_at).toLocaleDateString()}`}
        </div>
        </PostStory>
      </div>

      <Reactions title={post.title} sharing={post.sharing} website={post.outcome_url} attachment={post.attachment} target={post.share_target} postId={id} counts={appreciation.counts} selected={appreciation.selected} member={!!user} isAuthor={isAuthor} built={!!post.built_at} />
      {!isAuthor && (post.status === 'open' || hasResponded) && <section aria-label="Connect with this post" className="mt-5 rounded-2xl border border-[var(--pounamu)]/30 bg-[var(--surface)] p-5">
        <h2 className="type-card">{hasResponded ? 'Your connection' : connection.action}</h2>
      {post.participation && <section className="mt-4 rounded-xl bg-[var(--limestone)] p-5"><p className="eyebrow">How fellows can get involved</p><h2 className="type-card mt-2">{post.participation.text}</h2>{post.participation.commitment && <p className="mt-2 text-sm">Commitment: {post.participation.commitment}</p>}{post.participation.deadline && <p className="mt-2 text-sm">Deadline: {post.participation.deadline} (UTC)</p>}</section>}
      {/* Non-author view: respond form */}
      {user && !isAuthor && post.status === 'open' && !hasResponded && (
        <div className="mt-6">
          <ResponseForm postId={id} type={post.type} />
        </div>
      )}

      {user && !isAuthor && hasResponded && (
        <section className="mt-6 rounded-xl border border-[var(--border-control)] bg-[var(--surface)] p-4">
          <h2 className="type-label">Your private introduction</h2>
          {responses.map(response=><p key={response.id} className="my-3 whitespace-pre-wrap text-sm"><MentionText text={response.note} references={response.note_mentions}/></p>)}
          <p className="text-xs text-[var(--obsidian-muted)]">Saved and visible to the author. Replies arrive by email.</p>
        </section>
      )}
      {!user && <p className="mt-4 text-sm"><Link href="/login" className="primary-button">{post.status === 'open' ? `Sign in to ${connection.action.toLowerCase()}` : 'Fellow sign in'}</Link><span className="mt-3 block text-xs text-[var(--obsidian-muted)]">Private notes are visible only to you and the author. Replies arrive by email.</span></p>}
      </section>}
      {isAuthor && <ConfirmCurrent postId={id} />}
      {isAuthor && post.participation && <section className="mt-4 rounded-xl bg-[var(--limestone)] p-5"><p className="eyebrow">How fellows can get involved</p><h2 className="type-card mt-2">{post.participation.text}</h2>{post.participation.commitment && <p className="mt-2 text-sm">Commitment: {post.participation.commitment}</p>}{post.participation.deadline && <p className="mt-2 text-sm">Deadline: {post.participation.deadline} (UTC)</p>}</section>}

      {user && post.fellow && <FellowAbout profileHref={authorProfileHref(post.user_id)} name={post.fellow.name} bio={post.fellow.bio} links={post.fellow.personal_links} contributions={post.fellow.contribution_preferences} />}
      {isAuthor && post.status === 'open' && <ConnectionSuggestions suggestions={suggestions} />}
      {isAuthor && post.type === 'project' && <p className="mt-4 text-sm"><Link href={`/projects/${id}`} className="underline">Open your public project page <LinkIcon /></Link></p>}

      {/* Author view: show responses */}
      {isAuthor && (
        <div className="mt-6">
          <h2 className="type-card mb-3">
            Introductions ({responses.length})
          </h2>
          {responses.length === 0 ? (
            <p className="text-sm text-[var(--obsidian-muted)]">
              No introductions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {responses.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] p-4"
                >
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <FellowAvatar name={r.fellow?.name} path={r.fellow?.avatar_path} style={r.fellow?.avatar_style} />
                    {r.fellow ? <Link href={authorProfileHref(r.fellow.id)} className="font-medium underline underline-offset-4 hover:text-[var(--pounamu)]">
                      {r.fellow.name || 'Fellow'}
                    </Link> : <span className="font-medium">Fellow</span>}
                    {r.fellow?.cohort && (
                      <span className="text-[var(--obsidian-muted)]">
                        {r.fellow.cohort}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-2"><MentionText text={r.note} references={r.note_mentions} /></p>
                  <div className="flex items-center gap-2 text-xs text-[var(--obsidian-muted)]">
                    <a
                      href={`mailto:${r.fellow?.email}`}
                      className="text-[var(--pounamu)] hover:underline"
                    >
                      Reply by email <LinkIcon external />
                    </a>
                    <span>&middot;</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-5 text-xs text-[var(--obsidian-muted)]"><a href={supportLink(id)} className="underline">Request a correction or report a concern</a>. This opens an email draft; send it from your email app. Support is handled as capacity allows.</p>
    </CommonsShell>
  )
}
