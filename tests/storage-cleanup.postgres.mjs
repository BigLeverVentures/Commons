import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import pg from 'pg'
import { initializeDatabase, alice, bob, post } from './helpers/database.mjs'

// This suite creates/drops only its own disposable database on a local test server.
// CI supplies PostgreSQL 17; PGlite cannot exercise simultaneous sessions.
test('PostgreSQL retirement is atomic, private, fenced and serialized against reassignment', async () => {
  assert.ok(process.env.POSTGRES_TEST_URL, 'Set POSTGRES_TEST_URL to a disposable local PostgreSQL server.')
  const url = new URL(process.env.POSTGRES_TEST_URL)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Only a local test server is allowed.')
  const admin = new pg.Client({ connectionString: url.href })
  await admin.connect()
  const name = `commons_cleanup_${process.pid}`
  await admin.query(`CREATE DATABASE ${name}`)
  url.pathname = '/' + name
  const clients = [new pg.Client({ connectionString: url.href }), new pg.Client({ connectionString: url.href }), new pg.Client({ connectionString: url.href })]
  const [db, a, b] = clients
  try {
    await Promise.all(clients.map(c => c.connect()))
    await initializeDatabase({ exec: sql => db.query(sql), query: (sql, args) => db.query(sql, args) })
    const second = '20000000-0000-4000-8000-000000000002'
    const path = `${alice}/30000000-0000-4000-8000-000000000001.pdf`
    const attachment = { path, name: 'report.pdf', type: 'application/pdf', size: 20 }
    const insert = async (id, file = null) => db.query("INSERT INTO public.posts(id,user_id,type,title,description,attachment) VALUES($1,$2,'offer','Test','Test',$3)", [id, alice, file])
    const count = async () => Number((await db.query('SELECT count(*) FROM public.storage_cleanup')).rows[0].count)
    const reset = async () => db.query('TRUNCATE public.posts CASCADE; TRUNCATE public.storage_cleanup')
    const begin = async c => { await c.query('BEGIN'); await c.query('SET LOCAL ROLE authenticated'); await c.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [alice]) }
    const blocked = async c => {
      const pid = Number((await db.query("SELECT pid FROM pg_stat_activity WHERE application_name=$1", [c === b ? 'cleanup-b' : 'cleanup-a'])).rows[0].pid)
      for (let i = 0; i < 200; i++) {
        const state = (await db.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid])).rows[0]
        if (state?.wait_event_type === 'Lock') return
        await delay(10)
      }
      assert.fail('Expected a real connection waiting on a database lock')
    }
    await a.query("SET application_name='cleanup-a'"); await b.query("SET application_name='cleanup-b'")
    await a.query("SET statement_timeout='10s'"); await b.query("SET statement_timeout='10s'")

    // Failed mutation rolls back its queued retirement. CAS rejects a stale delete.
    await insert(post, attachment)
    await begin(a); await a.query('DELETE FROM public.posts WHERE id=$1', [post])
    await a.query('SET LOCAL ROLE service_role')
    assert.equal((await a.query('SELECT count(*) FROM public.storage_cleanup')).rows[0].count, '1')
    await a.query('ROLLBACK')
    assert.equal(await count(), 0)
    const before = (await db.query('SELECT updated_at::text AS stamp FROM public.posts WHERE id=$1', [post])).rows[0].stamp
    await db.query("UPDATE public.posts SET title='Edited' WHERE id=$1", [post])
    await begin(a)
    assert.equal((await a.query('DELETE FROM public.posts WHERE id=$1 AND updated_at=$2 RETURNING id', [post, before])).rows.length, 0)
    await a.query('COMMIT'); assert.equal(await count(), 0)

    // Retirement owns the path first: competing reference assignment really waits,
    // then sees the committed tombstone and fails instead of dangling after cleanup.
    await reset(); await insert(post, attachment); await insert(second)
    await begin(a); await a.query('DELETE FROM public.posts WHERE id=$1', [post])
    await begin(b)
    const assigning = b.query('UPDATE public.posts SET attachment=$1 WHERE id=$2', [attachment, second]).then(() => ({ ok: true }), error => ({ error }))
    await blocked(b); await a.query('COMMIT')
    assert.match((await assigning).error.message, /retired/)
    await b.query('ROLLBACK'); assert.equal(await count(), 1)
    assert.equal((await db.query('SELECT attachment FROM public.posts WHERE id=$1', [second])).rows[0].attachment, null)

    // Assignment owns the path first: retirement waits and preserves the other
    // committed reference. The last remaining reference queues cleanup exactly once.
    await reset(); await insert(post, attachment); await insert(second)
    await begin(a); await a.query('UPDATE public.posts SET attachment=$1 WHERE id=$2', [attachment, second])
    await begin(b)
    const deleting = b.query('DELETE FROM public.posts WHERE id=$1 RETURNING id', [post])
    await blocked(b); await a.query('COMMIT'); assert.equal((await deleting).rows.length, 1)
    await b.query('COMMIT'); assert.equal(await count(), 0)
    await db.query('DELETE FROM public.posts WHERE id=$1', [second]); assert.equal(await count(), 1)

    // Private table/RPC boundary: members and guests cannot inspect or operate jobs.
    await begin(a)
    await assert.rejects(a.query('SELECT * FROM public.storage_cleanup'), /permission denied/)
    await a.query('ROLLBACK'); await begin(a)
    await assert.rejects(a.query('SELECT public.claim_storage_cleanup(10)'), /permission denied/)
    await a.query('ROLLBACK')
    await b.query('BEGIN'); await b.query('SET LOCAL ROLE anon')
    await assert.rejects(b.query('SELECT * FROM public.storage_cleanup'), /permission denied/)
    await b.query('ROLLBACK'); await b.query('BEGIN'); await b.query('SET LOCAL ROLE anon')
    await assert.rejects(b.query("INSERT INTO public.storage_cleanup(owner_id,bucket,path) VALUES($1,'post-attachments',$2)", [bob, path]), /permission denied/)
    await b.query('ROLLBACK')
    await assert.rejects(db.query("INSERT INTO public.storage_cleanup(owner_id,bucket,path) VALUES($1,'other',$2)", [alice, path]), /check constraint/)
    await assert.rejects(db.query("INSERT INTO public.storage_cleanup(owner_id,bucket,path) VALUES($1,'profile-photos',$2)", [bob, path]), /check constraint/)

    // Retry delay and expired-lease fencing; completed tombstone rejects resurrection.
    await a.query('SET ROLE service_role')
    const first = (await a.query('SELECT * FROM public.claim_storage_cleanup(10)')).rows[0]
    assert.equal((await a.query('SELECT * FROM public.claim_storage_cleanup(10)')).rows.length, 0)
    await db.query("UPDATE public.storage_cleanup SET lease_expires_at=now()-interval '1 minute'")
    const newer = (await a.query('SELECT * FROM public.claim_storage_cleanup(10)')).rows[0]
    assert.notEqual(newer.lease_token, first.lease_token)
    assert.equal((await a.query('SELECT public.finish_storage_cleanup($1,$2,true) AS accepted', [first.id, first.lease_token])).rows[0].accepted, false)
    assert.equal((await a.query('SELECT public.finish_storage_cleanup($1,$2,false) AS accepted', [newer.id, newer.lease_token])).rows[0].accepted, true)
    assert.equal((await a.query('SELECT * FROM public.claim_storage_cleanup(10)')).rows.length, 0)
    await db.query("UPDATE public.storage_cleanup SET next_attempt_at=now()-interval '1 minute'")
    const retry = (await a.query('SELECT * FROM public.claim_storage_cleanup(10)')).rows[0]
    assert.equal(retry.attempts, 3)
    await a.query('SELECT public.finish_storage_cleanup($1,$2,true)', [retry.id, retry.lease_token])
    await a.query('RESET ROLE'); await insert(post)
    await begin(a); await assert.rejects(a.query('UPDATE public.posts SET attachment=$1 WHERE id=$2', [attachment, post]), /retired/); await a.query('ROLLBACK')

    // Profile clearing/recreation uses the same invariant without deleting activity.
    const photo = `${alice}/30000000-0000-4000-8000-000000000002.png`
    await db.query('UPDATE public.fellows SET avatar_path=$1 WHERE id=$2', [photo, alice])
    await begin(a); await a.query('UPDATE public.fellows SET avatar_path=NULL,name=NULL WHERE id=$1', [alice]); await a.query('COMMIT')
    assert.equal((await db.query("SELECT count(*) FROM public.storage_cleanup WHERE bucket='profile-photos'")).rows[0].count, '1')
    await begin(a); await assert.rejects(a.query('UPDATE public.fellows SET avatar_path=$1 WHERE id=$2', [photo, alice]), /retired/); await a.query('ROLLBACK')
    assert.equal((await db.query('SELECT count(*) FROM public.posts')).rows[0].count, '1')
  } finally {
    await Promise.all(clients.map(c => c.end()))
    await admin.query(`DROP DATABASE ${name} WITH (FORCE)`)
    await admin.end()
  }
})
