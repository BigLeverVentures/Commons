'use client'
import { SelectMenu } from './SelectMenu'
import { COMMUNITY } from '@/config/community'

import { startTransition, useActionState, useRef, useState } from 'react'
import { updateProfile } from '@/app/(app)/profile/actions'
import type { ActionState } from '@/types'
import { FellowAvatar } from '@/components/FellowAvatar'
import { AvatarPicker } from '@/components/AvatarPicker'
import { TOPICS } from '@/lib/topics'
import { CONTRIBUTIONS, personalLinks as parseLinks } from '@/lib/profile-presence'
import type { Json } from '@/types/database.types'
import { COHORTS, normalizeCohort } from '@/lib/cohorts'

export function ProfileForm({
  interests, contributions, personalLinks, avatarStyle,
  introductionEmails,
  emailNotifications,
  email,
  name,
  cohort,
  location,
  bio,
  avatarPath,
}: {
  interests: string[]; contributions: string[]; personalLinks: Json; avatarStyle: string | null
  introductionEmails: boolean
  emailNotifications: boolean
  email: string
  name: string
  cohort: string
  location: string
  bio: string
  avatarPath: string | null
}) {
  const links = parseLinks(personalLinks) ?? []
  const [illustration, setIllustration] = useState(avatarStyle ?? '')
  const [removePhoto, setRemovePhoto] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [bioText, setBioText] = useState(bio)
  const bioOverLimit = bioText.length > 300
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (previous, data) => {
      const result = await updateProfile(previous, data)
      if (result.status === 'success') { setSelectedPhoto(null); if (photoInput.current) photoInput.current.value = '' }
      return result
    },
    { status: 'idle' }
  )

  const selectedCohort = normalizeCohort(cohort)
  const [cohortValue, setCohortValue] = useState(selectedCohort === undefined ? cohort : selectedCohort ?? '')

  return (
    <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => formAction(data)) }} className="profile-form space-y-8 w-full">
      <p className="max-w-[68ch] text-sm text-[var(--obsidian-muted)]">Your name, photo, bio and website links appear on your public {COMMUNITY.name} profile when you publish a post. Email and notification settings remain private.</p>
      <section className="profile-section" aria-labelledby="profile-details-heading">
        <h2 id="profile-details-heading" className="type-card mb-4">Your profile</h2>
        <div className="profile-fields">
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="profile-email"
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-[var(--obsidian)]/10 bg-[var(--limestone)] px-3 py-2 text-sm text-[var(--obsidian-muted)]"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              defaultValue={name}
              placeholder="Your full name"
              className="w-full rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pounamu)]"
            />
          </div>

          {COMMUNITY.cohortsEnabled ? (
          <div>
            <label htmlFor="cohort" className="block text-sm font-medium mb-1">
              Cohort
            </label>
            <SelectMenu id="cohort" name="cohort" label="Cohort" value={cohortValue} onChange={setCohortValue} options={[
              { value: '', label: 'Not specified' },
              ...(selectedCohort === undefined ? [{ value: cohort, label: `Choose your cohort (current: ${cohort})` }] : []),
              ...COHORTS.map(option => ({ value: option, label: option })),
            ]} />
          </div>
          ) : <input type="hidden" name="cohort" value={cohort} />}

          <div>
            <label htmlFor="location" className="block text-sm font-medium mb-1">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              maxLength={100}
              defaultValue={location}
              placeholder="e.g. Wellington, NZ"
              className="w-full rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pounamu)]"
            />
          </div>

        </div>
        <div className="mt-6">
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-1">
              Bio <span className="font-normal text-[var(--obsidian-muted)]">(max 300 characters)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={bioText}
              onChange={event => setBioText(event.target.value)}
              aria-invalid={bioOverLimit}
              aria-describedby="bio-count"
              placeholder="A few words about you and your work..."
              className="w-full rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pounamu)]"
            />
            <p id="bio-count" aria-live="polite" className={`mt-1 text-xs ${bioOverLimit ? 'text-[var(--danger)]' : 'text-[var(--obsidian-muted)]'}`}>
              {bioOverLimit ? `${bioText.length - 300} characters over the limit. Shorten your bio to save.` : `${bioText.length} / 300 characters`}
            </p>
          </div>

        </div>
      </section>
      <section className="profile-section" aria-labelledby="profile-photo-heading">
        <h2 id="profile-photo-heading" className="type-card mb-4">Photo and avatar</h2>
        <div className="profile-photo-columns">
          <div className="space-y-2">
            <p className="block text-sm font-medium">Profile photo</p>
            <div className="flex items-center gap-4">
              <button type="button" aria-label={avatarPath ? 'Change profile photo' : 'Choose profile photo'} aria-describedby="photo-help" disabled={isPending} onClick={() => photoInput.current?.click()} className="relative shrink-0 rounded-full border-2 border-[var(--pounamu)]/30 p-1 hover:border-[var(--pounamu)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pounamu)] disabled:opacity-50">
                <FellowAvatar name={name} path={removePhoto ? null : avatarPath} style={illustration} size={72} />
                <span aria-hidden="true" className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--limestone)] bg-[var(--pounamu)] text-[var(--on-action)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 5l1.5-2h5L16 5h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3Z" /><circle cx="12" cy="13" r="4" /></svg>
                </span>
              </button>
              <div className="min-w-0 space-y-1">
                <button type="button" disabled={isPending} onClick={() => photoInput.current?.click()} className="rounded-lg border border-[var(--pounamu)]/30 bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--limestone)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pounamu)] disabled:opacity-50">{avatarPath ? 'Change photo' : 'Choose photo'}</button>
                <p role="status" className="break-words text-xs text-[var(--obsidian-muted)]">{selectedPhoto ? `${selectedPhoto} — ready to save` : 'Optional. Make yourself at home.'}</p>
              </div>
            </div>
            <input ref={photoInput} id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Profile photo file" aria-describedby="photo-help" tabIndex={-1} className="sr-only" onChange={event => { setSelectedPhoto(event.target.files?.[0]?.name ?? null); if(event.target.files?.[0]) setRemovePhoto(false) }} />
            <p id="photo-help" className="text-xs text-[var(--obsidian-muted)]">JPEG, PNG, or WebP, up to 2 MB. Your photo appears beside your public posts.</p>
            {avatarPath && <label className="flex items-center gap-2 text-sm"><input name="remove_photo" type="checkbox" checked={removePhoto} onChange={event=>setRemovePhoto(event.target.checked)} />Remove current photo</label>}
          </div>

          <div>
            <input type="hidden" name="avatar_style" value={illustration} />
            <AvatarPicker value={illustration} disabled={isPending} replacesPhoto={!!avatarPath&&!removePhoto} onChoose={value=>{setIllustration(value);setRemovePhoto(true);setSelectedPhoto(null);if(photoInput.current)photoInput.current.value=''}} />
          </div>
        </div>
      </section>
      <section className="profile-section" aria-labelledby="profile-interests-heading">
        <h2 id="profile-interests-heading" className="type-card mb-4">What are you into?</h2>
        <p className="mb-3 text-sm text-[var(--obsidian-muted)]">What would you like to hear more about? Choose any topics, or leave them open. These personalize your board; they don’t subscribe you to email.</p>
        <div className="grid gap-2 sm:grid-cols-2">{TOPICS.map(topic => <label key={topic.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="interests" value={topic.id} defaultChecked={interests.includes(topic.id)} />{topic.name}</label>)}</div>
      </section>
      <section className="profile-section space-y-2" aria-labelledby="profile-help-heading">
        <h2 id="profile-help-heading" className="type-card mb-4">Happy to help with… (optional)</h2><div className="grid gap-2 sm:grid-cols-2">{CONTRIBUTIONS.map(value => <label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" name="contribution_preferences" value={value} defaultChecked={contributions.includes(value)} />{value}</label>)}</div><p className="text-xs text-[var(--obsidian-muted)]">A starting point for a conversation, not a promise of availability.</p></section>
      <section className="profile-section space-y-3" aria-labelledby="profile-links-heading">
        <h2 id="profile-links-heading" className="type-card mb-4">Places to find your work (optional)</h2>{[0,1,2].map(index => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr]"><label className="text-xs">Link {index + 1} label<input name={`link_label_${index}`} maxLength={40} defaultValue={links[index]?.label ?? ''} placeholder="Website, LinkedIn…" className="mt-1 w-full rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-3 py-2 text-sm" /></label><label className="text-xs">Full HTTPS URL<input name={`link_url_${index}`} defaultValue={links[index]?.url ?? ''} placeholder="https://…" className="mt-1 w-full rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-3 py-2 text-sm" /></label></div>)}</section>
      <section className="profile-section" aria-labelledby="profile-email-heading">
        <h2 id="profile-email-heading" className="type-card mb-4">Email preferences</h2>
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl bg-[var(--surface)] border border-[var(--border-control)] p-4 text-sm">
            <input name="introduction_emails" type="checkbox" defaultChecked={introductionEmails} className="mt-1" />
            <span>Email me private notes on my posts<span className="block text-xs text-[var(--obsidian-muted)] mt-1">Receive private notes from {COMMUNITY.memberPlural} about your posts. Notes remain available on your posts if you turn this off. This doesn’t affect replies to conversations you start.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-[var(--surface)] border border-[var(--border-control)] p-4 text-sm">
            <input name="email_notifications" type="checkbox" defaultChecked={emailNotifications} className="mt-1" />
            <span>Occasional reminders<span className="block text-xs text-[var(--obsidian-muted)] mt-1">Occasionally remind me about a quiet open post. At most one quiet-post reminder a month.</span></span>
          </label>

        </div>
      </section>

      {state.status === 'success' && <p role="status" className="text-sm text-[var(--forest)]">{state.message}</p>}
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending || bioOverLimit}
        className="primary-button hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  )
}
