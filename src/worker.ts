import app from 'vinext/server/fetch-handler'
import { dispatchNotificationJob } from './lib/notification-scheduler'
import { dispatchStorageCleanupJob } from './lib/storage-cleanup-scheduler'
export * from 'vinext/server/fetch-handler'

const worker = {
  ...app,
  fetch(...args: Parameters<typeof app.fetch>) {
    const url = new URL(args[0].url)
    if (url.hostname === 'www.commons.example.org') {
      url.protocol = 'https:'
      url.hostname = 'commons.example.org'
      url.port = ''
      return Response.redirect(url, 308)
    }
    return app.fetch(...args)
  },
  scheduled(_event: unknown, env: { APP_URL?: string; CRON_SECRET?: string; NOTIFICATIONS_ENABLED?: string }, context: { waitUntil(promise: Promise<unknown>): void }) {
    context.waitUntil(dispatchStorageCleanupJob({ appUrl: env.APP_URL, secret: env.CRON_SECRET }))
    if (env.NOTIFICATIONS_ENABLED === 'true') context.waitUntil(dispatchNotificationJob({ appUrl: env.APP_URL, secret: env.CRON_SECRET }))
  },
}

export default worker
