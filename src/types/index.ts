import type { Database } from './database.types'

type Tables = Database['public']['Tables']

export type Fellow = Tables['fellows']['Row']
export type Post = Tables['posts']['Row']

export type PostWithFellow = Post & {
  fellow: Pick<Fellow, 'name' | 'cohort' | 'avatar_path' | 'avatar_style'> | null
}

export type ResponseWithFellow = {
  id: string
  note_mentions?: import('../lib/mentions').FellowMention[]
  note: string
  created_at: string
  fellow: Pick<Fellow, 'name' | 'cohort' | 'avatar_path' | 'avatar_style' | 'email' | 'id'> | null
}

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
