import { COMMUNITY } from '@/config/community'
export type NotificationDraft = { id: string; to: string; subject: string; text: string; replyTo?: string }
export function notificationDraft(kind: 'response' | 'nudge', id: string, email: string, post: {id:string;title:string}, appUrl: string): NotificationDraft {
  const title = post.title.replace(/[\r\n]/g,' ')
  const link = new URL(`/posts/${post.id}`, appUrl).href
  const preferences = new URL('/profile', appUrl).href
  return { id, to:email, subject:kind === 'response' ? `A ${COMMUNITY.memberSingular} is interested: ${title}` : `Still looking for a connection? ${title}`, text:kind === 'response'
    ? `A ${COMMUNITY.memberSingular} has expressed interest in “${title}”.\n\nOpen your post to read their note and connect directly:\n${link}\n\nChange email preferences: ${preferences}`
    : `Your post “${title}” has been quiet for a little while.\n\nStill relevant? Open your post to confirm it is current, revise the invitation, or pause participation. If something happened, share the outcome in Built here. Your original publication date and story stay intact.\n\n${link}\n\nChange email preferences: ${preferences}` }
}
export function introductionDraft(id: string, to: string, post: {id:string;title:string}, appUrl: string, fellow: {name:string|null;cohort:string|null;email:string;note:string}): NotificationDraft {
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fellow.email)) throw new Error('Invalid verified reply address.')
  const draft = notificationDraft('response', id, to, post, appUrl)
  const name = (fellow.name || `A ${COMMUNITY.memberSingular}`).replace(/[\r\n]/g, ' ')
  return { ...draft, replyTo: fellow.email, subject: `${name} would like to connect: ${post.title.replace(/[\r\n]/g,' ')}`,
    text: `${name}${fellow.cohort ? ` · ${fellow.cohort}` : ''} sent a private introduction about “${post.title}”.\n\n${fellow.note}\n\nReply to this email to connect directly with ${name}.\n\nOpen the post: ${new URL(`/posts/${post.id}`,appUrl).href}\n\nEmail preferences: ${new URL('/profile',appUrl).href}` }
}
export async function sendNotification(draft: NotificationDraft, config: {key:string;from:string}, fetcher: typeof fetch = fetch) {
  const response = await fetcher('https://api.resend.com/emails', {
    method:'POST', headers:{ Authorization:`Bearer ${config.key}`, 'Content-Type':'application/json', 'Idempotency-Key':`commons-${draft.id}` },
    body:JSON.stringify({from:config.from,to:[draft.to],subject:draft.subject,text:draft.text,...(draft.replyTo ? {reply_to:draft.replyTo} : {})}), signal:AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`Email provider rejected delivery (${response.status}).`)
  const data = await response.json()
  if (!data.id) throw new Error('Email provider did not confirm delivery.')
  return String(data.id)
}
