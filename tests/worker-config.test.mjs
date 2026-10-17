import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function config(extra = {}) {
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-placeholder', ...extra }
  const exports = {}
  const bindings = { assets: () => ({}), text: value => value, secret: () => ({ secret: true }) }
  const source = ts.transpileModule(fs.readFileSync('cloudflare.config.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(source, { exports, process: { cwd: () => '.' }, require: name => {
    if (name === 'vite') return { loadEnv: () => env }
    if (name === 'cf/config') return { bindings, defineConfig: fn => fn({ mode: 'production' }), defineWorker: value => value, triggers: { scheduled: value => value } }
    throw new Error(`Unexpected dependency: ${name}`)
  } })
  return exports.default.worker
}

test('default deployment retains plan limits and redacts logged query strings', () => {
  const worker = config()
  assert.equal(worker.name, 'commons')
  assert.equal(worker.limits, undefined)
  assert.equal(worker.observability.redactQueryString, true)
  assert.equal(worker.observability.logs.invocationLogs, true)
  assert.equal(worker.observability.traces.enabled, false)
  assert.equal(worker.env.NOTIFICATIONS_ENABLED, 'false')
  assert.equal(worker.triggers[0].schedule, '*/5 * * * *')
})
test('operators can opt into a bounded CPU cap on a paid Workers account', () => {
  assert.equal(config({ COMMONS_WORKER_CPU_MS: '1000' }).limits.cpuMs, 1000)
  for (const value of ['0', '-1', '1.5', 'Infinity', 'NaN', '300001', '10ms']) {
    assert.throws(() => config({ COMMONS_WORKER_CPU_MS: value }), /COMMONS_WORKER_CPU_MS/)
  }
})
