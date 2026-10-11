import type { SupabaseClient } from '@supabase/supabase-js'

type CleanupJob = { id: string; owner_id: string; bucket: string; path: string; lease_token: string }

export async function drainStorageCleanup(db: SupabaseClient) {
  const claimed = await db.rpc('claim_storage_cleanup', { batch_size: 10 })
  if (claimed.error) throw new Error('Unable to claim storage cleanup.')
  let removed = 0, retrying = 0, superseded = 0
  for (const job of (claimed.data ?? []) as CleanupJob[]) {
    // The private table enforces these rules too; never accept an arbitrary destination.
    const extensions = job.bucket === 'profile-photos' ? '(jpg|png|webp)' : '(pdf|jpg|png|webp)'
    if (!['profile-photos', 'post-attachments'].includes(job.bucket) ||
      !/^[0-9a-f-]{36}$/.test(job.owner_id) ||
      !new RegExp(`^${job.owner_id}/[0-9a-f-]{36}\\.${extensions}$`).test(job.path)) {
      throw new Error('Invalid storage cleanup destination.')
    }
    let succeeded = false
    try {
      const result = await db.storage.from(job.bucket).remove([job.path])
      succeeded = !result.error
    } catch { /* A failed request remains retryable. */ }
    const finished = await db.rpc('finish_storage_cleanup', {
      job_id: job.id, claim_token: job.lease_token, succeeded,
    })
    if (finished.error) throw new Error('Unable to acknowledge storage cleanup.')
    if (!finished.data) superseded++
    else if (succeeded) removed++
    else retrying++
  }
  return { removed, retrying, superseded }
}
