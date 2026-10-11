import { currentUser } from '@/lib/auth'
import { CommonsShell } from '@/components/CommonsShell'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  return <CommonsShell user={await currentUser()}>{children}</CommonsShell>
}
