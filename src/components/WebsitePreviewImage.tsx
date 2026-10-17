'use client'
import { LinkIcon } from './LinkIcon'
import Image from 'next/image'
import { useState } from 'react'

export function WebsitePreviewImage({ image, title }: { image: string; title: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  return <div className="website-preview-image">{failed !== image
    ? <Image src={image} alt={`Website preview of ${title}`} width={1200} height={600} unoptimized onError={() => setFailed(image)} />
    : <div className="website-preview-fallback"><LinkIcon external /><p>{title}</p><span className="text-xs">Visit the website to see the project</span></div>}</div>
}
