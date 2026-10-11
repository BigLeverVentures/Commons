import { LinkIcon } from './LinkIcon'
import Link from 'next/link'
import { FellowAvatar } from './FellowAvatar'
import { invitationDate, type Invitation } from '@/lib/invitations'
export function InvitationRow({ invitation, preview=false, compactMobile=false }: {invitation:Invitation;preview?:boolean;compactMobile?:boolean}) {
 const date=invitationDate(invitation)
 const kind=invitation.kind==='share'?'Share':invitation.kind==='offer'?'Offer':invitation.postType==='project'?'Project':'Ask'
 const detail=[invitation.commitment,invitation.deadline?`By ${invitation.deadline} (UTC)`:null].filter(Boolean).join(' · ')
 const shortDate=new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date.date))
 const content=<>
  {compactMobile&&<div className="invitation-mobile-content"><FellowAvatar name={invitation.author} path={invitation.avatarPath} style={invitation.avatarStyle} size={32}/><div className="invitation-mobile-copy"><p className="invitation-mobile-title">{invitation.text}</p><p className="invitation-mobile-meta"><span>{kind} · {invitation.author}</span><time dateTime={date.date} title={`${date.label} ${date.date.slice(0,10)}`}> · {date.label} {shortDate}</time></p></div><LinkIcon /></div>}
  <span className={`invitation-type invitation-${invitation.kind}`}>{kind}</span>
  <div className="invitation-identity"><FellowAvatar name={invitation.author} path={invitation.avatarPath} style={invitation.avatarStyle} size={40}/><div><p className="invitation-author">{invitation.author}</p><span className="invitation-kind">{invitation.kind==='share'?'Help spread the word':invitation.kind==='offer'?'An offer to explore':'A way to help'}</span></div></div>
  <div className="invitation-story" title={invitation.text}><p className="invitation-text">{invitation.text}</p>{detail&&<span className="invitation-detail">{detail}</span>}</div>
  <span className="invitation-action">{invitation.action} <LinkIcon /></span>
  {!preview&&<div className="invitation-date"><time dateTime={date.date}>{date.label} {date.date.slice(0,10)}</time></div>}
 </>
 return preview?<div className="invitation-row invitation-preview">{content}</div>:<Link className={`invitation-row${compactMobile?' invitation-compact-mobile':''}`} href={`/posts/${invitation.postId}${invitation.kind==='share'?'#share':''}`}>{content}</Link>
}
