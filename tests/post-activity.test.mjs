import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const api = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/post-activity.ts','utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS } }).outputText, { exports:api })
const base = { id:'older',created_at:'2026-10-01T00:00:00Z' }
test('activity promotes edits and confirmations without changing publication date', () => {
  const recent = { id:'recent', created_at:'2026-10-09T00:00:00Z' }
  const edited = { ...base, updated_at:'2026-10-10T00:00:00Z' }
  const confirmed = { ...base, id:'confirmed', updated_at:'2026-10-11T00:00:00Z', confirmed_at:'2026-10-11T00:00:00Z' }
  assert.equal(api.postActivity(base).label,'Published')
  assert.equal(api.postActivity(edited).label,'Updated')
  assert.equal(api.postActivity(confirmed).label,'Confirmed')
  assert.deepEqual([recent,edited,confirmed].sort(api.comparePostActivity).map(p=>p.id),['confirmed','older','recent'])
  assert.equal(edited.created_at,base.created_at)
  assert.equal(api.postActivity({...base,updated_at:'bad',confirmed_at:'bad'}).date,base.created_at)
  assert.equal(api.postActivity({...edited,confirmed_at:base.created_at}).label,'Updated')
})
test('equal activity has a deterministic ID tie-breaker', () => {
  assert.deepEqual([{...base,id:'b'}, {...base,id:'a'}].sort(api.comparePostActivity).map(p=>p.id),['a','b'])
})
