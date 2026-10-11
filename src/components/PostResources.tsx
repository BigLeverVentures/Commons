import { ProjectLinkCard } from './ProjectLinkCard'
import { PostAttachment } from './PostAttachment'
import { shareDestination } from '@/lib/share-destination'
import type { ShareTarget } from '@/lib/share-destination'
export function PostResources({post,attachmentUrl,secondaryOnly=false}:{post:{id:string;title:string;outcome_url?:string|null;link_preview?:unknown;attachment?:unknown;share_target?:ShareTarget|null};attachmentUrl?:string;secondaryOnly?:boolean}) {
 const chosen=shareDestination(post)
 const website=<ProjectLinkCard title={post.title} link={post.outcome_url??null} preview={post.link_preview}/>
 const attachment=<PostAttachment attachment={post.attachment} url={attachmentUrl}/>
 if(secondaryOnly&&chosen.kind!=='post')return <div className="post-resources">{chosen.kind==='attachment'&&post.outcome_url&&<details className="secondary-resource"><summary>Also included: website</summary>{website}</details>}{chosen.kind==='website'&&!!post.attachment&&<details className="secondary-resource"><summary>Also included: attachment</summary>{attachment}</details>}</div>
 if(post.share_target==='post')return <div className="post-resources">{post.outcome_url&&<details className="secondary-resource"><summary>Also included: website</summary>{website}</details>}{!!post.attachment&&<details className="secondary-resource"><summary>Also included: attachment</summary>{attachment}</details>}</div>
 return <div className="post-resources">{chosen.kind==='attachment'?<>{attachment}{post.outcome_url&&<details className="secondary-resource"><summary>Also included: website</summary>{website}</details>}</>:<>{website}{!!post.attachment&&(chosen.kind==='post'||post.outcome_url?<details className="secondary-resource"><summary>Also included: attachment</summary>{attachment}</details>:attachment)}</>}</div>
}
