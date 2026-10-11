import { validProjectLink } from './post-fields'
import { readAttachment, ATTACHMENT_BUCKET } from './attachment-fields'
export type ShareTarget = 'website' | 'attachment' | 'post'
export function shareDestination(post: {id:string;outcome_url?:string|null;attachment?:unknown;share_target?:ShareTarget|null}, base=process.env.NEXT_PUBLIC_SUPABASE_URL) {
 const file=readAttachment(post.attachment)
 const target=post.share_target ?? (post.outcome_url ? 'website' : 'post')
 if(target==='website' && post.outcome_url && validProjectLink(post.outcome_url)) return {kind:'website' as const,url:post.outcome_url,label:'Share website'}
 if(target==='attachment' && file && base) return {kind:'attachment' as const,url:`${base}/storage/v1/object/public/${ATTACHMENT_BUCKET}/${file.path}`,label:file.type==='application/pdf'?'Share report':'Share image'}
 return {kind:'post' as const,url:`https://commons.example.org/posts/${post.id}`,label:'Share post'}
}
