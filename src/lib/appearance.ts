export type Appearance = 'light' | 'dark' | 'system'
export const APPEARANCE_KEY = 'commons-appearance'
const CHANGE_EVENT = 'commons-appearance-change'

export function validAppearance(value: unknown): Appearance {
  return value === 'light' || value === 'dark' ? value : 'system'
}

// Apply the stored preference before paint, with a CSS fallback when scripts are unavailable.
export const APPEARANCE_SCRIPT = `try{var p=localStorage.getItem('${APPEARANCE_KEY}');p=['light','dark'].includes(p)?p:'system';document.documentElement.dataset.appearance=p;document.documentElement.dataset.theme=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p}catch{document.documentElement.dataset.appearance='system'}`

function applyAppearance(value: Appearance) {
  document.documentElement.dataset.appearance = value
  document.documentElement.dataset.theme = value === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : value
}
export function getAppearance(): Appearance {
  return validAppearance(document.documentElement.dataset.appearance)
}
export function serverAppearance(): Appearance { return 'system' }
export function setAppearance(value: Appearance): boolean {
  applyAppearance(value)
  let saved = true
  try { localStorage.setItem(APPEARANCE_KEY, value) } catch { saved = false }
  window.dispatchEvent(new Event(CHANGE_EVENT))
  return saved
}
export function subscribeAppearance(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const systemChanged = () => {
    if (getAppearance() === 'system') { applyAppearance('system'); callback() }
  }
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== APPEARANCE_KEY && event.key !== null) return
    try { applyAppearance(validAppearance(localStorage.getItem(APPEARANCE_KEY))) } catch { return }
    callback()
  }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', storageChanged)
  media.addEventListener('change', systemChanged)
  systemChanged()
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', storageChanged)
    media.removeEventListener('change', systemChanged)
  }
}
