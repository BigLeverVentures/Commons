'use client'
import { COMMUNITY } from '@/config/community'
import {MentionSegments} from './MentionSegments'
import {useEffect,useId,useRef,useState} from 'react'
import {codePointOffset,utf16Offset,mentionQuery,normalizedBody,readMentions,transformMentions} from '@/lib/mentions'
import type {FellowMention} from '@/lib/mentions'
import type {FellowSearchResult} from '@/lib/fellow-identity'
export function MentionTextarea({name,value,onChange,initialMentions=[],limit,rows=5,placeholder,showMentionHelp=true}:{name:string;value:string;onChange:(value:string)=>void;initialMentions?:unknown;limit:number;rows?:number;placeholder?:string;showMentionHelp?:boolean}) {
 const [mentions,setMentions]=useState<FellowMention[]>(()=>readMentions(initialMentions,normalizedBody(value),name==='note'?10:25)??[]),[query,setQuery]=useState<ReturnType<typeof mentionQuery>>(null),[results,setResults]=useState<FellowSearchResult[]>([]),[active,setActive]=useState(0),[message,setMessage]=useState('')
 const id=useId(),input=useRef<HTMLTextAreaElement>(null),native=useRef<{type:string;range?:{start:number;end:number}}>({type:''}),history=useRef(new Map<string,FellowMention[]>([[normalizedBody(value),mentions]])),list=id+'-matches'
 useEffect(()=>{
  const textarea=input.current;if(!textarea)return
  function before(event:Event){const inputEvent=event as InputEvent;let start=codePointOffset(textarea!.value,textarea!.selectionStart),end=codePointOffset(textarea!.value,textarea!.selectionEnd)
   if(start===end&&inputEvent.inputType==='deleteContentBackward')start=Math.max(0,start-1)
   if(start===end&&inputEvent.inputType==='deleteContentForward')end++
   native.current={type:inputEvent.inputType,range:{start,end}}
  }
  textarea.addEventListener('beforeinput',before);return ()=>textarea.removeEventListener('beforeinput',before)
 },[])
 const search=query?.text
 useEffect(()=>{
  if(!search)return
  const controller=new AbortController(),timer=setTimeout(()=>{fetch(`/api/fellows/search?q=${encodeURIComponent(search)}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||'Search unavailable.');if(!controller.signal.aborted){setResults(body.fellows);setMessage(body.coverage||'')}}).catch(error=>{if(error.name!=='AbortError'&&!controller.signal.aborted){setResults([]);setMessage(error.message||'Search unavailable; your text is unchanged.')}})},250)
  return ()=>{clearTimeout(timer);controller.abort()}
 },[search])
 function remember(text:string,refs:FellowMention[]){history.current.set(text,refs);if(history.current.size>50)history.current.delete(history.current.keys().next().value!)}
 function change(text:string,caret:number){const next=normalizedBody(text),event=native.current;native.current={type:''}
  const saved=(event.type==='historyUndo'||event.type==='historyRedo')?history.current.get(next):undefined
  const updated=saved??transformMentions(normalizedBody(value),next,mentions,event.type.startsWith('history')?undefined:event.range)
  if(updated.length<mentions.length)setMessage('An edited name is now ordinary text. Select it again to restore its link.')
  else setMessage('')
  setMentions(updated);remember(next,updated);onChange(next);setQuery(mentionQuery(next,caret));setResults([]);setActive(0)
 }
 function select(fellow:FellowSearchResult){if(!query)return;const cap=name==='note'?10:25;if(mentions.length>=cap){setMessage(`Use up to ${cap} selected mentions.`);return}
  const label='@'+fellow.display_name,before=normalizedBody(value),next=before.slice(0,query.start)+label+before.slice(query.end),start=codePointOffset(before,query.start),end=codePointOffset(before,query.end)
  const adjusted=transformMentions(before,next,mentions,{start,end}),selected={fellow_id:fellow.id,start,end:start+Array.from(label).length,label_snapshot:label},updated=[...adjusted,selected].sort((a,b)=>a.start-b.start)
  // Keep the replacement in the browser's native editing history so Undo works.
  const textarea=input.current
  if(textarea){textarea.focus();textarea.setSelectionRange(query.start,query.end);document.execCommand('insertText',false,label)}
  setMentions(updated);remember(next,updated);onChange(next);setQuery(null);setResults([]);setMessage('Mention selected. No notification is sent.')
  requestAnimationFrame(()=>{input.current?.focus();const caret=utf16Offset(next,selected.end);input.current?.setSelectionRange(caret,caret)})
 }
 const over=value.length>limit
 return <div className="space-y-2"><textarea ref={input} id={name} name={name} required value={value} rows={rows} placeholder={placeholder} onChange={event=>change(event.target.value,event.target.selectionStart)} onKeyDown={event=>{if(event.key==='Escape'){setQuery(null);setResults([])}if(results.length&&event.key==='ArrowDown'){event.preventDefault();setActive((active+1)%results.length)}if(results.length&&event.key==='ArrowUp'){event.preventDefault();setActive((active+results.length-1)%results.length)}if(results.length&&event.key==='Enter'){event.preventDefault();select(results[active])}}} aria-invalid={over} aria-describedby={showMentionHelp?id+'-help '+id+'-count':id+'-count'} aria-controls={results.length?list:undefined} aria-haspopup="listbox" aria-activedescendant={results[active]?`${list}-${active}`:undefined} className="w-full rounded-xl border border-[var(--border-control)] bg-[var(--surface)] p-3 text-sm focus:ring-2 focus:ring-[var(--pounamu)]"/><input type="hidden" name={name==='description'?'description_mentions':name==='note'?'note_mentions':'outcome_mentions'} value={JSON.stringify(mentions)}/>{showMentionHelp&&<p id={id+'-help'} className="text-xs text-[var(--obsidian-muted)]">Type @ and at least two letters to select a {COMMUNITY.memberSingular}. Selected names link to the directory after publication; mentions do not send notifications.</p>}<p id={id+'-count'} aria-live="polite" className={`text-xs ${over?'text-[var(--danger)]':'text-[var(--obsidian-muted)]'}`}>{over?`${value.length-limit} characters over the limit.`:`${value.length} / ${limit} characters`}</p>{results.length>0&&<ul id={list} role="listbox" aria-label="Mention matches" className="rounded-lg border border-[var(--border-control)] bg-[var(--surface)]">{results.map((fellow,index)=><li key={fellow.id} id={`${list}-${index}`} role="option" aria-selected={active===index}><button type="button" onClick={()=>select(fellow)} className={`w-full px-3 py-3 text-left text-sm ${active===index?'bg-[var(--pounamu)]/10':''}`}>{fellow.display_name}{COMMUNITY.cohortsEnabled && fellow.cohort?` · ${fellow.cohort}`:''}</button></li>)}</ul>}{mentions.length>0&&<details className="text-xs"><summary>Preview selected names</summary><p className="my-2 whitespace-pre-wrap"><MentionSegments text={value} references={mentions}/></p><p>Directory links become active after publication.</p></details>}{message&&<p role="status" className="text-xs">{message}</p>}</div>
}
