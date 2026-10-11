import { COMMUNITY } from '@/config/community'

export const TOPICS = [
  { id: 'planet', ...COMMUNITY.topics.planet, tags: ['climate', 'ecology', 'restoration', 'regeneration', 'food', 'planet'], color: 'sage' },
  { id: 'enterprise', ...COMMUNITY.topics.enterprise, tags: ['enterprise', 'funding', 'founders', 'investment', 'mentorship'], color: 'peach' },
  { id: 'learning', ...COMMUNITY.topics.learning, tags: ['learning', 'education', 'community', 'introductions', 'connection'], color: 'blue' },
  { id: 'care', ...COMMUNITY.topics.care, tags: ['health', 'care', 'wellbeing', 'design', 'inclusion'], color: 'lavender' },
  { id: 'technology', ...COMMUNITY.topics.technology, tags: ['technology', 'software', 'ai', 'hardware', 'data'], color: 'yellow' },
  { id: 'open', ...COMMUNITY.topics.open, tags: [], color: 'sand' },
] as const

export function topicFor(tags: string[] | null, explicit?: string | null) {
  const chosen = TOPICS.find(t => t.id === explicit)
  if (chosen) return chosen
  const normalized = (tags ?? []).map(tag => tag.toLowerCase())
  return TOPICS.find(topic => topic.tags.some(tag => normalized.includes(tag))) ?? TOPICS[TOPICS.length - 1]
}

export function freshness(date: string, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - new Date(date).getTime()) / 86400000))
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : new Date(date).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
