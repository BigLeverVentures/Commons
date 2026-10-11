import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { normalizeDirectory, directorySQL } from '../scripts/import-directory.mjs'
import { PGlite } from '@electric-sql/pglite'
const exports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/matching.ts','utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText, {exports})

test('connection suggestions are bounded, grounded, omit emails, and exclude the author', () => {
  const candidate = i => ({key:String(i),name:`Person ${i}`,email:`person${i}@example.test`,description:'Climate restoration and community health',tags:['climate'],source_url:'https://example.test',source_label:'Directory snapshot'})
  const candidates = [0,1,2,3,4].map(candidate)
  const matches = exports.suggestConnections({title:'Climate pilot',description:'Restoration field study',tags:['climate']},candidates,'PERSON0@EXAMPLE.TEST')
  assert.equal(matches.length,3)
  assert.ok(matches.every(m => m.key !== '0' && !('email' in m)))
  assert.ok(matches.every(m => m.evidence.includes('climate') && m.evidence.includes('restoration')))
  assert.equal(exports.suggestConnections({title:'Music',description:'Orchestral composition',tags:[]},candidates,'author@example.test').length,0)
})

test('directory importer rejects incomplete and duplicate identity records', () => {
  assert.throws(() => normalizeDirectory([{record_id:'one',name:'A Fellow'}]),/contact_email/)
  const row = {record_id:'one',name:'A Fellow',contact_email:'fellow@example.test'}
  assert.throws(() => normalizeDirectory([row,row]),/Duplicate/)
  const imported = normalizeDirectory([{...row,contact_email:' FELLOW@EXAMPLE.TEST ',bio_tagline:'Climate researcher',ethnicity:'do not import',extra_json:'{"skills_to_give":"Field trials","mobile_number":"do not import"}'}])[0]
  assert.equal(imported.email,'fellow@example.test')
  assert.match(imported.description,/Field trials/)
  assert.equal('ethnicity' in imported,false)
  assert.equal('mobile_number' in imported,false)
})

test('generated import SQL safely handles quotes and populates admission without exposing the directory', async () => {
  const db = new PGlite()
  try {
    await db.exec("CREATE ROLE authenticated; CREATE ROLE anon; CREATE TABLE public.auth_email_allowlist(email text UNIQUE)")
    await db.exec(fs.readFileSync('supabase/migrations/20261008000300_directory_suggestions.sql','utf8'))
    const sql = directorySQL([{record_id:'id-1',name:"O'Connor",contact_email:'person@example.test',bio_tagline:"Grower's field research",search_tags:'climate,ecology'}])
    await db.exec(sql)
    assert.equal((await db.query('SELECT name FROM public.directory_profiles')).rows[0].name,"O'Connor")
    assert.equal((await db.query('SELECT email FROM public.auth_email_allowlist')).rows[0].email,'person@example.test')
    await db.exec('GRANT ALL ON public.directory_profiles TO anon,authenticated; SET ROLE anon')
    assert.equal((await db.query('SELECT * FROM public.directory_profiles')).rows.length,0)
    await db.exec('SET ROLE authenticated')
    assert.equal((await db.query('SELECT * FROM public.directory_profiles')).rows.length,0)
  } finally { await db.close() }
})
