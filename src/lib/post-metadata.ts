import { readWebsitePreview } from '@/lib/website-preview'
import type { Metadata } from 'next'
import type { PostWithFellow } from '@/types'

export function postMetadata(post: PostWithFellow | null): Metadata {
  if (!post) return { title: 'Project not found | Commons' }
  const title = `${post.title} | Commons`
  const description = (post.outcome_summary || post.description).slice(0, 200)
  const url = `https://commons.example.org/posts/${post.id}`
  const preview = readWebsitePreview(post.link_preview, post.outcome_url)
  const image = preview ? {url:preview.image,width:1280,height:800,alt:preview.title} : {url:`https://commons.example.org/api/share-image/${post.id}`,width:1200,height:630,alt:post.title}
  return { title, description, alternates:{canonical:url}, openGraph: { title, description, url, type: 'article', siteName: 'Commons', images:[image] }, twitter: { card:'summary_large_image', title, description, images:[image.url] } }
}
