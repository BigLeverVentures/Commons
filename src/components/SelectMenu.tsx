'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

type SelectOption = { value: string; label: string }

export function SelectMenu({ value, onChange, options, label, id: triggerId, name, disabled = false, variant = 'form' }: {
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  label: string
  id?: string
  name?: string
  disabled?: boolean
  variant?: 'form' | 'filter'
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const selected = Math.max(0, options.findIndex(option => option.value === value))

  useEffect(() => {
    if (!open || disabled) return
    items.current[selected]?.focus()
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open, selected, disabled])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.current.findIndex(item => item === document.activeElement)
    let next: number | undefined
    if (event.key === 'ArrowDown') next = (index + 1) % options.length
    if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = options.length - 1
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (next !== undefined) { event.preventDefault(); items.current[next]?.focus(); return }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
      const match = options.findIndex((_, offset) => options[(index + 1 + offset) % options.length].label.toLowerCase().startsWith(event.key.toLowerCase()))
      if (match !== -1) { event.preventDefault(); items.current[(index + 1 + match) % options.length]?.focus() }
    }
  }

  return <div className={`select-menu select-menu-${variant}${variant === 'filter' ? ' topic-filter' : ''}`} ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
    <button id={triggerId} disabled={disabled || !options.length} ref={trigger} type="button" className="select-menu-trigger" aria-label={`${label}: ${options[selected]?.label ?? 'Choose…'}`} aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={open && !disabled ? id : undefined} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) }
    }}>
      <span>{options[selected]?.label ?? 'Choose…'}</span><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
    </button>
    {open && !disabled && <div className="select-menu-options" id={id} role="listbox" aria-label={label} onKeyDown={navigate}>
      {options.map((option, index) => <button key={option.value} ref={element => { items.current[index] = element }} type="button" role="option" aria-selected={value === option.value} tabIndex={-1} onClick={() => { onChange(option.value); close() }}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ visibility: value === option.value ? 'visible' : 'hidden' }}><path d="m4 10 4 4 8-8" /></svg><span>{option.label}</span>
      </button>)}
    </div>}
  </div>
}
