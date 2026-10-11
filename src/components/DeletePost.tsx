'use client'

import { useActionState } from 'react'
import { deletePost } from '@/app/(app)/deletion-actions'
import type { ActionState } from '@/types'

export function DeletePost({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deletePost.bind(null, postId), { status: 'idle' })
  return <form action={action}>
    <button type="submit" disabled={pending} title="Permanently delete this post, its introductions, reactions and attachment" className="min-h-11 rounded-lg border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)] disabled:opacity-50">{pending ? 'Deleting…' : 'Delete post'}</button>
    {state.status === 'error' && <p role="alert" className="mt-2 max-w-xs text-sm text-[var(--danger)]">{state.message}</p>}
  </form>
}
