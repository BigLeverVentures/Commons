import { COMMUNITY } from '@/config/community'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: `${COMMUNITY.name} privacy policy` }

export default function PrivacyPage() {
  return <main className="policy-page page-inset">
    <Link href="/" className="wordmark">{COMMUNITY.wordmark}</Link>
    <article>
      <h1 className="type-title">{COMMUNITY.name} privacy policy</h1>
      <p><strong>Operator review required.</strong> This is a template for {COMMUNITY.operatorName}. Before deployment, the operator must replace this notice with its reviewed policy, effective date, service providers, retention periods, jurisdiction, and contact details.</p>
      <h2>Information and visibility</h2>
      <p>The application stores sign-in details, profiles, posts, uploads, reactions, private introductions, and email preferences. Published posts, attachments, and author profile information are publicly viewable. Do not put confidential information in public areas.</p>
      <p>Private introductions are available to their sender and the post author. An introduction shares the sender’s verified reply email with its recipient. Signed-in {COMMUNITY.memberPlural} can see reaction identities. The operator must explain administrative access and provider processing in its final policy.</p>
      <h2>Your choices</h2>
      <p>You can edit or delete your own posts and change optional email preferences. Deleting a profile removes its information and photo and turns off optional emails; the sign-in account, posts, introductions, and reactions remain unless separately removed. Delivered emails and downloaded files may remain with their recipients.</p>
      <h2>Operator responsibilities</h2>
      <p>{COMMUNITY.operatorName} must describe its actual hosting, account, storage, email, preview, cookie, security, retention, and data-request practices. This template makes no promises about advertising, data sales, legal compliance, or provider locations.</p>
      <p>For privacy questions, contact <a href={`mailto:${COMMUNITY.supportEmail}`}>{COMMUNITY.supportEmail}</a>. The operator must configure this address before accepting requests.</p>
    </article>
    <nav className="policy-related" aria-label="Policy navigation"><Link href="/board">Back to board</Link><Link href="/terms">Terms of service</Link></nav>
  </main>
}
