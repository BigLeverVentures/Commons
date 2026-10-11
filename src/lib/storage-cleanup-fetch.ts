// Twenty-one sequential requests (claim, ten removals, ten acknowledgments)
// stay within the scheduler's 110-second budget, including stalled requests.
export const STORAGE_CLEANUP_REQUEST_TIMEOUT_MS = 4_000

export const storageCleanupFetch: typeof fetch = (input, init) => {
  const deadline = AbortSignal.timeout(STORAGE_CLEANUP_REQUEST_TIMEOUT_MS)
  const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
  return fetch(input, {
    ...init,
    signal: callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline,
  })
}
