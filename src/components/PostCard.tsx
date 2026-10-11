import Link from 'next/link'
import { postStatusLabel } from '@/lib/post-status'
import { FellowAvatar } from '@/components/FellowAvatar'
import type { PostWithFellow } from '@/types'

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  ask: { bg: 'bg-[var(--type-ask)]/10', text: 'text-[var(--type-ask)]' },
  offer: { bg: 'bg-[var(--type-offer)]/10', text: 'text-[var(--type-offer)]' },
  project: { bg: 'bg-[var(--type-project)]/10', text: 'text-[var(--type-project)]' },
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

export function PostCard({ post }: { post: PostWithFellow }) {
  const style = TYPE_STYLES[post.type] ?? TYPE_STYLES.ask
  const displayName = post.fellow?.name ?? 'A fellow'

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] p-4 hover:border-[var(--pounamu)]/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style.bg} ${style.text}`}
            >
              {post.type}
            </span>
            <span className="text-xs text-[var(--obsidian-muted)]">{postStatusLabel(post.status, post.type)}</span>
          </div>
          <h2 className="type-card mb-1">{post.title}</h2>
          <p className="text-xs text-[var(--obsidian-muted)] line-clamp-2">
            {post.description}
          </p>
        </div>
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--limestone)] px-2 py-0.5 text-xs text-[var(--obsidian-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {!!post.collaborators?.length && <p className="mt-3 text-xs text-[var(--obsidian-muted)]">In collaboration with {post.collaborators.join(', ')}</p>}
      <div className="flex items-center gap-2 mt-3 text-xs text-[var(--obsidian-muted)]">
        <FellowAvatar name={displayName} path={post.fellow?.avatar_path} style={post.fellow?.avatar_style} />
        <span>{displayName}</span>
        {post.fellow?.cohort && (
          <>
            <span>&middot;</span>
            <span>{post.fellow.cohort}</span>
          </>
        )}
        <span>&middot;</span>
        <span>{timeAgo(post.created_at)}</span>
      </div>
    </Link>
  )
}
