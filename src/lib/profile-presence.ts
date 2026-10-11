export const CONTRIBUTIONS = ['Feedback', 'Mentoring', 'Introductions', 'Testing', 'Occasional project help'] as const
export const AVATAR_OPTIONS = [
  {
    "id": "peep-1",
    "label": "Short hair and beard"
  },
  {
    "id": "peep-2",
    "label": "Braids"
  },
  {
    "id": "peep-3",
    "label": "Bright mohawk"
  },
  {
    "id": "peep-37",
    "label": "Silver short hair and round glasses"
  },
  {
    "id": "peep-4",
    "label": "Cropped hair"
  },
  {
    "id": "peep-5",
    "label": "Side bun"
  },
  {
    "id": "peep-6",
    "label": "Short hair"
  },
  {
    "id": "peep-38",
    "label": "Bald with a moustache"
  },
  {
    "id": "peep-7",
    "label": "Rounded curls"
  },
  {
    "id": "peep-8",
    "label": "Soft fringe"
  },
  {
    "id": "peep-9",
    "label": "Bantu knots"
  },
  {
    "id": "peep-39",
    "label": "Silver hair and a moustache"
  },
  {
    "id": "peep-10",
    "label": "High bun"
  },
  {
    "id": "peep-11",
    "label": "Braided hair"
  },
  {
    "id": "peep-12",
    "label": "Long locs"
  },
  {
    "id": "peep-40",
    "label": "Close-cropped hair and beard"
  },
  {
    "id": "peep-13",
    "label": "Silver bun"
  },
  {
    "id": "peep-14",
    "label": "Silver waves"
  },
  {
    "id": "peep-15",
    "label": "Silver short hair"
  },
  {
    "id": "peep-41",
    "label": "Short silver hair and goatee"
  },
  {
    "id": "peep-16",
    "label": "Beanie"
  },
  {
    "id": "peep-17",
    "label": "Headscarf"
  },
  {
    "id": "peep-18",
    "label": "Long straight hair"
  },
  {
    "id": "peep-42",
    "label": "Bald with rectangular glasses"
  },
  {
    "id": "peep-19",
    "label": "Long curls"
  },
  {
    "id": "peep-20",
    "label": "Loose waves"
  },
  {
    "id": "peep-21",
    "label": "Side fringe"
  },
  {
    "id": "peep-43",
    "label": "Textured hair and moustache"
  },
  {
    "id": "peep-22",
    "label": "Shoulder-length hair"
  },
  {
    "id": "peep-23",
    "label": "Bald with glasses"
  },
  {
    "id": "peep-24",
    "label": "Bald with beard"
  },
  {
    "id": "peep-44",
    "label": "Thinning silver hair and glasses"
  },
  {
    "id": "peep-25",
    "label": "Swept hair"
  },
  {
    "id": "peep-26",
    "label": "Close crop"
  },
  {
    "id": "peep-27",
    "label": "Short hair and glasses"
  },
  {
    "id": "peep-45",
    "label": "Bald with silver sideburns"
  },
  {
    "id": "peep-28",
    "label": "Short textured hair"
  },
  {
    "id": "peep-29",
    "label": "Turban"
  },
  {
    "id": "peep-30",
    "label": "Twists"
  },
  {
    "id": "peep-46",
    "label": "Short silver hair and square glasses"
  },
  {
    "id": "peep-31",
    "label": "Short twists"
  },
  {
    "id": "peep-32",
    "label": "Double buns"
  },
  {
    "id": "peep-33",
    "label": "Soft hat"
  },
  {
    "id": "peep-47",
    "label": "Swept hair and beard"
  },
  {
    "id": "peep-34",
    "label": "Mohawk"
  },
  {
    "id": "peep-35",
    "label": "Medium waves"
  },
  {
    "id": "peep-36",
    "label": "Long fringe"
  },
  {
    "id": "peep-48",
    "label": "Silver cropped hair"
  }
] as const
export const AVATARS = AVATAR_OPTIONS.map(avatar => avatar.id)
export type PersonalLink = { label: string; url: string }
export function personalLinks(value: unknown): PersonalLink[] | null {
  if (!Array.isArray(value) || value.length > 3) return null
  const result: PersonalLink[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.label !== 'string' || typeof item.url !== 'string') return null
    const label = item.label.trim(), raw = item.url.trim()
    if (!label && !raw) continue
    if (!label || label.length > 40 || raw.length > 500) return null
    try {
      const url = new URL(raw)
      if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return null
      result.push({ label, url: url.href })
    } catch { return null }
  }
  return result
}
export function avatarIllustration(style?: string | null): string | null {
  return AVATARS.includes(style as typeof AVATARS[number]) ? `/avatars/${style}.svg` : null
}
