import 'server-only'
import { getSupabaseServerClient } from './supabase/server'
import { isPreviewMode } from './runtime'
import { readPreview } from './preview'
import { reactionCounts } from './reactions'
import type { ReactionKind } from './reactions'
export async function reactionsFor(postId:string,userId?:string) {
 if(isPreviewMode()) {
  const reactions=readPreview().reactions.filter(row=>row.post_id===postId)
  const counts=reactionCounts(['celebrate','inspired','appreciate'].map(kind=>({kind,count:reactions.filter(row=>row.kind===kind).length})))
  return {counts,selected:reactions.filter(row=>row.user_id===userId).map(row=>row.kind)}
 }
 const db=await getSupabaseServerClient()
 const {data,error}=await db.from('reaction_counts').select('kind,count').eq('post_id',postId)
 if(error)throw new Error('Unable to load appreciation.')
 let selected:ReactionKind[]=[]
 if(userId) {
  const own=await db.from('post_reactions').select('kind').eq('post_id',postId).eq('user_id',userId)
  if(own.error)throw new Error('Unable to load your reaction.')
  selected=(own.data??[]).map(row=>row.kind as ReactionKind)
 }
 return {counts:reactionCounts(data??[]),selected}
}
