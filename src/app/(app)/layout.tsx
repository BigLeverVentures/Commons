import { requireAuth } from '@/lib/auth'
import { CommonsShell } from '@/components/CommonsShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <CommonsShell user={await requireAuth()}>{children}</CommonsShell>
}
