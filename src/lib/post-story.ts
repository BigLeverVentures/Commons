import type { Post } from '@/types'

// Older Built here edits lived in outcome_summary. Read that latest story without
// rewriting stored originals; the next explicit edit saves both fields together.
export function withPostStory<T extends Pick<Post, 'built_at' | 'description' | 'description_mentions' | 'outcome_summary' | 'outcome_mentions'>>(post: T): T {
  return post.built_at && post.outcome_summary
    ? { ...post, description: post.outcome_summary, description_mentions: post.outcome_mentions ?? [] }
    : post
}
