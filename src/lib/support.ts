export function supportLink(postId:string) {
 const url=new URL('mailto:support@commons.example.org')
 url.searchParams.set('subject','Commons: correction or report')
 url.searchParams.set('body',`Post: https://commons.example.org/posts/${encodeURIComponent(postId)}\n\nPlease describe the correction, mistaken credit, or concern:\n`)
 return url.href
}
