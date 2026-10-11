import { LinkIcon } from '@/components/LinkIcon'
import { readAttachment, ATTACHMENT_BUCKET } from '@/lib/attachment-fields'
import { AttachmentPreview } from './AttachmentPreview'
export function PostAttachment({attachment,url:localUrl}:{attachment:unknown;url?:string}) {
 const file=readAttachment(attachment)
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!file||(!base&&!localUrl))return null
 const url=localUrl || `${base}/storage/v1/object/public/${ATTACHMENT_BUCKET}/${file.path}`
 return <a href={url} target="_blank" rel="noopener noreferrer" className="website-preview-card attachment-preview-card">
 <AttachmentPreview key={url} url={url} type={file.type} name={file.name}/>
 <div className="website-preview-copy"><p className="website-preview-domain">{file.type==='application/pdf'?'PDF document':'Image'} · {Math.ceil(file.size/1024)} KB<LinkIcon external /></p><h3>{file.name}</h3><p className="website-preview-description">{file.type==='application/pdf'?'Open the document to read the full report.':'Open the image to see it in full.'}</p><span className="website-preview-cta">Open {file.type==='application/pdf'?'document':'image'} <LinkIcon external /></span></div></a>
}
