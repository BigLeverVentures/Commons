'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
// A bounded first-page render. No PDF scripts or embedded links are executed.
export function AttachmentPreview({url,type,name}:{url:string;type:string;name:string}) {
 const canvas=useRef<HTMLCanvasElement>(null)
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false)
 useEffect(()=>{
  if(type!=='application/pdf')return
  let cancelled=false
  let task:import('pdfjs-dist').PDFDocumentLoadingTask|undefined
  let render:import('pdfjs-dist').RenderTask|undefined
  const timer=setTimeout(()=>{setFailed(true);void task?.destroy().catch(()=>{})},15000)
  async function draw(){
   try {
    const moduleUrl='/pdf.min.mjs'
    const pdfjs=await import(/* webpackIgnore: true */ /* @vite-ignore */ moduleUrl) as typeof import('pdfjs-dist')
    if(cancelled)return
    pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs'
    task=pdfjs.getDocument({url,isEvalSupported:false,disableAutoFetch:true,disableStream:true})
    const pdf=await task.promise
    if(cancelled)return
    const page=await pdf.getPage(1)
    const original=page.getViewport({scale:1})
    const viewport=page.getViewport({scale:Math.min(720/original.width,960/original.height,2)})
    const element=canvas.current
    if(!element||cancelled)return
    element.width=Math.ceil(viewport.width);element.height=Math.ceil(viewport.height)
    render=page.render({canvas:element,viewport})
    await render.promise
    if(!cancelled)setReady(true)
   } catch {if(!cancelled)setFailed(true)}
   finally {clearTimeout(timer);void task?.destroy().catch(()=>{})}
  }
  void draw()
  return ()=>{cancelled=true;clearTimeout(timer);render?.cancel();void task?.destroy().catch(()=>{})}
 },[url,type])
 return <div className={`attachment-preview-image${type === 'application/pdf' ? ' attachment-preview-pdf' : ''}`}>
 {type==='application/pdf'?<><span className="attachment-pdf-badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>PDF</span>{!failed&&<canvas ref={canvas} role="img" aria-label={`Preview of the top of the first page of ${name}; open the document to read in full`} style={{visibility:ready?'visible':'hidden'}}/>}{(!ready||failed)&&<span className="attachment-preview-placeholder">📄<span>{failed?'PDF · Open to read':'Preparing PDF preview…'}</span></span>}</>:!failed?<Image src={url} alt={name} width={720} height={480} unoptimized onError={()=>setFailed(true)}/>:<span className="attachment-preview-placeholder">🖼️<span>Image · Open to view</span></span>}
 </div>
}
