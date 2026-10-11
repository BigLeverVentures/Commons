export const TOPICS = [
  { id: 'planet', name: 'Planet & place', description: 'Regeneration, climate, and the places we call home.', tags: ['climate', 'ecology', 'restoration', 'regeneration', 'food', 'planet'], color: 'sage' },
  { id: 'enterprise', name: 'Enterprise & impact', description: 'Ideas, ventures, and resources for meaningful change.', tags: ['enterprise', 'funding', 'founders', 'investment', 'mentorship'], color: 'peach' },
  { id: 'learning', name: 'Learning & connection', description: 'Sharing knowledge and bringing people together.', tags: ['learning', 'education', 'community', 'introductions', 'connection'], color: 'blue' },
  { id: 'care', name: 'Care & wellbeing', description: 'Healthier people, stronger communities.', tags: ['health', 'care', 'wellbeing', 'design', 'inclusion'], color: 'lavender' },
  { id: 'technology', name: 'Tools & possibility', description: 'Technology that helps good ideas take shape.', tags: ['technology', 'software', 'ai', 'hardware', 'data'], color: 'yellow' },
  { id: 'open', name: 'Open possibilities', description: 'Something new, or an idea between worlds.', tags: [], color: 'sand' },
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
