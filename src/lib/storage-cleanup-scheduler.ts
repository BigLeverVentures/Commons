export async function dispatchStorageCleanupJob(config: { appUrl?: string; secret?: string }, fetcher: typeof fetch = fetch) {
  if (!config.appUrl || !config.secret) throw new Error('Storage cleanup schedule is not configured.')
  const origin = new URL(config.appUrl)
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Cleanup origin must be a complete HTTPS origin.')
  const response = await fetcher(new URL('/api/jobs/storage-cleanup', origin), {
    method: 'POST', headers: { authorization: `Bearer ${config.secret}` }, redirect: 'manual', signal: AbortSignal.timeout(110_000),
  })
  if (!response.ok) throw new Error(`Storage cleanup job failed (${response.status}).`)
}
