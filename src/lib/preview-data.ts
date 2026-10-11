import type { ReactionKind } from './reactions'
import type { Fellow, Post } from '@/types'

export type PreviewResponse = { id: string; post_id: string; user_id: string; note_mentions?: import('./mentions').FellowMention[]; note: string; created_at: string }
export type PreviewReaction = {post_id:string;user_id:string;kind:ReactionKind;created_at:string}
export type PreviewState = { fellows: Fellow[]; posts: Post[]; responses: PreviewResponse[]; reactions:PreviewReaction[] }

export function initialPreviewState(): PreviewState {
  const now = new Date().toISOString()
  const fellows: Fellow[] = [
    { id: '10000000-0000-4000-8000-000000000001', email: 'alex@example.test', name: 'Alex Morgan', avatar_path: null, cohort: 'Cohort 4', location: 'Wellington', email_notifications: true, bio: 'Community partnerships and early-stage ventures.', created_at: now, updated_at: now },
    { id: '10000000-0000-4000-8000-000000000002', email: 'maya@example.test', name: 'Maya Chen', avatar_path: null, cohort: 'Cohort 6', location: 'Auckland', email_notifications: true, bio: 'Service design, learning, and community health.', created_at: now, updated_at: now },
    { id: '10000000-0000-4000-8000-000000000003', email: 'sam@example.test', name: 'Sam Patel', avatar_path: null, cohort: 'Cohort 3', location: 'Melbourne', email_notifications: true, bio: 'Field research, climate, and practical tools.', created_at: now, updated_at: now },
  ]
  const ideas = [
    ['project', 'A coastline worth restoring', 'A small coastal restoration pilot is taking shape. Looking for ecology experience and someone who loves bringing a community together.', 'climate,restoration', 0],
    ['ask', 'Take a sensor into the field', 'Our soil sensor works on the bench. Could you help us design a useful field trial with local growers?', 'ecology,hardware', 2],
    ['offer', 'A fresh pair of founder eyes', 'Two hours a month for a member working through an early venture. Happy to help with the first customer conversation or the next difficult decision.', 'founders,mentorship', 0],
    ['project', 'A community health toolkit', 'Making practical health information easier to use. Looking for a designer and a community partner to test a small first version.', 'health,design', 1],
    ['project', 'Learning across the Pacific', 'An exchange between educators who want to learn from each other. We are starting with one conversation, then seeing what grows.', 'education,learning', 1],
    ['offer', 'An introduction can change things', 'Working across Aotearoa and Australia? I can help with a few thoughtful introductions to people in community enterprise.', 'introductions,community', 2],
    ['ask', 'Make a useful tool, together', 'Seeking a member who enjoys small, purposeful software projects. We have an idea for a local sharing library and need help choosing the simplest approach.', 'software,technology', 0],
  ] as const
  const posts: Post[] = ideas.map(([type, title, description, tags, author], i) => ({
    id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    user_id: fellows[author].id, is_public: i === 0, topic: null, outcome_summary: null, outcome_url: null, built_at: null, type, title, description, link_preview: null, collaborators: [], tags: tags.split(','), status: 'open',
    created_at: new Date(Date.now() - i * 86400000).toISOString(), updated_at: now,
  }))
  return { fellows, posts, responses: [], reactions:[] }
}
