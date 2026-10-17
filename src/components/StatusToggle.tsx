'use client'

import { SelectMenu } from './SelectMenu'

import { updatePostStatus } from '@/app/(app)/posts/actions'
import { postStates } from '@/lib/post-status'
import { useState, useTransition } from 'react'

export function StatusToggle({ postId, currentStatus, postType }: { postId: string; currentStatus: string; postType: string }) {
  const [selected, setSelected] = useState(currentStatus)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [pending, startTransition] = useTransition()
  const choices = postStates(postType)
  const id = `post-state-${postId}`

  function save() {
    setMessage('')
    startTransition(async () => {
      try {
        await updatePostStatus(postId, selected)
        setFailed(false)
        setMessage(postType === 'project' ? 'Project state successfully saved.' : 'Availability successfully saved.')
      } catch {
        setFailed(true)
        setMessage('We couldn’t save this change. Please try again.')
      }
    })
  }

  return <div className="space-y-2">
    <label htmlFor={id} className="block text-xs text-[var(--obsidian-muted)]">{postType === 'project' ? 'Project state' : 'Availability'}</label>
    <div className="flex flex-wrap gap-2">
      <SelectMenu id={id} label={postType === 'project' ? 'Project state' : 'Availability'} value={selected} disabled={pending} onChange={value => { setSelected(value); setMessage('') }} options={choices} />
      <button type="button" disabled={pending || selected === currentStatus} onClick={save} className="rounded-lg border border-[var(--border-control)] px-3 py-2 text-sm disabled:opacity-50">{pending ? 'Saving…' : 'Save state'}</button>
    </div>
    {message && <p role={failed ? 'alert' : 'status'} className="text-sm">{message}</p>}
  </div>
}
