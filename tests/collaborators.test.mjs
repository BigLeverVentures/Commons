import { test } from 'node:test'
import assert from 'node:assert/strict'
import { database, asUser, alice, bob, post } from './helpers/database.mjs'

test('public collaborator credits preserve post ownership and private fellow records', async () => {
  const db=await database()
  try {
    await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description,status,outcome_summary,built_at,collaborators) VALUES ($1,$2,'project','An institute','Fellows built it','closed','A board came together',now(),ARRAY['Bob'])",[post,alice])
    assert.equal((await asUser(db,bob,"UPDATE public.posts SET title='Forged' WHERE id=$1 RETURNING id",[post])).rows.length,0)
    await db.exec('SET ROLE anon')
    const row=(await db.query('SELECT * FROM public.public_posts')).rows[0]
    assert.deepEqual(row.collaborators,['Bob'])
    assert.equal(row.author_name,'Alice')
    assert.ok(row.built_at)
    assert.equal('email' in row,false)
    assert.equal((await db.query('SELECT * FROM public.fellows')).rows.length,0)
    await assert.rejects(db.query("INSERT INTO public.posts(user_id,type,title,description) VALUES ($1,'project','Forged','No access')",[bob]),/row-level security/)
  } finally { await db.close() }
})

test('ended projects preserve public Built here stories and reject new responses',async()=>{
  const db=await database()
  try {
    await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description,status,outcome_summary,built_at,collaborators) VALUES ($1,$2,'project','An institute','Our work','open','We built a board',now(),ARRAY['Bob'])",[post,alice])
    await asUser(db,bob,"INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,'I can help')",[post,bob])
    await db.exec('DELETE FROM public.responses')
    await asUser(db,alice,"UPDATE public.posts SET status='ended' WHERE id=$1",[post])
    await assert.rejects(asUser(db,bob,"INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,'New interest')",[post,bob]),/row-level security/)
    assert.equal((await asUser(db,bob,"UPDATE public.posts SET status='open' WHERE id=$1 RETURNING id",[post])).rows.length,0)
    await db.exec('SET ROLE anon')
    const row=(await db.query('SELECT * FROM public.public_posts')).rows[0]
    assert.equal(row.status,'ended')
    assert.ok(row.built_at)
    assert.equal(row.outcome_summary,'We built a board')
    assert.deepEqual(row.collaborators,['Bob'])
    await db.exec('RESET ROLE')
    await asUser(db,alice,"INSERT INTO public.posts(user_id,type,title,description,status) VALUES ($1,'ask','Help','An ask','ended')",[alice])
  } finally {await db.close()}
})
