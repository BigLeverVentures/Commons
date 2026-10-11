'use client'

import { useId, useRef, useState } from 'react'
import { AVATAR_OPTIONS } from '@/lib/profile-presence'
import { FellowAvatar } from './FellowAvatar'

const PAGE_SIZE = 12
const PAGE_COUNT = Math.ceil(AVATAR_OPTIONS.length / PAGE_SIZE)

export function AvatarPicker({ value, onChoose, disabled, replacesPhoto }: { value: string; onChoose: (value: string) => void; disabled?: boolean; replacesPhoto: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [candidate, setCandidate] = useState(value)
  const [page, setPage] = useState(0)
  const touch = useRef<{x:number;y:number}|null>(null)
  const selected = AVATAR_OPTIONS.find(avatar => avatar.id === candidate)

  function open() {
    setCandidate(value)
    const index = AVATAR_OPTIONS.findIndex(avatar => avatar.id === value)
    setPage(Math.max(0, Math.floor(index / PAGE_SIZE)))
    dialog.current?.showModal()
  }
  function choose(next: string) {
    onChoose(next)
    dialog.current?.close()
  }

  return <div className="avatar-choice">
    <div className="avatar-choice-current"><FellowAvatar style={value} size={48}/><div><p>Illustrated avatar</p><p className="avatar-choice-help">{value ? 'Choose another face from the collection.' : 'Find a face that feels like you.'}</p></div></div>
    <button type="button" className="avatar-button" disabled={disabled} onClick={open}>Choose an avatar</button>
    <dialog ref={dialog} aria-labelledby={titleId} className="avatar-dialog" onClick={event => {if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.current?.close()}}}>
      <div className="avatar-dialog-heading"><div><h2 id={titleId}>Choose your avatar</h2><p>{AVATAR_OPTIONS.length} faces. Find one that feels like you.</p></div><button type="button" className="avatar-close" aria-label="Close avatar gallery" onClick={()=>dialog.current?.close()}>×</button></div>
      <div className="avatar-gallery" aria-label="Avatar choices" onTouchStart={event=>{const point=event.touches[0];touch.current={x:point.clientX,y:point.clientY}}} onTouchEnd={event=>{const point=event.changedTouches[0],start=touch.current;touch.current=null;if(start&&Math.abs(point.clientX-start.x)>60&&Math.abs(point.clientY-start.y)<50)setPage(current=>Math.max(0,Math.min(PAGE_COUNT-1,current+(point.clientX<start.x?1:-1))))}}>
        {AVATAR_OPTIONS.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(avatar=><button key={avatar.id} type="button" aria-label={avatar.label} aria-pressed={candidate===avatar.id} className="avatar-option" onClick={()=>setCandidate(avatar.id)}><FellowAvatar style={avatar.id} size={64}/>{candidate===avatar.id&&<span className="avatar-check" aria-hidden="true">✓</span>}</button>)}
      </div>
      <div className="avatar-pagination"><button type="button" className="avatar-button" disabled={page===0} onClick={()=>setPage(current=>current-1)}>← Previous</button><span role="status">Page {page+1} of {PAGE_COUNT}</span><button type="button" className="avatar-button" disabled={page===PAGE_COUNT-1} onClick={()=>setPage(current=>current+1)}>Next →</button></div>
      <div className="avatar-confirm"><FellowAvatar style={candidate} size={72}/><div><p>{selected?.label ?? 'Your initials'}</p><p className="avatar-choice-help">{replacesPhoto ? 'This replaces your photo when you save your profile.' : 'Save your profile to apply your choice.'}</p></div></div>
      <div className="avatar-dialog-actions"><button type="button" className="avatar-button" onClick={()=>choose('')}>Use initials</button><button type="button" className="primary-button" onClick={()=>choose(candidate)}>{candidate ? 'Use this avatar' : 'Use initials'}</button></div>
      <p className="avatar-credit">Open Peeps by Pablo Stanley · CC0</p>
    </dialog>
  </div>
}
