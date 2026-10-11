import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

test('server diagnostics identify application failures without recording request secrets', () => {
  const source = fs.readFileSync('src/instrumentation.ts', 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}, logs = []
  vm.runInNewContext(js, { exports, Error, console: { error(...args) { logs.push(args) } } })
  const request = { path: '/auth/confirm?token_hash=private-token', headers: { cookie: 'private-session' } }
  const context = { routePath: '/board', routeType: 'render' }
  exports.onRequestError(new Error('Unable to load the board. Please try again.'), request, context)
  exports.onRequestError(new Error('person@example.test private-token'), request, context)
  const serialized = JSON.stringify(logs)
  assert.match(serialized, /Unable to load the board/)
  assert.match(serialized, /Unhandled server error/)
  assert.doesNotMatch(serialized, /private-token|private-session|chris@example/)
})
