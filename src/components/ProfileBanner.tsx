'use client'
import { COMMUNITY } from '@/config/community'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

const DISMISSED_KEY = 'commons-profile-banner-dismissed'

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function ProfileBanner() {
  const [dismissed, setDismissed] = useState(false)
  const savedDismissal = useSyncExternalStore(subscribe, readDismissed, () => true)

  if (dismissed || savedDismissal) return null

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // Dismissal still works for this visit when browser storage is unavailable.
    }
    setDismissed(true)
  }

  return (
    <div className="border-b border-[var(--forest)]/20 bg-[var(--forest)]/5 px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <p className="text-sm">
          Welcome! <Link href="/profile" className="font-medium text-[var(--forest)] underline">Add your name</Link> so other {COMMUNITY.memberPlural} know who you are.
        </p>
        <button
          onClick={handleDismiss}
          className="ml-4 text-sm text-[var(--obsidian-muted)] hover:text-[var(--obsidian)]"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
