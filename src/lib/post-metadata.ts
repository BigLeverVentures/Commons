import { COMMUNITY } from '@/config/community'
import { readWebsitePreview } from '@/lib/website-preview'
import type { Metadata } from 'next'
import type { PostWithFellow } from '@/types'

export function postMetadata(post: PostWithFellow | null): Metadata {
  if (!post) return { title: `Project not found | ${COMMUNITY.name}` }
  const title = `${post.title} | ${COMMUNITY.name}`
  const description = (post.outcome_summary || post.description).slice(0, 200)
  const url = `${COMMUNITY.canonicalOrigin}/posts/${post.id}`
  const preview = readWebsitePreview(post.link_preview, post.outcome_url)
  const image = preview ? {url:preview.image,width:1280,height:800,alt:preview.title} : {url:`${COMMUNITY.canonicalOrigin}/api/share-image/${post.id}`,width:1200,height:630,alt:post.title}
  return { title, description, alternates:{canonical:url}, openGraph: { title, description, url, type: 'article', siteName: COMMUNITY.name, images:[image] }, twitter: { card:'summary_large_image', title, description, images:[image.url] } }
}
