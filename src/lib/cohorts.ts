export const COHORTS = Array.from({ length: 8 }, (_, index) => `Cohort ${index + 1}`)

export function normalizeCohort(value: string): string | null | undefined {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = /^(?:cohort\s*)?([1-8])$/i.exec(trimmed)
  return match ? `Cohort ${match[1]}` : undefined
}
