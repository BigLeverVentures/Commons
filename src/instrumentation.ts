import type { Instrumentation } from 'next'

const knownFailures = new Set([
  'Unable to load the board. Please try again.',
  'Unable to load the board.',
  'Unable to load your interests.',
  'Unable to load current invitations.',
  'Unable to load this post.',
  'Unable to load responses.',
  'Unable to load this fellow profile.',
])

// Request headers, URLs, cookies, arbitrary messages and stacks can contain secrets.
// Log only the route template and fixed application messages.
export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  const message = error instanceof Error ? error.message : ''
  console.error('[request-error]', {
    route: context.routePath,
    kind: context.routeType,
    failure: knownFailures.has(message) ? message : 'Unhandled server error',
  })
}
