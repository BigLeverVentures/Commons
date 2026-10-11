import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { loadPost } from '@/lib/board-data'
import { PostForm } from '@/components/PostForm'

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAuth()
  const post = await loadPost(id)

  if (!post) notFound()

  // Only author can edit
  if (post.user_id !== user.id) redirect(`/posts/${id}`)

  return (
    <div>
      <Link
        href={`/posts/${id}`}
        className="text-sm text-[var(--obsidian-muted)] hover:text-[var(--obsidian)] mb-4 inline-block"
      >
        &larr; Back to post
      </Link>
      <h1 className="type-title mb-6">Edit post</h1>
      <PostForm userId={user.id} author={post.fellow ?? {name:null}} post={post} />
    </div>
  )
}
