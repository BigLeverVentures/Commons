import 'server-only'
import { getSupabaseServerClient } from './supabase/server'
import { isPreviewMode, hasSupabaseConfiguration } from './runtime'
import { readPreview } from './preview'
import { invitationsFor } from './invitations'
import type { Invitation, InvitationPost } from './invitations'
export async function loadInvitationPage({ page=1, compact=false, interests }: {page?:number;compact?:boolean;interests?:string[]} = {}): Promise<{invitations:Invitation[];more:boolean;now:number}> {
 const now=Date.now()
 const size=compact?120:24, offset=(page-1)*size
 if(isPreviewMode()) {
   const state=readPreview()
   let rows=invitationsFor(state.posts.map(post=>({...post,fellow:state.fellows.find(f=>f.id===post.user_id)??null})))
   if(interests)rows=rows.filter(item=>interests.includes(item.topic))
   return {now,invitations:rows.slice(offset,offset+size),more:rows.length>offset+size}
 }
 if(!hasSupabaseConfiguration())return {now,invitations:[],more:false}
 const db=await getSupabaseServerClient()
 let query=db.from(compact?'invitation_candidates':'invitation_rows').select('id,type,title,status,created_at,updated_at,topic,tags,participation,sharing,participation_published_at,sharing_published_at,confirmed_at,author_key,author_name,author_avatar_path,author_avatar_style,invitation_kind,invitation_published_at,resolved_topic')
 if(compact)query=query.lte('author_rank',4)
 if(interests?.length)query=query.in('resolved_topic',interests)
 else if(interests)return {now,invitations:[],more:false}
 const {data,error}=await query.order('invitation_published_at',{ascending:false}).order('id').order('invitation_kind').range(offset,offset+size)
 if(error)throw new Error('Unable to load current invitations.')
 const rows=data??[]
 const invitations=rows.slice(0,size).flatMap(row=>{
   const post:InvitationPost={...row,user_id:row.author_key,fellow:{name:row.author_name,avatar_path:row.author_avatar_path,avatar_style:row.author_avatar_style}}
   return invitationsFor([post]).filter(item=>item.id===`${row.id}:${row.invitation_kind}`)
 })
 return {now,invitations,more:rows.length>size}
}
