import { LinkIcon } from './LinkIcon'
import type { ReactNode } from 'react'
import { shareDestination } from '@/lib/share-destination'
import type { ShareTarget } from '@/lib/share-destination'
import { readWebsitePreview } from '@/lib/website-preview'
import { WebsitePreviewImage } from './WebsitePreviewImage'
import { PostAttachment } from './PostAttachment'
import { PostResources } from './PostResources'

type StoryPost = { id:string; title:string; outcome_url?:string|null; link_preview?:unknown; attachment?:unknown; share_target?:ShareTarget|null }

// The selected resource is the visual half of the post, not a card appended
// beneath its story. Author preview and published pages share this composition.
export function PostStory({post,attachmentUrl,children}:{post:StoryPost;attachmentUrl?:string;children:ReactNode}) {
 const target=shareDestination(post)
 const snapshot=readWebsitePreview(post.link_preview,post.outcome_url)
 const visual=target.kind==='website' ? <a className="post-story-website" href={target.url} target="_blank" rel="noopener noreferrer">
  {snapshot ? <WebsitePreviewImage image={snapshot.image} title={snapshot.title}/> : <div className="post-story-placeholder"><LinkIcon external /><p>{post.title}</p><span>Website image unavailable</span></div>}
  <div className="post-story-source"><span>{new URL(target.url).hostname.replace(/^www\./,'')}</span><strong>Visit website <LinkIcon external /></strong></div>
 </a> : target.kind==='attachment' ? <PostAttachment attachment={post.attachment} url={attachmentUrl}/> : null
 return <div className={`post-story${visual?' post-story-with-visual':''}`}>
  {visual&&<div className="post-story-visual">{visual}</div>}
  <div className="post-story-body">{children}<PostResources post={post} attachmentUrl={attachmentUrl} secondaryOnly/></div>
 </div>
}
