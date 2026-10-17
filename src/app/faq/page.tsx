import { COMMUNITY } from '@/config/community'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CommonsShell } from '@/components/CommonsShell'
import { currentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: `FAQ · ${COMMUNITY.name}`,
  description: `Quick answers about posting, profiles, interests, and recent activity in ${COMMUNITY.name}.`,
  alternates: { canonical: `${COMMUNITY.canonicalOrigin}/faq` },
}

export default async function Page() {
  const user = await currentUser()
  return <CommonsShell user={user}>
    <article className="faq-content">
      <h1 className="type-title">FAQ</h1>
      <section>
        <h2>Who can use {COMMUNITY.name}?</h2>
        <p>Anyone can browse. Admitted {COMMUNITY.memberPlural} can sign in to post, react, or send a private introduction. Use the email address approved by your community; contact <a href={`mailto:${COMMUNITY.supportEmail}`}>{COMMUNITY.supportEmail}</a> if you’re unsure.</p>
      </section>
      <section>
        <h2>How do I find what interests me?</h2>
        <p>Combine the topic menu with Everything, Projects, Asks, or Offers. My interests uses the topics you chose in your profile; search also matches post text and {COMMUNITY.memberSingular} names, with some tolerance for typos.</p>
      </section>
      <section>
        <h2>How do I post?</h2>
        <p>Choose <Link href="/posts/new">Start something</Link> to tell your story, ask {COMMUNITY.memberPlural} to get involved, or ask them to help share what you’re doing. Preview your post, then publish.</p>
        <p className="mt-2">Editing your post or choosing Still current brings it forward in the feed with its latest update or confirmation date.</p>
      </section>
      <section>
        <h2>How does my post appear in the scroll?</h2>
        <p>Open asks and offers appear automatically. For a project, add an invitation under How can {COMMUNITY.memberPlural} get involved? or Help {COMMUNITY.memberPlural} spread the word when posting or editing.</p>
      </section>
      <section>
        <h2>What if my post is no longer current?</h2>
        <p>Open your post to change its status. Include other states reveals posts outside the active board; Built here keeps completed stories available.</p>
      </section>
      <section>
        <h2>How do I set up my profile?</h2>
        <p>Open <Link href="/profile">Profile</Link> to add your bio, photo or an Open Peeps avatar by Pablo Stanley. Add up to three links to your work; {COMMUNITY.memberPlural} see these on your public profile when they click your name on a post. Choose Save profile when you’re ready.</p>
      </section>
      <section>
        <h2>What is public, and how do responses work?</h2>
        <p>Posts and author profiles are public. Responding sends a private introduction that the author can read on their post and receive by email; they get your email address to reply. Your discussion happens offline—there is no discussion thread on {COMMUNITY.name}.</p>
        <p className="mt-2">We don’t subscribe you to mailing lists or other services. Interests only personalize browsing; choose notification emails in <Link href="/profile">Profile</Link>. See our <Link href="/privacy">privacy policy</Link>.</p>
      </section>
      <section>
        <h2>Why am I signed in in one browser but not another?</h2>
        <p>Enter your registered email on Sign in, open the newest email, then press Sign in on the page that opens. Each browser keeps its own sign-in; open the link in the browser you want to use.</p>
      </section>
      <section>
        <h2>Still unclear, or missing a feature?</h2>
        <p>Email <a href={`mailto:${COMMUNITY.supportEmail}`}>{COMMUNITY.supportEmail}</a>. Questions, corrections, and feature requests are handled as capacity allows.</p>
      </section>
    </article>
  </CommonsShell>
}
