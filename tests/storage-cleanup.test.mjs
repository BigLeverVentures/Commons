import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { database, alice } from './helpers/database.mjs'

function load(file, dependencies = {}, globals = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, Request, AbortSignal, fetch, Response, Error, process, ...globals,
    require(name) { if (!(name in dependencies)) throw new Error(name); return dependencies[name] },
  })
  return exports
}
const { drainStorageCleanup } = load('src/lib/storage-cleanup.ts')
const job = { id: 'job-1', owner_id: alice, bucket: 'post-attachments', path: `${alice}/30000000-0000-4000-8000-000000000001.pdf`, lease_token: 'lease-1' }

function client({ failure = false, thrown = false, ackFailure = false, stale = false, destination = job } = {}) {
  let completed = false, leased = false, attempt = 0
  const calls = []
  return { calls, completed: () => completed, expire() { leased = false }, db: {
    async rpc(name, args) {
      calls.push([name, args])
      if (name === 'claim_storage_cleanup') {
        if (leased || completed) return { data: [], error: null }
        leased = true; attempt++
        return { data: [{ ...destination, lease_token: `lease-${attempt}` }], error: null }
      }
      assert.equal(name, 'finish_storage_cleanup')
      if (ackFailure) return { error: new Error('database offline') }
      if (stale) return { data: false, error: null }
      assert.equal(args.claim_token, `lease-${attempt}`)
      leased = false; completed = args.succeeded
      return { data: true, error: null }
    },
    storage: { from(bucket) { assert.equal(bucket, destination.bucket); return { async remove(paths) {
      calls.push(['remove', paths]);assert.deepEqual(Array.from(paths), [destination.path])
      if (thrown) throw new Error('network')
      return { data: [], error: failure ? new Error('offline') : null } // empty list = already absent
    } } } },
  } }
}

test('cleanup retries returned and thrown storage failures, and absent files complete idempotently', async () => {
  for (const options of [{ failure: true }, { thrown: true }]) {
    const h = client(options)
    assert.equal((await drainStorageCleanup(h.db)).retrying, 1)
    assert.equal(h.completed(), false)
    assert.equal((await drainStorageCleanup(h.db)).retrying, 1)
    assert.equal(h.calls.filter(c => c[0] === 'remove').length, 2)
  }
  const success = client()
  assert.equal((await drainStorageCleanup(success.db)).removed, 1)
  assert.equal(success.completed(), true)
  assert.equal((await drainStorageCleanup(success.db)).removed, 0)
  assert.equal(success.calls.filter(c => c[0] === 'remove').length, 1)
})

test('uncertain acknowledgments retain work for a lease-expiry retry; stale claims cannot complete it', async () => {
  const lost = client({ ackFailure: true })
  await assert.rejects(drainStorageCleanup(lost.db), /acknowledge/)
  assert.equal(lost.completed(), false)
  assert.equal((await drainStorageCleanup(lost.db)).removed, 0)
  lost.expire();await assert.rejects(drainStorageCleanup(lost.db), /acknowledge/)
  assert.equal(lost.calls.filter(c => c[0] === 'remove').length, 2)
  const stale = client({ stale: true })
  assert.equal((await drainStorageCleanup(stale.db)).superseded, 1)
  assert.equal(stale.completed(), false)
})

test('cleanup refuses arbitrary buckets, another owner folder and malformed object paths', async () => {
  for (const destination of [{ ...job, bucket: 'other' }, { ...job, owner_id: 'other' }, { ...job, path: `${alice}/../file.pdf` }]) {
    const h = client({ destination })
    await assert.rejects(drainStorageCleanup(h.db), /Invalid/)
    assert.equal(h.calls.some(c => c[0] === 'remove'), false)
  }
})

