'use client'

import Image from 'next/image'
import { useState } from 'react'
import { avatarIllustration } from '@/lib/profile-presence'
import { photoUrl } from '@/lib/photo-url'

export function FellowAvatar({ name, path, style, size = 28 }: { name?: string | null; path?: string | null; style?: string | null; size?: number }) {
  const src = photoUrl(path) ?? avatarIllustration(style)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const initials = (name || 'F').trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('')
  return <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--limestone)] text-[var(--obsidian-muted)]" style={{ width: size, height: size, fontSize: Math.max(10, size / 3) }}>
    {src && failedSrc !== src ? <Image src={src} alt="" width={size} height={size} unoptimized style={{ width: size, height: size, objectFit: 'cover' }} onError={() => setFailedSrc(src)} /> : initials}
  </span>
}
