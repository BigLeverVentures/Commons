import { test } from 'node:test'
import assert from 'node:assert/strict'
import { database, asUser, alice, bob, outsider, post } from './helpers/database.mjs'

test('database enforces fellow admission, ownership, and private responses', async () => {
  const db = await database()
  try {
    await assert.rejects(db.query('INSERT INTO auth.users VALUES ($1, $2)', [outsider, 'unknown@example.test']), /Email not allowed/)
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.fellows')).rows[0].count, 2)
    await asUser(db, alice, 'INSERT INTO public.posts(id, user_id, type, title, description) VALUES ($1, $2, $3, $4, $5)', [post, alice, 'ask', 'Field research', 'Help test a pilot.'])
    const edit = await asUser(db, bob, 'UPDATE public.posts SET title = $1 WHERE id = $2 RETURNING id', ['Hijacked', post])
    assert.equal(edit.rows.length, 0)
    await assert.rejects(asUser(db, bob, 'INSERT INTO public.posts(user_id, type, title, description) VALUES ($1, $2, $3, $4)', [alice, 'ask', 'Spoofed', 'Not mine']), /row-level security/)
    await assert.rejects(asUser(db, alice, 'INSERT INTO public.responses(post_id, user_id, note) VALUES ($1, $2, $3)', [post, alice, 'Self response']), /row-level security/)
    await asUser(db, bob, 'INSERT INTO public.responses(post_id, user_id, note) VALUES ($1, $2, $3)', [post, bob, 'I can help.'])
    await assert.rejects(asUser(db, bob, 'INSERT INTO public.responses(post_id, user_id, note) VALUES ($1, $2, $3)', [post, bob, 'Again']), /duplicate key/)
    assert.equal((await asUser(db, alice, 'SELECT * FROM public.responses')).rows.length, 1)
    assert.equal((await asUser(db, outsider, 'SELECT * FROM public.responses')).rows.length, 0)
    await asUser(db, alice, "UPDATE public.posts SET status = 'closed' WHERE id = $1", [post])
    await assert.rejects(asUser(db, outsider, 'INSERT INTO public.responses(post_id, user_id, note) VALUES ($1, $2, $3)', [post, outsider, 'Closed']), /row-level security/)
    await db.exec('SET ROLE anon')
    assert.equal((await db.query('SELECT * FROM public.posts')).rows.length, 0)
    assert.equal((await db.query('SELECT * FROM public.fellows')).rows.length, 0)
    assert.equal((await db.query('SELECT * FROM public.auth_email_allowlist')).rows.length, 0)
  } finally { await db.close() }
})

test('guests can browse every post type while comments, contacts, and directory data stay private', async () => {
  const db = await database()
  try {
    await asUser(db, alice, "INSERT INTO public.posts(id,user_id,type,title,description,is_public) VALUES ($1,$2,'project','A pilot','Come help.',true)", [post,alice])
    await asUser(db, bob, "INSERT INTO public.posts(user_id,type,title,description,is_public) VALUES ($1,'ask','An ask','Help needed.',true), ($1,'offer','An offer','I can help.',true)", [bob])
    await asUser(db, bob, "INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,'Private comment')", [post,bob])
    await asUser(db, alice, "UPDATE public.posts SET outcome_summary='It launched',built_at=now() WHERE id=$1", [post])
    await db.exec('SET ROLE anon')
    const visible = (await db.query('SELECT * FROM public.public_posts ORDER BY type')).rows
    assert.deepEqual(visible.map(p => p.type), ['ask', 'offer', 'project'])
    assert.equal(visible[2].outcome_summary, 'It launched')
    for (const p of visible) {
      for (const forbidden of ['email','user_id','bio','location','note']) assert.equal(forbidden in p, false)
    }
    assert.equal((await db.query('SELECT * FROM public.public_projects')).rows.length, 1)
    for (const table of ['posts','fellows','responses','auth_email_allowlist','directory_profiles','notification_outbox']) {
      assert.equal((await db.query('SELECT * FROM public.' + table)).rows.length, 0, table)
    }
    await assert.rejects(db.query("UPDATE public.public_posts SET title='Hijacked'"), /cannot update view/)
    await assert.rejects(db.query("INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,'Guest comment')", [post,bob]), /row-level security/)
  } finally { await db.close() }
})
