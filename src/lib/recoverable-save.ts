import type { ActionState } from '@/types'

export async function recoverableSave(
  action: (previous: ActionState, data: FormData) => Promise<ActionState>,
  previous: ActionState,
  data: FormData,
  options: { online: boolean; onSaved: () => void; timeoutMs?: number },
): Promise<ActionState> {
  if (!options.online) return { status: 'error', message: 'You’re offline. Reconnect, then try saving again.' }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      action(previous, data),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Save timed out')), options.timeoutMs ?? 20000) }),
    ])
    if (result?.status === 'success') options.onSaved()
    return result ?? { status: 'idle' }
  } catch (error) {
    // Navigation is implemented as an exception by Next and Vinext. Never swallow it.
    const digest = error && typeof error === 'object' && 'digest' in error ? String(error.digest) : ''
    if (digest.startsWith('NEXT_REDIRECT;')) {
      if (/;\/posts\/[^;?]+\?saved=(created|built|updated);/.test(digest)) options.onSaved()
      throw error
    }
    if (digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;')) throw error
    return { status: 'error', message: 'We couldn’t confirm the save. Check your connection and try again.' }
  } finally { clearTimeout(timer) }
}
