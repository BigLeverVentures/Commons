'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { sendMagicLink } from '@/app/login/actions'
import type { ActionState } from '@/types'

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'Your link has expired. Request a new one.',
  used: 'This link has already been used. Request a new one.',
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  return <EmailForm key={urlError ?? 'login'} urlError={urlError} />
}

function EmailForm({ urlError }: { urlError: string | null }) {
  const [sent, setSent] = useState(false)

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await sendMagicLink(prev, formData)
      if (result.status === 'idle') setSent(true)
      return result
    },
    { status: 'idle' }
  )

  return (
    <>
      {urlError && ERROR_MESSAGES[urlError] && (
        <p role="alert" className="mb-4 rounded-lg bg-[var(--danger-subtle)] px-3 py-2 text-sm text-[var(--danger)]">
          {ERROR_MESSAGES[urlError]}
        </p>
      )}

      {sent ? (
        <div role="status" className="rounded-lg border border-[var(--forest)]/20 bg-[var(--forest)]/5 p-4 text-center">
          <p className="text-sm font-medium text-[var(--forest)]">Check your email</p>
          <p className="text-xs text-[var(--obsidian-muted)] mt-1">
            If your email is registered, you&apos;ll receive a magic link.
          </p>
        </div>
      ) : (
        <>
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pounamu)]"
              />
            </div>

            {state.status === 'error' && (
              <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full primary-button hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Sending...' : 'Send magic link'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--obsidian-muted)]">
            Only admitted members can sign in.
          </p>
        </>
      )}
    </>
  )
}
