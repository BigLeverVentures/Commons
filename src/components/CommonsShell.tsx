import { COMMUNITY } from '@/config/community'
import Link from 'next/link'
import { Nav } from './Nav'
import { ProfileBanner } from './ProfileBanner'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isPreviewMode } from '@/lib/runtime'
import { previewFellow } from '@/lib/preview'

export async function CommonsShell({ children, user, fullWidth = false }: { children: React.ReactNode; user: { id: string } | null; fullWidth?: boolean }) {
  const fellow = user ? (isPreviewMode() ? await previewFellow() : (await (await getSupabaseServerClient()).from('fellows').select('name, avatar_path, avatar_style').eq('id', user.id).single()).data) : null
  return <div>
    {user ? <Nav fellow={fellow} /> : <nav className="commons-nav border-b border-[var(--border)]"><div className="commons-nav-inner page-inset flex flex-wrap items-center justify-between">
      <Link href="/board" className="wordmark">{COMMUNITY.wordmark}</Link>
    </div></nav>}
    {isPreviewMode() && <div className="preview-strip">Local preview · fictional members and projects · changes stay on this computer</div>}
    {user && !fellow?.name && <ProfileBanner />}
    <main className={fullWidth ? "commons-board-main" : "commons-main page-inset"}>{children}</main>
  </div>
}
