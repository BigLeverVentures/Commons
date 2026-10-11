'use server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isPreviewMode } from '@/lib/runtime'
import { changePreview, readPreview } from '@/lib/preview'
import { isReaction } from '@/lib/reactions'
import type { ReactionKind,ReactionActor } from '@/lib/reactions'
import type { ActionState } from '@/types'
export async function reactToPost(postId:string,kind:ReactionKind,remove=false):Promise<ActionState> {
 const user=await requireAuth()
 if(!isReaction(kind))return {status:'error',message:'Choose a reaction from the list.'}
 if(isPreviewMode()) {
  const error=changePreview(state=>{
   const post=state.posts.find(row=>row.id===postId)
   if(!post||post.user_id===user.id)return 'React to another person’s post.'
   state.reactions=state.reactions.filter(row=>!(row.post_id===postId&&row.user_id===user.id&&row.kind===kind))
   if(!remove)state.reactions.push({post_id:postId,user_id:user.id,kind,created_at:new Date().toISOString()})
   return null
  })
  if(error)return {status:'error',message:error}
 } else {
  const db=await getSupabaseServerClient()
  const result=remove?await db.from('post_reactions').delete().eq('post_id',postId).eq('user_id',user.id).eq('kind',kind):await db.from('post_reactions').upsert({post_id:postId,user_id:user.id,kind},{onConflict:'post_id,user_id,kind'})
  if(result.error)return {status:'error',message:'We couldn’t save your reaction. Please try again.'}
 }
 revalidatePath(`/posts/${postId}`);revalidatePath('/built')
 return {status:'success',message:remove?'Your reaction is removed.':'Your appreciation is saved.'}
}
export async function reactionActors(postId:string,page=1):Promise<{actors:ReactionActor[];more:boolean}> {
 await requireAuth()
 if(!Number.isInteger(page)||page<1||page>10000)throw new Error('Invalid reaction page.')
 const offset=(page-1)*50
 if(isPreviewMode()) {
  const state=readPreview(),rows=state.reactions.filter(row=>row.post_id===postId)
  return {actors:rows.slice(offset,offset+50).map(row=>{const fellow=state.fellows.find(f=>f.id===row.user_id);return {name:fellow?.name||'A member',avatarPath:fellow?.avatar_path??null,avatarStyle:fellow?.avatar_style??null,kind:row.kind}}),more:rows.length>offset+50}
 }
 const db=await getSupabaseServerClient()
 const {data,error}=await db.from('post_reactions').select('kind,fellow:fellows!post_reactions_user_id_fkey(name,avatar_path,avatar_style)').eq('post_id',postId).order('created_at').order('user_id').order('kind').range(offset,offset+50)
 if(error)throw new Error('Unable to load reactions.')
 const rows=data??[]
 return {actors:rows.slice(0,50).map(row=>{
  const related=row.fellow as unknown as {name:string|null;avatar_path:string|null;avatar_style:string|null}|{name:string|null;avatar_path:string|null;avatar_style:string|null}[]|null
  const fellow=Array.isArray(related)?related[0]:related
  return {name:fellow?.name||'A member',avatarPath:fellow?.avatar_path??null,avatarStyle:fellow?.avatar_style??null,kind:row.kind}
 }),more:rows.length>50}
}
