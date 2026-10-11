import app from 'vinext/server/fetch-handler'
import { dispatchNotificationJob } from './lib/notification-scheduler'
import { dispatchStorageCleanupJob } from './lib/storage-cleanup-scheduler'
export * from 'vinext/server/fetch-handler'

const worker = {
  ...app,
  fetch(...args: Parameters<typeof app.fetch>) {
    const url = new URL(args[0].url)
    const origin = (args[1] as { APP_URL?: string } | undefined)?.APP_URL
    if (origin) {
      const canonical = new URL(origin)
      if (canonical.protocol === 'https:' && url.hostname === `www.${canonical.hostname}`) {
        url.protocol = canonical.protocol
        url.host = canonical.host
        return Response.redirect(url, 308)
      }
    }
    return app.fetch(...args)
  },
  scheduled(_event: unknown, env: { APP_URL?: string; CRON_SECRET?: string; NOTIFICATIONS_ENABLED?: string }, context: { waitUntil(promise: Promise<unknown>): void }) {
    context.waitUntil(dispatchStorageCleanupJob({ appUrl: env.APP_URL, secret: env.CRON_SECRET }))
    if (env.NOTIFICATIONS_ENABLED === 'true') context.waitUntil(dispatchNotificationJob({ appUrl: env.APP_URL, secret: env.CRON_SECRET }))
  },
}

export default worker
