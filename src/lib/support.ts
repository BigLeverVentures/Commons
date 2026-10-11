import { COMMUNITY } from '@/config/community'
export function supportLink(postId:string) {
 const url=new URL(`mailto:${COMMUNITY.supportEmail}`)
 url.searchParams.set('subject',`${COMMUNITY.name}: correction or report`)
 url.searchParams.set('body',`Post: ${COMMUNITY.canonicalOrigin}/posts/${encodeURIComponent(postId)}\n\nPlease describe the correction, mistaken credit, or concern:\n`)
 return url.href
}
