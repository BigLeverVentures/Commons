import { COMMUNITY } from '@/config/community'
import { LinkIcon } from '@/components/LinkIcon'
import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from '@/components/LoginForm'
import { DirectoryHelp } from '@/components/DirectoryHelp'
import { isPreviewMode, hasSupabaseConfiguration } from '@/lib/runtime'
import { readPreview } from '@/lib/preview'

export default function LoginPage() {
  if (isPreviewMode()) return (
    <main className="login-surface">
      <Link href="/" className="wordmark">{COMMUNITY.wordmark}</Link>
      <div className="login-card">
        <p className="eyebrow">Local preview · fictional data</p>
        <h1>Come on in.</h1>
        <p>Try the board as a fictional {COMMUNITY.memberSingular}. Posts and responses stay on this machine.</p>
        <form action="/api/preview/login" method="post">
          <label htmlFor="fellow">Explore as</label>
          <select name="fellow" id="fellow">{readPreview().fellows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <button className="primary-button" type="submit">Enter the commons <LinkIcon /></button>
        </form>
        <DirectoryHelp />
        <Link href="/board" className="mt-4 inline-block py-2 text-sm underline underline-offset-4">Explore without signing in</Link>
      </div>
    </main>
  )
  if (!hasSupabaseConfiguration()) return (
    <main className="login-surface"><div className="login-card"><p className="eyebrow">{COMMUNITY.name}</p><h1>A little setup first.</h1><p>Configure the Supabase project to enable {COMMUNITY.memberSingular} access. For a local preview with fictional data, run <code>npm run preview</code>.</p></div></main>
  )
  return (
    <main className="fellow-login">
      <div className="fellow-login-panel page-inset">
        <h1 className="type-title text-center mb-2">
          {COMMUNITY.name} community board
        </h1>
        <p className="text-center text-[var(--obsidian-muted)] mb-8">
          Sign in with your registered email
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <DirectoryHelp />
        <Link href="/board" className="mt-4 inline-block py-2 text-sm underline underline-offset-4">Explore without signing in</Link>
      </div>
    </main>
  )
}
