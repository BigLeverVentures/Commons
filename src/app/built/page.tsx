import { interestsFor } from '@/lib/fellow-presence'
import { currentUser } from '@/lib/auth'
import { loadPosts, loadPublicPosts } from '@/lib/board-data'
import { CommonsShell } from '@/components/CommonsShell'
import { TopicBoard } from '@/components/TopicBoard'

export default async function Page() {
  const user = await currentUser()
  const posts = user ? await loadPosts() : await loadPublicPosts()
  const interests = user ? await interestsFor(user.id) : []
  return <CommonsShell user={user} fullWidth><TopicBoard posts={posts} publicOnly={!user} interests={interests} builtOnly /></CommonsShell>
}
