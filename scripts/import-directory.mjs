import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const str = value => typeof value === 'string' ? value.trim() : ''
export function normalizeDirectory(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('A non-empty array of member records is required.')
  const emails = new Set(), ids = new Set()
  return rows.map(row => {
    const record_id = str(row.record_id), email = str(row.contact_email).toLowerCase(), name = str(row.name)
    if (!record_id || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Every record needs a stable record_id, name, and contact_email. Map your source fields to the normalized input schema before importing.')
    if (emails.has(email) || ids.has(record_id)) throw new Error('Duplicate directory identity or email; resolve before importing.')
    emails.add(email); ids.add(record_id)
    const extra = typeof row.extra_json === 'string' ? JSON.parse(row.extra_json) : row.extra_json ?? {}
    const description = [str(row.bio_tagline), str(extra.skills_to_give), str(extra.industries)].filter(Boolean).join(' · ').slice(0,2000)
    const tags = Array.isArray(row.search_tags) ? row.search_tags.filter(t => typeof t === 'string') : str(row.search_tags).split(/[,;|]/)
    return { record_id, email, name: name.slice(0,200), description, tags: tags.map(t => t.trim().toLowerCase()).filter(Boolean).slice(0,50) }
  })
}
const sqlString = value => `'${String(value).replaceAll("'", "''")}'`
export function directorySQL(rows) {
  return 'BEGIN;\n' + normalizeDirectory(rows).map(row => {
    const tags = `ARRAY[${row.tags.map(sqlString).join(',')}]::text[]`
    return `INSERT INTO public.directory_profiles(record_id,email,name,description,tags) VALUES (${[row.record_id,row.email,row.name,row.description].map(sqlString).join(',')},${tags}) ON CONFLICT(record_id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,description=EXCLUDED.description,tags=EXCLUDED.tags,imported_at=now();\nINSERT INTO public.auth_email_allowlist(email) VALUES (${sqlString(row.email)}) ON CONFLICT(email) DO NOTHING;`
  }).join('\n') + '\nCOMMIT;\n'
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output || path.resolve(input) === path.resolve(output)) throw new Error('Usage: node scripts/import-directory.mjs /path/fellows.db /private/path/import.sql (or a normalized JSON array)')
  let rows
  if (/\.(db|sqlite)$/i.test(input)) {
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(input, { readOnly:true })
    try { rows = db.prepare('SELECT record_id,name,contact_email,bio_tagline,search_tags,extra_json FROM fellows').all() } finally { db.close() }
  } else rows = JSON.parse(fs.readFileSync(input,'utf8'))
  const sql = directorySQL(rows)
  fs.writeFileSync(output, sql, { flag:'wx', mode:0o600 })
  console.log(`Prepared ${rows.length} records. Apply the private SQL file with your database administrator connection; no data was uploaded.`)
}
