import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Commons terms of service' }

export default function TermsPage() {
  return (
    <main className="policy-page page-inset">
      <Link href="/" className="wordmark">Commons</Link>
      <article>
        <h1 className="type-title">Commons terms of service</h1>
        <p>Last updated October 9, 2026.</p>
        <p>Commons is built and administered by Big Lever Ventures as a volunteer contribution to the fellowship. It is free to use. These terms apply when you use the Commons to browse, publish, react, or connect with fellows.</p>
        <h2>A commons for the fellowship</h2>
        <p>Participation is for verified members of the fellowship. Use your own account and keep sign-in links private. Treat other people with respect. Do not use the Commons for harassment, spam, impersonation, unlawful activity, or attempts to compromise the service or access someone else&#x27;s private information.</p>
        <h2>Your content stays yours</h2>
        <p>You retain ownership of the posts, profile information, and files you contribute. Share only material you have the right to share, and obtain permission before disclosing someone else&#x27;s confidential or personal information.</p>
        <p>You give Big Lever Ventures permission to store, display, transmit, and process your content as needed to operate the Commons, including displaying public posts and delivering private introductions. This permission does not transfer ownership or authorize unrelated marketing use.</p>
        <p>Published posts, attachments, and author profiles may be viewed without signing in. Private introductions are shared with the sender and post author. See the <Link href="/privacy">privacy policy</Link> for details. Deleting content from the site cannot recall emails, downloads, or copies already received by other people.</p>
        <h2>Your choices</h2>
        <p>You can edit or permanently delete your own posts. You can delete your profile by typing DELETE to confirm. Deleting your profile clears its information and photo and turns off optional emails; it does not delete your sign-in account, existing posts, private introductions, or reactions. You can create a new profile later. For other personal-information requests, contact <a href="mailto:support@commons.example.org">support@commons.example.org</a>.</p>
        <h2>Fellow content and external resources</h2>
        <p>Fellows are responsible for their own contributions. Big Lever Ventures does not endorse or guarantee a post, project, offer, introduction, or linked resource. External websites and services have their own terms and privacy practices. Evaluate advice, opportunities, and resources for yourself before relying on them. Arrangements made between fellows are their responsibility.</p>
        <h2>As is and as available</h2>
        <p>To the fullest extent permitted by applicable law, Commons and its content are provided “as is,” “where is,” and “as available,” without warranties or representations of any kind, express or implied. This includes implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not promise uninterrupted availability, accuracy, suitability, freedom from errors, or a particular outcome.</p>
        <p>This is a volunteer service. Support and corrections are handled as capacity allows. Features may change, and the service may be interrupted or discontinued.</p>
        <h2>Responsibility and limits</h2>
        <p>To the fullest extent permitted by applicable law, Big Lever Ventures and those helping operate the Commons are not liable for indirect, incidental, special, consequential, or punitive losses arising from use of, or inability to use, the service, including loss of data, profits, or opportunities.</p>
        <p>Nothing in these terms excludes or limits rights, remedies, warranties, or liability that cannot lawfully be excluded or limited. Where a limitation is not permitted, it applies only to the extent the law allows.</p>
        <h2>Keeping the Commons useful</h2>
        <p>We may remove content or restrict access to address misuse, security concerns, or legal obligations. If you believe a decision was mistaken, contact support. These terms do not promise continuous moderation or a particular response time.</p>
        <h2>Privacy, changes, and contact</h2>
        <p>Our <Link href="/privacy">privacy policy</Link> explains how we use information to operate the Commons. If we materially change these terms, we will update the date and give notice on the site or by email before the changes take effect. Changes apply prospectively.</p>
        <p>For questions about these terms, contact <a href="mailto:support@commons.example.org">support@commons.example.org</a>.</p>
      </article>
      <nav className="policy-related" aria-label="Policy navigation"><Link href="/board">Back to board</Link><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of service</Link></nav>
    </main>
  )
}
