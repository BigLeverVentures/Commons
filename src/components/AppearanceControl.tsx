'use client'

import { useId, useState, useSyncExternalStore } from 'react'
import { getAppearance, serverAppearance, setAppearance, subscribeAppearance, type Appearance } from '@/lib/appearance'

const choices: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function AppearanceControl() {
  const name = useId()
  const appearance = useSyncExternalStore(subscribeAppearance, getAppearance, serverAppearance)
  const [saved, setSaved] = useState(true)
  return <div>
    <fieldset className="appearance-control">
      <legend className="sr-only">Appearance</legend>
      <div className="appearance-segments">
        {choices.map(({ value, label }) => <label className="appearance-choice" key={value}>
          <input className="sr-only" type="radio" name={name} value={value} checked={appearance === value} onChange={() => setSaved(setAppearance(value))} />
          <span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              {value === 'system' && <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>}
              {value === 'light' && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></>}
              {value === 'dark' && <path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z" />}
            </svg>
            {label}
          </span>
        </label>)}
      </div>
    </fieldset>
    {!saved && <p className="appearance-feedback" role="status">Applied for this visit. Your browser couldn’t remember the choice.</p>}
  </div>
}
