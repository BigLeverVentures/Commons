import type { Metadata } from 'next'
import { loadInvitationPage } from '@/lib/invitation-data'
import { interestsFor } from '@/lib/fellow-presence'
import { currentUser } from '@/lib/auth'
import { loadPosts, loadPublicPosts } from '@/lib/board-data'
import { CommonsShell } from '@/components/CommonsShell'
import { TopicBoard } from '@/components/TopicBoard'

export const metadata: Metadata = { alternates: { canonical: 'https://commons.example.org/' } }

export default async function Page() {
  const user = await currentUser()
  const posts = user ? await loadPosts() : await loadPublicPosts()
  const interests = user ? await interestsFor(user.id) : []
  const {invitations,now} = await loadInvitationPage({compact:true})
  return <CommonsShell user={user} fullWidth><TopicBoard posts={posts} invitations={invitations} interests={interests} now={now} publicOnly={!user} /></CommonsShell>
}
