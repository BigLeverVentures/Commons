import { invitationHeadline, INVITATION_HEADLINE_LIMITS } from '@/lib/invitation-headline'

export function InvitationHeadline({ text }: { text: string }) {
  return <span title={text}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true" className="invitation-headline-phone">{invitationHeadline(text, INVITATION_HEADLINE_LIMITS.phone)}</span>
    <span aria-hidden="true" className="invitation-headline-wide">{invitationHeadline(text, INVITATION_HEADLINE_LIMITS.wide)}</span>
  </span>
}

export function InvitationHeadlinePreview({ text }: { text: string }) {
  return <div className="invitation-headline-preview">
    <p className="text-xs text-[var(--muted)]">Intro heading preview · narrow windows may shorten it further. Full invitation appears on your post.</p>
    <p><span className="text-xs text-[var(--muted)]">Phone · up to 40 characters</span><br/>{invitationHeadline(text, INVITATION_HEADLINE_LIMITS.phone)}</p>
    <p><span className="text-xs text-[var(--muted)]">Wider screens · up to 80 characters</span><br/>{invitationHeadline(text, INVITATION_HEADLINE_LIMITS.wide)}</p>
  </div>
}
