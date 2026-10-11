import { createHash } from 'node:crypto'
export function authorProfileKey(value: string): string {
  return /^[a-f0-9]{32}$/i.test(value) ? value.toLowerCase() : createHash('md5').update(value).digest('hex')
}
export function authorProfileHref(value: string): string { return `/fellows/${authorProfileKey(value)}` }
