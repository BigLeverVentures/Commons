import { COMMUNITY } from '@/config/community'
import { directoryDestination } from '@/lib/fellow-identity'

export function DirectoryHelp() {
  const directoryUrl = directoryDestination(COMMUNITY.directoryUrlPrefix)
  return (
    <p className="mt-6 text-sm leading-relaxed text-[var(--obsidian-muted)]">
      Not sure which community email to use?{' '}
      {directoryUrl && <><a href={directoryUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Check the community directory</a> for your profile email.{' '}</>}
      <a href={`mailto:${COMMUNITY.supportEmail}`} className="underline underline-offset-4">Contact support</a> for help signing in.
    </p>
  )
}
