export type Candidate = { key: string; name: string; email: string; description: string; tags: string[]; source_url: string; source_label: string }
export type Suggestion = Omit<Candidate, 'email'> & { evidence: string[] }
const STOP = new Set(['with','that','this','from','have','will','would','could','your','their','looking','fellow','fellows','project','help','together','about','someone','want','some','first','small','need','into','make','working','work'])
function words(text: string): string[] { return [...new Set(text.toLowerCase().match(/[a-z]{4,}/g)?.filter(w => !STOP.has(w)) ?? [])] }

export function suggestConnections(post: { title: string; description: string; tags: string[] | null }, candidates: Candidate[], authorEmail: string): Suggestion[] {
  const requested = words(`${post.title} ${post.description} ${(post.tags ?? []).join(' ')}`)
  return candidates.filter(c => c.email.toLowerCase() !== authorEmail.toLowerCase()).map(candidate => {
    const available = new Set(words(`${candidate.description} ${candidate.tags.join(' ')}`))
    const evidence = requested.filter(word => available.has(word)).slice(0, 5)
    return { key: candidate.key, name: candidate.name, description: candidate.description, tags: candidate.tags, source_url: candidate.source_url, source_label: candidate.source_label, evidence }
  }).filter(c => c.evidence.length > 0).sort((a,b) => b.evidence.length - a.evidence.length || a.name.localeCompare(b.name)).slice(0, 3)
}
