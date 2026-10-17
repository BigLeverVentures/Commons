import { COMMUNITY } from '@/config/community'
import { postActivity } from './post-activity'
import { topicFor } from './topics'
export const INVITATION_KINDS = ['feedback','introduction','testing','mentoring','collaboration','offer','other'] as const
export type Participation = { text: string; kind: typeof INVITATION_KINDS[number]; commitment: string | null; deadline: string | null }
export type Sharing = { text: string; audience: string | null; message: string | null }
export type InvitationPost = {id:string;type:string;title:string;status:string;created_at:string;updated_at?:string|null;user_id?:string;topic?:string|null;tags:string[];participation?:Participation|null;sharing?:Sharing|null;participation_published_at?:string|null;sharing_published_at?:string|null;confirmed_at?:string|null;fellow:{name:string|null;avatar_path?:string|null;avatar_style?:string|null}|null}
export type Invitation = {postType?:string;id:string;postId:string;authorKey:string;author:string;avatarPath?:string|null;avatarStyle?:string|null;text:string;action:string;kind:'request'|'offer'|'share';topic:string;publishedAt:string;updatedAt?:string|null;confirmedAt:string|null;commitment:string|null;deadline:string|null}
const labels: Record<Participation['kind'],string> = {feedback:'Offer feedback',introduction:'Make an introduction',testing:'Take a look',mentoring:'Connect',collaboration:'Explore project',offer:'Explore offer',other:'Take a look'}
export function invitationFields(form: FormData): {participation:Participation|null;sharing:Sharing|null} | {error:string} {
  const text = (key:string) => {const value=form.get(key);return typeof value === 'string' ? value.trim() : ''}
  let participation:Participation|null=null,sharing:Sharing|null=null
  if (form.get('participation_enabled') === 'on') {
    const value=text('participation_text'),kind=text('participation_kind'),commitment=text('participation_commitment'),deadline=text('participation_deadline')
    if (!value || value.length>160) return {error:'Write your participation invitation in up to 160 characters.'}
    if (!INVITATION_KINDS.includes(kind as Participation['kind'])) return {error:'Choose how people can get involved.'}
    if (commitment.length>80) return {error:'Describe the commitment in up to 80 characters.'}
    if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || !Number.isFinite(Date.parse(`${deadline}T23:59:59.999Z`)) || new Date(`${deadline}T23:59:59.999Z`).toISOString().slice(0,10)!==deadline)) return {error:'Choose a valid deadline date.'}
    participation={text:value,kind:kind as Participation['kind'],commitment:commitment||null,deadline:deadline||null}
  }
  if (form.get('sharing_enabled') === 'on') {
    const value=text('sharing_text'),audience=text('sharing_audience'),message=text('sharing_message')
    if (!value || value.length>160) return {error:'Write your sharing invitation in up to 160 characters.'}
    if (audience.length>160 || message.length>500) return {error:'Use up to 160 characters for the audience and 500 for the suggested share message.'}
    sharing={text:value,audience:audience||null,message:message||null}
  }
  return {participation,sharing}
}
export function invitationsFor(posts:InvitationPost[], now=Date.now()): Invitation[] {
  return posts.flatMap(post=>{
    const topic=topicFor(post.tags,post.topic).id, author=post.fellow?.name || `A ${COMMUNITY.memberSingular}`
    const base={postType:post.type,postId:post.id,authorKey:post.user_id || `name:${author}`,author,avatarPath:post.fellow?.avatar_path,avatarStyle:post.fellow?.avatar_style,topic,updatedAt:post.updated_at,confirmedAt:post.confirmed_at ?? null}
    const result:Invitation[]=[]
    const contribution=post.participation
    if(post.status==='open' && (!contribution?.deadline || Date.parse(`${contribution.deadline}T23:59:59.999Z`)>=now)) {
      if(contribution) result.push({...base,id:`${post.id}:participation`,text:contribution.text,action:labels[contribution.kind] ?? 'Take a look',kind:post.type==='offer'?'offer':'request',publishedAt:post.participation_published_at || post.created_at,commitment:contribution.commitment,deadline:contribution.deadline})
      else if(['ask','offer'].includes(post.type)) result.push({...base,id:`${post.id}:legacy`,text:post.title,action:post.type==='offer'?'Explore offer':'Offer help',kind:post.type==='offer'?'offer':'request',publishedAt:post.created_at,commitment:null,deadline:null})
    }
    if(post.sharing) result.push({...base,id:`${post.id}:sharing`,text:post.sharing.text,action:'Help share',kind:'share',publishedAt:post.sharing_published_at || post.created_at,commitment:null,deadline:null})
    return result
  }).sort(compareInvitationActivity)
}
export function compareInvitationActivity(a: Invitation, b: Invitation): number {
  return Date.parse(invitationDate(b).date) - Date.parse(invitationDate(a).date) || a.id.localeCompare(b.id)
}

export function invitationDate(invitation: Invitation): { label: string; date: string } {
  return postActivity({ created_at: invitation.publishedAt, updated_at: invitation.updatedAt, confirmed_at: invitation.confirmedAt })
}