test('cleanup route rejects guests and preview before touching the admin client, and needs no email configuration', async () => {
  const previous = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'test-secret'
  let preview = false, touched = 0, admin = client().db
  const route = load('src/app/api/jobs/storage-cleanup/route.ts', {
    'node:crypto': { createHash, timingSafeEqual }, '@/lib/runtime': { isPreviewMode: () => preview },
    '@/lib/supabase/admin': { getSupabaseAdminClient() { touched++;return admin } },
    '@/lib/storage-cleanup': { drainStorageCleanup },
    '@/lib/storage-cleanup-fetch': { storageCleanupFetch: fetch },
  })
  const request = auth => new Request('https://commons.example.org/api/jobs/storage-cleanup', { method: 'POST', headers: auth ? { authorization: auth } : {} })
  try {
    for (const auth of [null, 'Bearer wrong']) assert.equal((await route.POST(request(auth))).status, 401)
    assert.equal(touched, 0)
    preview = true;assert.equal((await route.POST(request('Bearer test-secret'))).status, 404);assert.equal(touched, 0)
    preview = false;assert.equal((await route.POST(request('Bearer test-secret'))).status, 200)
    admin = null;assert.equal((await route.POST(request('Bearer test-secret'))).status, 503)
    admin = { rpc: async () => ({ error: new Error('offline') }) };assert.equal((await route.POST(request('Bearer test-secret'))).status, 500)
    delete process.env.CRON_SECRET;assert.equal((await route.POST(request('Bearer test-secret'))).status, 401)
  } finally { if (previous === undefined) delete process.env.CRON_SECRET;else process.env.CRON_SECRET = previous }
})

test('cleanup scheduler uses a protected origin and refuses redirects or failed jobs', async () => {
  const { dispatchStorageCleanupJob } = load('src/lib/storage-cleanup-scheduler.ts')
  let called
  await dispatchStorageCleanupJob({ appUrl: 'https://commons.example.org', secret: 'test-secret' }, async (url, options) => { called = { url: String(url), options };return { ok: true } })
  assert.equal(called.url, 'https://commons.example.org/api/jobs/storage-cleanup')
  assert.equal(called.options.headers.authorization, 'Bearer test-secret')
  assert.equal(called.options.redirect, 'manual')
  for (const appUrl of ['http://commons.example.org', 'https://commons.example.org/path', 'https://user:password@commons.example.org', 'https://commons.example.org?other=1']) await assert.rejects(dispatchStorageCleanupJob({ appUrl, secret: 's' }), /HTTPS|origin/)
  await assert.rejects(dispatchStorageCleanupJob({}), /not configured/)
  await assert.rejects(dispatchStorageCleanupJob({ appUrl: 'https://commons.example.org', secret: 's' }, async () => ({ ok: false, status: 302 })), /302/)
})


test('migrations revoke direct private cleanup-table access while retaining service access', async () => {
  const db = await database()
  try {
    for (const role of ['anon', 'authenticated']) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        const result = await db.query("SELECT has_table_privilege($1, 'public.storage_cleanup', $2) AS allowed", [role, privilege])
        assert.equal(result.rows[0].allowed, false, `${role} ${privilege}`)
      }
    }
    const service = await db.query("SELECT has_table_privilege('service_role', 'public.storage_cleanup', 'SELECT') AS allowed")
    assert.equal(service.rows[0].allowed, true)
  } finally { await db.close() }
})


test('cleanup aborts a stalled SDK removal and processes the next leased file', async () => {
  let aborted = false, deleted = 0
  const acknowledgments = []
  const second = { ...job, id: 'job-2', path: `${alice}/30000000-0000-4000-8000-000000000002.pdf` }
  const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
  const fakeFetch = async (input, init) => {
    const url = String(input)
    if (url.endsWith('/rpc/claim_storage_cleanup')) return json([job, second])
    if (url.endsWith('/rpc/finish_storage_cleanup')) { acknowledgments.push(JSON.parse(init.body).succeeded); return json(true) }
    assert.equal(init.method, 'DELETE')
    deleted++
    if (deleted === 1) return new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => { aborted = true; reject(init.signal.reason) }, { once: true })
    })
    return json([])
  }
  const { storageCleanupFetch } = load('src/lib/storage-cleanup-fetch.ts', {}, {
    fetch: fakeFetch,
    AbortSignal: { timeout(ms) { assert.equal(ms, 4000); return AbortSignal.timeout(15) }, any: AbortSignal.any },
  })
  const db = createClient('https://fixture.supabase.co', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: storageCleanupFetch },
  })
  // Keep the shortened unref'd deadline alive in the Node test runner.
  const keepAlive = setInterval(() => {}, 100)
  try {
    assert.deepEqual({ ...await drainStorageCleanup(db) }, { removed: 1, retrying: 1, superseded: 0 })
    assert.equal(aborted, true)
    assert.equal(deleted, 2)
    assert.deepEqual(acknowledgments, [false, true])
  } finally { clearInterval(keepAlive) }
})
