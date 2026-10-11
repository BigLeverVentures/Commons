import Link from 'next/link'
import { SignOutButton } from './SignOutButton'
import { MobileMenu } from './MobileMenu'
import { FellowAvatar } from './FellowAvatar'

export function Nav({ fellow }: { fellow?: { name: string | null; avatar_path: string | null; avatar_style?: string | null } | null }) {
  return (
    <nav className="commons-nav sticky top-0 z-10 border-b border-[var(--obsidian)]/10 bg-[var(--surface)]">
      <div className="mx-auto flex commons-nav-inner page-inset items-center justify-between">
        <Link href="/board" className="wordmark">
          Commons
        </Link>

        <div className="flex items-center gap-3">
          {/* Desktop nav */}
          <div className="hidden lg:flex flex-wrap justify-end items-center gap-3 text-sm">
            <Link href="/board" className="hover:text-[var(--pounamu)]">
              Explore
            </Link>
            <Link href="/posts/new" className="hover:text-[var(--pounamu)]">
              Start something
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--pounamu)]">
              Dashboard
            </Link>
            <Link href="/profile" className="hover:text-[var(--pounamu)]">
              Profile
            </Link>
            <Link href="/built">Built here</Link>
            <SignOutButton />
          </div>

          {/* Mobile nav */}
          <Link href="/profile" className="nav-profile" aria-label={fellow?.name ? `Edit ${fellow.name}’s profile` : 'Edit your profile'}>
            <FellowAvatar name={fellow?.name} path={fellow?.avatar_path} style={fellow?.avatar_style} size={36} />
          </Link>
          <MobileMenu />
        </div>
      </div>
    </nav>
  )
}
