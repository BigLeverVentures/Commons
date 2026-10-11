import type { Post } from '@/types'
export function Outcome({ post }: { post: Post }) {
  if (!post.built_at) return null
  return <p className="eyebrow mt-4">✨ Built here · {new Date(post.built_at).toLocaleDateString()}</p>
}
