'use client'
import { postConnection } from '@/lib/post-connection'
import { MentionTextarea } from '@/components/MentionTextarea'

import { startTransition, useActionState, useState } from 'react'
import { respondToPost } from '@/app/(app)/posts/actions'
import type { ActionState } from '@/types'

export function ResponseForm({ postId, type }: { postId: string; type: string }) {
  const connection = postConnection(type)
  const [note, setNote] = useState('')
  const overLimit = note.length > 500
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    respondToPost,
    { status: 'idle' }
  )

  return (
    <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => formAction(data)) }} className="space-y-3">
      <input type="hidden" name="post_id" value={postId} />
      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-1">
          Your private note
        </label>
        <MentionTextarea showMentionHelp={false} name="note" value={note} onChange={setNote} limit={500} rows={3} placeholder={connection.prompt} />
      </div>

      <p id="introduction-help" className="text-xs text-[var(--obsidian-muted)]">Your note is private to you and the author. Your verified email is shared with them so they can reply directly. Replies arrive in your email inbox.</p>

      {state.status === 'success' && <p role="status" className="text-sm text-[var(--forest)]">{state.message}</p>}
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending || overLimit || state.status === 'success'}
        className="primary-button hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Sending private note…' : 'Send private note'}
      </button>
    </form>
  )
}
