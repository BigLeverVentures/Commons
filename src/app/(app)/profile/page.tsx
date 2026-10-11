import { requireAuth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isPreviewMode } from '@/lib/runtime'
import { previewFellow } from '@/lib/preview'
import { DeleteProfile } from '@/components/DeleteProfile'
import { ProfileForm } from '@/components/ProfileForm'

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const deleted = (await searchParams).deleted === '1'
  const user = await requireAuth()
  const fellow = isPreviewMode() ? await previewFellow() : (await (await getSupabaseServerClient())
    .from('fellows').select('name, cohort, location, bio, avatar_path, email_notifications, introduction_emails, interests, contribution_preferences, personal_links, avatar_style').eq('id', user.id).single()).data

  return (
    <div>
      <h1 className="type-title mb-6">Profile</h1>
      {deleted && !fellow?.name && <p role="status" className="mb-4 text-[var(--success)]">Your profile was deleted. You can create a new one below.</p>}
      <ProfileForm key={fellow?.name ? 'profile-configured' : 'profile-empty'}
        interests={fellow?.interests ?? []}
        contributions={fellow?.contribution_preferences ?? []}
        personalLinks={fellow?.personal_links ?? []}
        avatarStyle={fellow?.avatar_style ?? null}
        introductionEmails={fellow?.introduction_emails ?? true}
        emailNotifications={fellow?.email_notifications ?? true}
        email={user.email ?? ''}
        name={fellow?.name ?? ''}
        cohort={fellow?.cohort ?? ''}
        location={fellow?.location ?? ''}
        bio={fellow?.bio ?? ''}
        avatarPath={fellow?.avatar_path ?? null}
      />
      <DeleteProfile key={fellow?.name ? 'delete-configured' : 'delete-empty'} />
    </div>
  )
}
