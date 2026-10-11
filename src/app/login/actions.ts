'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from '@/types'

export async function sendMagicLink(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { status: 'error', message: 'Email is required.' }

  const supabase = await getSupabaseServerClient()

  // Always attempt OTP — the before_user_created database hook is the
  // security boundary. If the email isn't on the allowlist, Supabase
  // will fail silently (no user to send to). We return the same generic
  // "check your email" message either way to prevent email enumeration.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) {
    // Don't leak specifics — could be allowlist rejection or a real error
    return { status: 'idle' }
  }

  return { status: 'idle' }
}
