import { createHash, timingSafeEqual } from 'node:crypto'
import { isPreviewMode } from '@/lib/runtime'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { drainStorageCleanup } from '@/lib/storage-cleanup'
import { storageCleanupFetch } from '@/lib/storage-cleanup-fetch'

export const maxDuration = 120
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' }
  if (isPreviewMode()) return Response.json({ error: 'Storage cleanup is disabled in preview.' }, { status: 404, headers })
  const secret = process.env.CRON_SECRET
  const hash = (value: string) => createHash('sha256').update(value).digest()
  if (!secret || !timingSafeEqual(hash(request.headers.get('authorization') ?? ''), hash(`Bearer ${secret}`))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers })
  }
  const db = getSupabaseAdminClient(storageCleanupFetch)
  if (!db) return Response.json({ error: 'Storage cleanup is not configured.' }, { status: 503, headers })
  try {
    return Response.json(await drainStorageCleanup(db), { headers })
  } catch {
    return Response.json({ error: 'Storage cleanup could not finish; pending files will retry.' }, { status: 500, headers })
  }
}
