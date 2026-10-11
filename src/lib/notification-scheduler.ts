export async function dispatchNotificationJob(config: { appUrl?: string; secret?: string }, fetcher: typeof fetch = fetch) {
  if (!config.appUrl || !config.secret) throw new Error('Notification schedule is not configured.')
  const origin = new URL(config.appUrl)
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Notification origin must be a complete HTTPS origin.')
  const response = await fetcher(new URL('/api/jobs/notifications', origin), {
    method: 'POST', headers: { authorization: `Bearer ${config.secret}` }, redirect: 'manual', signal: AbortSignal.timeout(110_000),
  })
  if (!response.ok) throw new Error(`Notification job failed (${response.status}).`)
}
