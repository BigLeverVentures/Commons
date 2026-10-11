'use client'
import Link from 'next/link'
import { SharePost } from '@/components/SharePost'
import type { ShareTarget } from '@/lib/share-destination'
import type { Sharing } from '@/lib/invitations'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { REACTIONS } from '@/lib/reactions'
import type { ReactionKind,ReactionCounts,ReactionActor } from '@/lib/reactions'
import { reactToPost,reactionActors } from '@/app/(app)/posts/reaction-actions'
import { FellowAvatar } from './FellowAvatar'
import { ReactionIcon, ReactButtonIcon } from './ReactionIcon'
export function Reactions({postId,counts,selected,member,isAuthor,built,title,sharing,website,attachment,target}:{postId:string;counts:ReactionCounts;selected:ReactionKind[];member:boolean;isAuthor:boolean;built:boolean;title:string;sharing?:Sharing|null;website?:string|null;attachment?:unknown;target?:ShareTarget|null}) {
 const [choice,setChoice]=useState(selected),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[pending,startTransition]=useTransition(),[burst,setBurst]=useState(0)
 const [actors,setActors]=useState<ReactionActor[]>([]),[open,setOpen]=useState(false),[page,setPage]=useState(0),[more,setMore]=useState(false)
 const [pickerOpen,setPickerOpen]=useState(false)
 const pickerId=useId()
 const pickerRef=useRef<HTMLDivElement>(null)
 const closeTimer=useRef<ReturnType<typeof setTimeout> | null>(null)
 const canReact=member&&!isAuthor
 function cancelClose() { if(closeTimer.current)clearTimeout(closeTimer.current) }
 function closeSoon() { cancelClose();closeTimer.current=setTimeout(()=>setPickerOpen(false),180) }
 useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current)},[])
 useEffect(()=>{
  if(!pickerOpen)return
  const dismiss=(event:PointerEvent)=>{if(event.target instanceof Node&&!pickerRef.current?.contains(event.target))setPickerOpen(false)}
  document.addEventListener('pointerdown',dismiss)
  return ()=>document.removeEventListener('pointerdown',dismiss)
 },[pickerOpen])
 const total=counts.celebrate+counts.inspired+counts.appreciate
 function react(kind:ReactionKind) {const remove=choice.includes(kind);startTransition(async()=>{try{const result=await reactToPost(postId,kind,remove);setFailed(result.status==='error');if(result.status==='success'){setChoice(previous=>remove?previous.filter(value=>value!==kind):[...previous,kind]);setOpen(false);setPickerOpen(false);pickerRef.current?.querySelector<HTMLButtonElement>('.reaction-trigger')?.focus();if(!remove&&kind==='celebrate'&&built&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)setBurst(value=>value+1)}setMessage(result.status==='idle'?'':result.message)}catch{setFailed(true);setMessage('Couldn’t save your reaction. Please try again.')}})}
 function show(nextPage:number) {startTransition(async()=>{try{const result=await reactionActors(postId,nextPage);setActors(previous=>nextPage===1?result.actors:[...previous,...result.actors]);setPage(nextPage);setMore(result.more);setOpen(true);setFailed(false);setMessage('')}catch{setFailed(true);setMessage('Couldn’t load fellow reactions. Please try again.')}})}
 return <section aria-label="Appreciation" className="reaction-bar">
  {sharing&&<p className="social-share-invitation">{sharing.text}{sharing.audience&&<span> · Who should hear about it: {sharing.audience}</span>}</p>}
  <div className="reaction-toolbar">
   <div className="reaction-toolbar-left">
   <div ref={pickerRef} className="reaction-control" onPointerEnter={event=>{if(event.pointerType==='mouse'&&canReact){cancelClose();setPickerOpen(true)}}} onPointerLeave={event=>{if(event.pointerType==='mouse')closeSoon()}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setPickerOpen(false)}} onKeyDown={event=>{if(event.key==='Escape'){setPickerOpen(false);pickerRef.current?.querySelector<HTMLButtonElement>('.reaction-trigger')?.focus();event.stopPropagation()}}}>
    {member ? <button type="button" className={`reaction-trigger ${choice.length?'reaction-trigger-selected':''}`} disabled={isAuthor} aria-expanded={pickerOpen} aria-controls={pickerId} onClick={()=>{cancelClose();setPickerOpen(true)}} title={isAuthor?'Fellows can react to your post':undefined}><ReactButtonIcon /> {choice.length?'Reacted':'React'}</button> : <Link href="/login" className="reaction-trigger" aria-label="Sign in as a fellow to react"><ReactButtonIcon /> React</Link>}
    {pickerOpen&&canReact&&<div id={pickerId} className="reaction-picker" role="group" aria-label="Choose reactions">{REACTIONS.map(reaction=><button key={reaction.kind} type="button" aria-label={reaction.label} title={reaction.label} aria-pressed={choice.includes(reaction.kind)} disabled={pending} onClick={()=>react(reaction.kind)} className={`reaction-option ${choice.includes(reaction.kind)?'reaction-selected':''}`}><span className="reaction-symbol" aria-hidden="true"><ReactionIcon kind={reaction.kind} /></span></button>)}</div>}
   </div>
   <SharePost postId={postId} title={title} sharing={sharing} website={website} attachment={attachment} target={target} />
   </div>
   {total>0&&(member ? <button type="button" className="reaction-summary" disabled={pending} onClick={()=>open?setOpen(false):show(1)} aria-expanded={open} aria-label={`${total} ${total===1?'reaction':'reactions'}. ${open?'Hide':'See'} fellow reactions`}><span aria-hidden="true">{REACTIONS.filter(reaction=>counts[reaction.kind]>0).map(reaction=><ReactionIcon key={reaction.kind} kind={reaction.kind} />)}</span><span>{total}</span></button> : <span className="reaction-summary" aria-label={`${total} ${total===1?'reaction':'reactions'}`}><span aria-hidden="true">{REACTIONS.filter(reaction=>counts[reaction.kind]>0).map(reaction=><ReactionIcon key={reaction.kind} kind={reaction.kind} />)}</span><span>{total}</span></span>)}
  </div>{message&&<p role={failed?'alert':'status'} className="mt-3 text-sm">{message}</p>}{open&&<div className="mt-4 space-y-3">{actors.map((actor,index)=><div key={index} className="flex items-center gap-2 text-sm"><FellowAvatar name={actor.name} path={actor.avatarPath} style={actor.avatarStyle}/><span>{actor.name}</span><span className="text-xs text-[var(--obsidian-muted)]">{REACTIONS.find(reaction=>reaction.kind===actor.kind)?.label}</span></div>)}{more&&<button type="button" disabled={pending} onClick={()=>show(page+1)} className="text-xs underline">More fellows →</button>}<p className="text-xs text-[var(--obsidian-muted)]">Only fellows can see who reacted.</p></div>}{burst>0&&<div key={burst} aria-hidden="true" className="celebration-burst">{['#759581','#df9b71','#b4a4cc','#dbc266','#819fb0'].map((color,index)=><i key={index} style={{backgroundColor:color,left:`${20+index*15}%`,animationDelay:`${index*35}ms`}}/>)}</div>}</section>
}
