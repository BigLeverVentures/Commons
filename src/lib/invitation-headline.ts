export const INVITATION_HEADLINE_LIMITS = { phone: 40, wide: 80 } as const

// Display only: retain the complete invitation for the post and accessible name.
export function invitationHeadline(text: string, limit: number): string {
  const characters = Array.from(text.trim().replace(/\s+/g, ' '))
  if (characters.length <= limit) return characters.join('')
  const prefix = characters.slice(0, limit - 1).join('')
  const boundary = prefix.lastIndexOf(' ')
  return `${(boundary >= prefix.length * .6 ? prefix.slice(0, boundary) : prefix).trimEnd()}…`
}
