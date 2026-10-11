import { COMMUNITY } from '@/config/community'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: `${COMMUNITY.name} terms of service` }

export default function TermsPage() {
  return <main className="policy-page page-inset">
    <Link href="/" className="wordmark">{COMMUNITY.wordmark}</Link>
    <article>
      <h1 className="type-title">{COMMUNITY.name} terms of service</h1>
      <p><strong>Operator review required.</strong> This is a template for {COMMUNITY.operatorName}. Before deployment, the operator must review and publish terms appropriate to its community, including an effective date, governing law, content permissions, moderation, liability, and dispute procedures.</p>
      <h2>Participation</h2>
      <p>Only admitted {COMMUNITY.memberPlural} can sign in and contribute. Use your own account, keep sign-in links private, and treat others with respect. Do not publish unlawful content, harass people, impersonate others, send spam, or attempt to access private information without permission.</p>
      <h2>Contributions and connections</h2>
      <p>You are responsible for your contributions and for having permission to share them. Published posts, attachments, and author profiles are publicly viewable. External resources have their own terms. Evaluate opportunities for yourself; arrangements between {COMMUNITY.memberPlural} are their responsibility.</p>
      <p>The operator must define the permission it needs to store, display, and deliver contributions, and explain how moderation, removal, and account access are handled.</p>
      <h2>Changes and requests</h2>
      <p>You can edit or delete your own posts. Profile deletion removes profile information and turns off optional emails; it does not delete the sign-in account, existing posts, introductions, or reactions. See the <Link href="/privacy">privacy policy</Link> for further details.</p>
      <p>Questions about these terms should go to <a href={`mailto:${COMMUNITY.supportEmail}`}>{COMMUNITY.supportEmail}</a>. The operator must configure this address before deployment.</p>
    </article>
    <nav className="policy-related" aria-label="Policy navigation"><Link href="/board">Back to board</Link><Link href="/privacy">Privacy policy</Link></nav>
  </main>
}
