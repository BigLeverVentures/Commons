import { loadPosts } from '@/lib/board-data'
import { StatsCard } from '@/components/StatsCard'

export default async function DashboardPage() {
  const posts = await loadPosts()
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const openAsks = posts.filter(p => p.type === 'ask' && p.status === 'open').length
  const openOffers = posts.filter(p => p.type === 'offer' && p.status === 'open').length
  const openProjects = posts.filter(p => p.type === 'project' && p.status === 'open').length
  const recent = posts.filter(p => p.created_at >= month)
  const postsThisMonth = recent.length
  const uniquePosters = new Set(recent.map(p => p.user_id)).size

  return (
    <div>
      <h1 className="type-title mb-6">Dashboard</h1>
      <p className="text-sm text-[var(--obsidian-muted)] mb-6">
        What&apos;s alive in the fellowship right now.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatsCard
          label="Open Asks"
          value={openAsks ?? 0}
          color="var(--terracotta)"
        />
        <StatsCard
          label="Open Offers"
          value={openOffers ?? 0}
          color="var(--forest)"
        />
        <StatsCard
          label="Open Projects"
          value={openProjects ?? 0}
          color="var(--pounamu)"
        />
        <StatsCard
          label="Posts This Month"
          value={postsThisMonth ?? 0}
        />
        <StatsCard
          label="Active Fellows"
          value={uniquePosters}
          subtitle="posted this month"
        />
      </div>
    </div>
  )
}
