import MiniSearch from 'minisearch'
import { topicFor } from './topics'
import type { PostWithFellow } from '../types'

function normalizeSearch(text: string) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\bstart[\s-]+up\b/g, 'startup')
}

/** Index only the public post fields already supplied to the board. */
export function createBoardSearch(posts: PostWithFellow[]) {
  const index = new MiniSearch({
    fields: ['title', 'description', 'tags', 'people', 'topic'],
    searchOptions: {
      combineWith: 'AND',
      prefix: true,
      fuzzy: term => term.length >= 5 ? 0.2 : false,
      maxFuzzy: 1,
      boost: { title: 4, people: 3, tags: 2, topic: 2 },
    },
  })
  index.addAll(posts.map(post => ({
    id: post.id,
    title: normalizeSearch(post.title),
    description: normalizeSearch(post.description),
    tags: normalizeSearch((post.tags ?? []).join(' ')),
    people: normalizeSearch([post.fellow?.name ?? '', ...(post.collaborators ?? [])].join(' ')),
    topic: normalizeSearch(topicFor(post.tags, post.topic).name),
  })))
  const byId = new Map(posts.map(post => [post.id, post]))
  return (query: string): PostWithFellow[] => {
    if (!query.trim()) return posts
    return index.search(normalizeSearch(query)).flatMap(result => {
      const post = byId.get(result.id)
      return post ? [post] : []
    })
  }
}
