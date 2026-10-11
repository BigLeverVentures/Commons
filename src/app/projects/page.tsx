import { loadPublicProjects } from '@/lib/board-data'
import { TopicBoard } from '@/components/TopicBoard'
export const dynamic = 'force-dynamic'
export default async function PublicProjectsPage() {
  return <TopicBoard posts={await loadPublicProjects()} publicOnly />
}
