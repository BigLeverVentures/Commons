'use client'
import { useState } from 'react'
import type { ShareTarget } from '@/lib/share-destination'
import { shareDestination } from '@/lib/share-destination'
import type { Sharing } from '@/lib/invitations'
export function SharePost({postId,title,sharing,website,attachment,target}:{postId:string;title:string;sharing?:Sharing|null;website?:string|null;attachment?:unknown;target?:ShareTarget|null}) {
 const [message,setMessage]=useState(''),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false)
 const destination=shareDestination({id:postId,outcome_url:website,attachment,share_target:target})
 const url=destination.url
 const text=sharing?.message || title
 async function share(){
  setBusy(true);setFailed(false);setMessage('')
  try {
   if(navigator.share){await navigator.share({title,text,url});setMessage('Share action completed.')}
   else {await navigator.clipboard.writeText(url);setMessage('Link copied.')}
  } catch(error) {
   if(error instanceof Error&&error.name==='AbortError')setMessage('Sharing cancelled.')
   else {setFailed(true);setMessage('Couldn’t share automatically. Copy this link:')}
  } finally {setBusy(false)}
 }
 return <div id="share" className="share-control"><button type="button" disabled={busy} onClick={share} className="reaction-trigger"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3l7 7-7 7v-5c-6 0-9 3-11 7 0-8 4-12 11-12V3z"/></svg>{busy?'Sharing…':destination.label}</button>{message&&<p role={failed?'alert':'status'} className="share-feedback">{message}{failed&&<> <a href={url} className="underline break-all">{url}</a></>}</p>}</div>
}
