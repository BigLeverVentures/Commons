export function DirectoryHelp() {
  return (
    <p className="mt-6 text-sm leading-relaxed text-[var(--obsidian-muted)]">
      Not sure which fellowship email to use? Find your name and email in the{' '}
      <a href="https://directory.example.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        fellow directory
      </a>. The directory requires its own sign-in. Use the email listed on your profile to sign in here.{' '}
      If you cannot access the directory or no longer use that email,{' '}
      <a href="mailto:support@commons.example.org" className="underline underline-offset-4">contact support</a>.
    </p>
  )
}
