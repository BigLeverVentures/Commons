'use client'

import { signOut } from '@/app/logout/actions'

export function SignOutButton() {
  return (
    <form action={signOut}><button
      type="submit"
      className="text-[var(--obsidian-muted)] hover:text-[var(--terracotta)]"
    >
      Sign out
    </button></form>
  )
}
