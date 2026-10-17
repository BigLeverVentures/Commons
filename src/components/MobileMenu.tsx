'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOutButton } from './SignOutButton'

export function MobileMenu({ signedIn = true }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const links = signedIn ? [
    { href: '/board', label: 'Explore' },
    { href: '/posts/new', label: 'Start something' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/built', label: 'Built here' },
    { href: '/profile', label: 'Profile' },
  ] : [
    { href: '/board', label: 'Explore' },
    { href: '/built', label: 'Built here' },
  ]

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-3 text-[var(--obsidian)]"
        aria-label="Toggle menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <svg width="24" height="24" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M3 12h18M3 6h18M3 18h18" />
          )}
        </svg>
      </button>

      {open && (
        <div id="mobile-menu" className="absolute left-0 right-0 top-full border-b border-[var(--obsidian)]/10 bg-[var(--surface)] px-4 py-3">
          <div className="flex flex-col gap-3 text-sm">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={
                  pathname === href
                    ? 'text-[var(--pounamu)] font-medium'
                    : 'hover:text-[var(--pounamu)]'
                }
              >
                {label}
              </Link>
            ))}
            {signedIn ? <SignOutButton /> : <Link href="/login" className="guest-menu-sign-in" onClick={() => setOpen(false)}>Sign in</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
