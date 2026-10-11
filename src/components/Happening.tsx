'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { InvitationRow } from './InvitationRow'
import type { Invitation } from '@/lib/invitations'

export function Happening({ invitations }: { invitations: Invitation[] }) {
  const list = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<{ height: number; overflow: boolean } | null>(null)

  useEffect(() => {
    const element = list.current
    if (!element) return
    const measure = () => {
      const rows = Array.from(element.children) as HTMLElement[]
      const visible = rows.slice(0, 3)
      // Measure actual rows, including wrapped titles, rather than reserving empty slots.
      const height = visible.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0)
      setViewport(previous => previous?.height === height && previous.overflow === (rows.length > visible.length)
        ? previous : { height, overflow: rows.length > visible.length })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    Array.from(element.children).forEach(row => observer.observe(row))
    measure()
    return () => { observer.disconnect() }
  }, [invitations])

  return <section aria-label="Recent invitations" className="happening">
    {invitations.length ? <>
      <div className="happening-scroll" role="region" aria-label="Recent invitations, newest activity first" tabIndex={viewport?.overflow ? 0 : undefined} style={viewport ? { maxHeight: viewport.height + 1 } : undefined}>
        <div ref={list} className="invitation-grid">
          {invitations.map(item => <InvitationRow key={item.id} invitation={item} compactMobile />)}
        </div>
      </div>
      {viewport?.overflow && <p className="happening-hint">Scroll for more invitations</p>}
    </> : <div className="happening-empty text-sm text-[var(--obsidian-muted)]">
      <p>The next invitation could be yours. Add a way to get involved when you publish an ask, offer or project.</p>
      <Link href="/posts/new" className="mt-2 inline-block underline">Share an invitation →</Link>
    </div>}
  </section>
}
