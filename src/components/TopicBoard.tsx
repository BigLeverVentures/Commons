'use client'
import { COMMUNITY } from '@/config/community'
import { LinkIcon } from './LinkIcon'
import { ConnectionIllustration } from './ConnectionIllustration'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { postStatusLabel } from '@/lib/post-status'
import { readWebsitePreview } from '@/lib/website-preview'
import { WebsitePreviewImage } from '@/components/WebsitePreviewImage'
import { FellowAvatar } from '@/components/FellowAvatar'
import { Happening } from './Happening'
import type { Invitation } from '@/lib/invitations'
import { TOPICS, topicFor, freshness } from '@/lib/topics'
import type { PostWithFellow } from '@/types'
import { createBoardSearch } from '@/lib/board-search'

export function TopicBoard({ posts, publicOnly = false, builtOnly = false, interests = [], now = 0, invitations = [] }: { posts: PostWithFellow[]; publicOnly?: boolean; builtOnly?: boolean; interests?: string[]; now?: number; invitations?: Invitation[] }) {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [topic, setTopic] = useState('all')
  const [closed, setClosed] = useState(false)
  const personal = topic === 'interests'
  const searchPosts = useMemo(() => createBoardSearch(posts), [posts])
  const filtered = useMemo(() => searchPosts(search).filter(p =>
    (!personal || interests.includes(topicFor(p.tags, p.topic).id)) &&
    (!builtOnly || !!p.built_at) && (closed || builtOnly || p.status === 'open') && (kind === 'all' || p.type === kind) &&
    (topic === 'all' || personal || topicFor(p.tags, p.topic).id === topic)
  ), [searchPosts, search, kind, topic, closed, builtOnly, personal, interests])

  const hasFilters = !!search.trim() || kind !== 'all' || topic !== 'all' || personal || closed
  const emptyTitle = hasFilters ? 'No posts match these filters.' : builtOnly ? 'Nothing shared in Built here yet.' : posts.length ? 'No open posts right now.' : 'No posts yet.'
  const emptyDescription = personal && !interests.length ? `Choose your interests in Profile, or select All topics to explore ${COMMUNITY.name}.` : hasFilters ? 'Try another topic, choose a different post type, or clear your search.' : builtOnly ? `Share something ${COMMUNITY.memberPlural} made happen together, or add an outcome to an existing post.` : posts.length ? 'Include other states to explore earlier posts, or share a new ask, offer, or project.' : 'Share an ask, an offer, or a project to get things started.'

  return <div className="commons">
    <header className="commons-hero">
      <div className="commons-hero-inner page-inset">
        <div className="hero-text">
          {builtOnly && <p className="eyebrow">{COMMUNITY.heroHeadline}</p>}
          <h1>{builtOnly ? <>Born here.<br />Alive in the world.</> : COMMUNITY.heroHeadline}</h1>
          {!builtOnly && <p className="hero-subhead">A question, an offer, an idea —<br />that’s where things start.</p>}
          {(builtOnly || publicOnly) && <p className="hero-copy">{builtOnly ? `Stories of what ${COMMUNITY.memberPlural} made happen together.` : `Ideas, asks, offers, and projects from community ${COMMUNITY.memberPlural}. Explore freely; sign in as a ${COMMUNITY.memberSingular} to join in.`}</p>}
          <Link href={publicOnly ? "/login" : builtOnly ? "/posts/new?built=1" : "/posts/new"} className="primary-button">{publicOnly ? `Sign in as a ${COMMUNITY.memberSingular}` : builtOnly ? "Share something built" : "Start something"} <LinkIcon /></Link>
        </div>
        <ConnectionIllustration />
      </div>
    </header>
    <section className="commons-content page-inset" aria-labelledby="commons-heading">
      <div className="explore-heading"><div><h2 id="commons-heading" className="type-section">{builtOnly ? "Look what we made together" : "Explore the commons"}</h2></div><p>{filtered.length} {filtered.length === 1 ? 'connection' : 'connections'} to explore</p></div>
      {!builtOnly && <Happening invitations={invitations} now={now} />}
      <div className="board-controls">
        <label className="search-field"><span className="sr-only">Search the board</span><span aria-hidden="true">⌕</span><input type="search" placeholder={`An idea, a topic, a ${COMMUNITY.memberSingular}…`} value={search} onChange={e => setSearch(e.target.value)} /></label>
        <label><span className="sr-only">Topic</span><select value={topic} onChange={e => setTopic(e.target.value)}><option value="all">All topics</option>{!publicOnly && <option value="interests">My interests</option>}{TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        {!builtOnly && <label className="closed-filter"><input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} />Include other states</label>}
      </div>
      <div className="kind-tabs" role="group" aria-label="Post type">{[['all','Everything'],['project','Projects'],['ask','Asks'],['offer','Offers']].map(([value,label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}</div>
      {filtered.length ? <div className="island-map">{TOPICS.map(t => {
        const group = filtered.filter(p => topicFor(p.tags, p.topic).id === t.id)
        if (!group.length) return null
        return <section className={`topic-island island-${t.color}`} key={t.id} aria-labelledby={`topic-${t.id}`}>
          <div className="island-heading"><span className="island-mark" aria-hidden="true">✳</span><div><h3 id={`topic-${t.id}`}>{t.name}</h3><p>{t.description}</p></div></div>
          <div className="island-projects">{group.map(p => <Link className={`idea-card ${p.built_at ? 'built-project-card' : ''}`} href={`/posts/${p.id}`} key={p.id}>
            {p.built_at && readWebsitePreview(p.link_preview, p.outcome_url) && <WebsitePreviewImage image={readWebsitePreview(p.link_preview, p.outcome_url)!.image} title={p.title} />}
            <div className="idea-meta"><span className={`kind-${p.type}`}>{p.type}</span><span className={p.built_at ? 'kind-project' : undefined}>{p.built_at ? 'Built here ✨' : p.status !== 'open' ? postStatusLabel(p.status, p.type) : freshness(p.created_at)}</span></div>
            <h4>{p.title}</h4>{p.built_at && <p className="text-xs text-[var(--obsidian-muted)]">{postStatusLabel(p.status, p.type)}</p>}<p className="idea-summary">{p.description}</p>
            {!!p.collaborators?.length && <p className="text-xs text-[var(--obsidian-muted)]">In collaboration with {p.collaborators.join(', ')}</p>}
            {builtOnly && p.outcome_url && <p className="built-website-label">Explore the project <LinkIcon /></p>}
            <div className="idea-author"><FellowAvatar name={p.fellow?.name} path={p.fellow?.avatar_path} style={p.fellow?.avatar_style} /><span>{p.fellow?.name || `A ${COMMUNITY.memberSingular}`}</span><span className="card-open">View post <LinkIcon /></span></div>
          </Link>)}</div>
        </section>
      })}</div> : <div className="board-empty"><h3>{emptyTitle}</h3><p>{emptyDescription}</p>{hasFilters && <button type="button" className="primary-button" onClick={() => { setSearch(''); setKind('all'); setTopic('all'); setClosed(false) }}>Reset filters</button>}</div>}
    </section>
  </div>
}
