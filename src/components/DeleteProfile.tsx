'use client'

import { useActionState, useState } from 'react'
import { deleteProfile } from '@/app/(app)/deletion-actions'
import type { ActionState } from '@/types'

export function DeleteProfile() {
  const [confirmation, setConfirmation] = useState('')
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteProfile, { status: 'idle' })
  return <section className="mt-10 rounded-xl border border-[var(--border-control)] p-4">
    <h2 className="type-card">Delete profile</h2>
    <p className="mt-2 text-sm">Permanently remove your name, photo, bio, links and profile settings. This cannot be undone. You can create a new profile later.</p>
    <p className="mt-2 text-sm text-[var(--muted)]">Your sign-in account, posts, private introductions and reactions remain. Delete any posts separately. Optional emails will be turned off.</p>
    <form action={action} className="mt-4 max-w-md space-y-3">
      <label htmlFor="delete-profile-confirmation" className="block text-sm">Type DELETE to confirm</label>
      <input id="delete-profile-confirmation" name="confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} disabled={pending} className="w-full rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-3 py-2" />
      <button type="submit" disabled={pending || confirmation !== 'DELETE'} className="min-h-11 rounded-lg border border-[var(--danger)] px-4 py-2 text-sm text-[var(--danger)] disabled:opacity-50">{pending ? 'Deleting profile…' : 'Delete profile'}</button>
      {state.status === 'error' && <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>}
    </form>
  </section>
}
