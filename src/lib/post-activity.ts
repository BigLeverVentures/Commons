type ActivityPost = { created_at: string; updated_at?: string | null; confirmed_at?: string | null }

/** Confirmations win ties because confirming a post also updates its timestamp. */
export function postActivity(post: ActivityPost): { label: string; date: string } {
  let result = { label: 'Published', date: post.created_at }
  if (post.updated_at && Date.parse(post.updated_at) > Date.parse(result.date)) result = { label: 'Updated', date: post.updated_at }
  if (post.confirmed_at && Date.parse(post.confirmed_at) >= Date.parse(result.date)) result = { label: 'Confirmed', date: post.confirmed_at }
  return result
}

export function comparePostActivity(a: ActivityPost & { id: string }, b: ActivityPost & { id: string }): number {
  return Date.parse(postActivity(b).date) - Date.parse(postActivity(a).date) || a.id.localeCompare(b.id)
}
