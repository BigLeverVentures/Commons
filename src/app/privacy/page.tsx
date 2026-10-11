import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Commons privacy policy' }

export default function PrivacyPage() {
  return (
    <main className="policy-page page-inset">
      <Link href="/" className="wordmark">Commons</Link>
      <article>
        <h1 className="type-title">Commons privacy policy</h1>
        <p>Last updated October 9, 2026.</p>
        <p>Commons is built and administered by Big Lever Ventures as a volunteer contribution to the fellowship. We use information to run the Commons and help fellows connect, share their work, and support one another. We do not sell personal information, use it for advertising, or add you to marketing lists.</p>
        <h2>Information we use</h2>
        <p>We store your sign-in email and account details; the profile information you choose to provide; posts, uploads, reactions, and private introductions; and your email preferences. Fellowship administrators may provide membership information so we can confirm who can participate and match fellow profiles. Our hosting and email services also process technical information needed to deliver and protect the service, such as network and delivery logs.</p>
        <p>We use this information to sign you in, display community content, connect fellows, deliver service emails, respect your preferences, provide support, and prevent misuse.</p>
        <h2>What other people can see</h2>
        <p>Published posts, their attachments, and author profile information can be viewed without signing in. Do not put confidential information in these public areas. Reactions may be associated with your identity for signed-in fellows.</p>
        <p>Private introductions are not public. They are available to their sender and the post author, and administrators may access them when needed to operate or support the service. When you send an introduction, your verified reply email is shared with its recipient so they can reply directly. Subsequent email conversations take place through your own email services.</p>
        <h2>Services that help run the Commons</h2>
        <p>We use Cloudflare for hosting, Supabase for accounts, database and file storage, and Resend for email delivery. Website URLs submitted for previews are sent to Microlink. Loading externally hosted preview images or following external links also involves the relevant service or website, whose privacy practices apply. These services may process information outside your country.</p>
        <p>We do not use advertising trackers. Necessary sign-in cookies keep you signed in; browser storage remembers appearance preferences and can help recover an unfinished post. You can clear this storage through your browser.</p>
        <h2>Your choices and deletion requests</h2>
        <p>You can edit or delete your own posts and delete your profile through the site, without an administrator acting for you. Post deletion is permanent. Profile deletion requires typing DELETE and removes your profile information and photo, while turning off optional emails. Files are removed from storage by an automatic cleanup process after the change is saved; temporary failures are retried. Minimal technical cleanup records are retained to prevent retired files from being restored. You can create a new profile later. Your sign-in account, existing posts, private introductions and reactions remain unless separately removed. You can also change optional email preferences. Sign-in and essential service messages remain necessary to operate your account.</p>
        <p>Contact <a href="mailto:support@commons.example.org">support@commons.example.org</a> to request access to, correction of, or deletion of your personal information. We may need to confirm your identity before acting. We will handle requests in accordance with applicable law.</p>
        <p>Anonymous aggregate information may remain where it cannot identify you. Deleting information from the Commons cannot remove copies already received by other people, such as delivered emails or downloaded documents. Limited records may need to remain for security, legal obligations, or provider backup processes.</p>
        <h2>Retention and protection</h2>
        <p>Account and community records have no automatic expiry. We retain them to operate the Commons unless they are removed or a deletion request is fulfilled. Closing or pausing a post does not delete it. Access controls restrict private records, and access is limited to people and services that need it to operate the Commons.</p>
        <h2>Contact and changes</h2>
        <p>For privacy questions or requests, email <a href="mailto:support@commons.example.org">support@commons.example.org</a>. We will update this policy if our practices change and show the revised date here.</p>
      </article>
      <nav className="policy-related" aria-label="Policy navigation"><Link href="/board">Back to board</Link><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of service</Link></nav>
    </main>
  )
}
