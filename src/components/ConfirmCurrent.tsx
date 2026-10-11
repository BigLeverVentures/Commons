'use client'
import { useState,useTransition } from 'react'
import { confirmPostCurrent } from '@/app/(app)/posts/actions'
export function ConfirmCurrent({postId}:{postId:string}) {
 const [message,setMessage]=useState(''),[failed,setFailed]=useState(false),[pending,startTransition]=useTransition()
 return <div className="mt-3"><button type="button" disabled={pending} onClick={()=>startTransition(async()=>{try{const result=await confirmPostCurrent(postId);setFailed(result.status==='error');setMessage(result.status==='idle'?'':result.message)}catch{setFailed(true);setMessage('Couldn’t confirm this post. Please try again.')}})} className="secondary-button">{pending?'Confirming…':'Still current'}</button>{message&&<p role={failed?'alert':'status'} className="mt-2 text-sm">{message}</p>}</div>
}
