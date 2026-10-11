import 'server-only'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { cookies } from 'next/headers'
import { isPreviewMode } from './runtime'
import { initialPreviewState, type PreviewState } from './preview-data'

export const PREVIEW_COOKIE = 'commons-preview-fellow'

function database() {
  if (!isPreviewMode()) throw new Error('Local preview is only available in development.')
  const folder = join(process.cwd(), '.preview')
  mkdirSync(folder, { recursive: true })
  const db = new DatabaseSync(join(folder, 'board.sqlite'))
  db.exec('PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)')
  db.prepare('INSERT OR IGNORE INTO state(id, data) VALUES (1, ?)').run(JSON.stringify(initialPreviewState()))
  return db
}

function normalize(state: PreviewState): PreviewState {
  state.reactions = state.reactions ?? []
  state.fellows = state.fellows.map(fellow => ({ ...fellow, email_notifications: fellow.email_notifications ?? true, introduction_emails: fellow.introduction_emails ?? fellow.email_notifications ?? true, avatar_path: fellow.avatar_path ?? null }))
  state.posts = state.posts.map(post => ({ ...post, link_preview: post.link_preview ?? null, collaborators: post.collaborators ?? [], is_public: post.is_public ?? (post.id === '20000000-0000-4000-8000-000000000001'), topic: post.topic ?? null, outcome_summary: post.outcome_summary ?? null, outcome_url: post.outcome_url ?? null, built_at: post.built_at ?? null }))
  return state
}

export function readPreview(): PreviewState {
  const db = database()
  try {
    const row = db.prepare('SELECT data FROM state WHERE id = 1').get() as { data: string }
    return normalize(JSON.parse(row.data) as PreviewState)
  } finally { db.close() }
}

export function changePreview<T>(change: (state: PreviewState) => T): T {
  const db = database()
  try {
    db.exec('BEGIN IMMEDIATE')
    const row = db.prepare('SELECT data FROM state WHERE id = 1').get() as { data: string }
    const state = normalize(JSON.parse(row.data) as PreviewState)
    const result = change(state)
    db.prepare('UPDATE state SET data = ? WHERE id = 1').run(JSON.stringify(state))
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally { db.close() }
}

export async function previewFellow() {
  if (!isPreviewMode()) return null
  const id = (await cookies()).get(PREVIEW_COOKIE)?.value
  return readPreview().fellows.find(fellow => fellow.id === id) ?? null
}

export function previewPost(id: string) {
  const state = readPreview()
  const post = state.posts.find(post => post.id === id)
  return post ? { ...post, fellow: state.fellows.find(fellow => fellow.id === post.user_id) ?? null } : null
}
