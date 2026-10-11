import { communityConfig } from './helpers/community.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { database,asUser,alice,bob,post } from './helpers/database.mjs'
const exports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/notifications.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,AbortSignal,fetch,require:name=>name==='@/config/community'?communityConfig:undefined})

test('responses queue once; private delivery jobs cannot be invoked by fellows or guests', async () => {
  const db = await database()
  try {
    await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES ($1,$2,'ask','A pilot','Help in the field')",[post,alice])
    await asUser(db,bob,'INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,$3)',[post,bob,'Happy to help'])
    assert.equal((await db.query('SELECT * FROM public.notification_outbox')).rows.length,1)
    assert.equal((await asUser(db,alice,'SELECT * FROM public.notification_outbox')).rows.length,0)
    await assert.rejects(asUser(db,bob,'SELECT public.claim_notifications(10)'),/permission denied/)
    await assert.rejects(asUser(db,alice,"UPDATE public.fellows SET email='unverified@example.test' WHERE id=$1",[alice]),/administrator/)
    await db.exec('SET ROLE service_role')
    assert.equal((await db.query('SELECT * FROM public.claim_notifications(10)')).rows.length,1)
    assert.equal((await db.query('SELECT * FROM public.claim_notifications(10)')).rows.length,0)
    await db.exec('RESET ROLE')
    await db.exec("UPDATE public.notification_outbox SET lease_expires_at=now()-interval '1 minute'")
    const retry = (await db.query('SELECT * FROM public.claim_notifications(10)')).rows
    assert.equal(retry.length,1)
    assert.equal(retry[0].attempts,2)
  } finally { await db.close() }
})

test('quiet-post nudges respect age, responses, outcome, preferences, and monthly limits', async () => {
  const db = await database()
  try {
    await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description,updated_at) VALUES ($1,$2,'project','Quiet pilot','Still looking',now()-interval '20 days')",[post,alice])
    await asUser(db,alice,"INSERT INTO public.posts(user_id,type,title,description,updated_at) VALUES ($1,'ask','Another quiet post','Still looking',now()-interval '25 days')",[alice])
    await db.query('SELECT public.queue_quiet_post_nudges()')
    await db.query('SELECT public.queue_quiet_post_nudges()')
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.notification_outbox WHERE kind='nudge'")).rows[0].n,1)
    await asUser(db,bob,"UPDATE public.fellows SET email_notifications=false WHERE id=$1",[bob])
    await asUser(db,bob,"INSERT INTO public.posts(user_id,type,title,description,updated_at) VALUES ($1,'ask','Quiet opted-out post','No mail',now()-interval '30 days')",[bob])
    await db.query('SELECT public.queue_quiet_post_nudges()')
    assert.equal((await db.query('SELECT * FROM public.notification_outbox')).rows.length,1)
    await asUser(db,bob,'INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,$3)',[post,bob,'I can help'])
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.notification_outbox WHERE kind='response'")).rows[0].n,1)
    await asUser(db,alice,"UPDATE public.fellows SET introduction_emails=false WHERE id=$1",[alice])
    const more = (await asUser(db,alice,"INSERT INTO public.posts(user_id,type,title,description) VALUES ($1,'ask','A new ask','Help') RETURNING id",[alice])).rows[0].id
    await asUser(db,bob,'INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,$3)',[more,bob,'Happy to help'])
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.notification_outbox WHERE kind='response'")).rows[0].n,1)
  } finally { await db.close() }
})

test('provider delivery is plain text, uses a stable idempotency key, and surfaces rejection', async () => {
  const draft = exports.notificationDraft('response','event-1','fellow@example.test',{id:'project-1',title:'A title\r\nwith a newline'},'https://board.example.test')
  let request
  await exports.sendNotification(draft,{key:'test-key',from:'commons@example.test'},async (url,options) => { request={url,options}; return {ok:true,json:async () => ({id:'sent-1'})} })
  assert.equal(request.url,'https://api.resend.com/emails')
  assert.equal(request.options.headers['Idempotency-Key'],'commons-event-1')
  const payload = JSON.parse(request.options.body)
  assert.deepEqual(payload.to,['fellow@example.test'])
  assert.equal('html' in payload,false)
  assert.ok(!/[\r\n]/.test(payload.subject))
  assert.match(payload.text,/https:\/\/board.example.test\/posts\/project-1/)
  await assert.rejects(exports.sendNotification(draft,{key:'test-key',from:'commons@example.test'},async () => ({ok:false,status:429})),/429/)
})

test('notification job rejects missing credentials and is always disabled in preview', async () => {
  const { NextRequest,NextResponse } = await import('next/server.js')
  const crypto = await import('node:crypto')
  let preview = false, adminCalls = 0
  const route = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/jobs/notifications/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
    exports:route, URL, process:{env:{CRON_SECRET:'job-secret'}}, require(name) {
      if (name === 'node:crypto') return crypto
      if (name === 'next/server') return {NextResponse}
      if (name === '@/lib/runtime') return {isPreviewMode:() => preview}
      if (name === '@/lib/supabase/admin') return {getSupabaseAdminClient:() => {adminCalls++;return null}}
      if (name === '@/lib/notifications') return exports
      throw new Error(name)
    },
  })
  const req = token => new NextRequest('https://board.example.test/api/jobs/notifications',{method:'POST',headers:token ? {authorization:`Bearer ${token}`} : {}})
  assert.equal((await route.POST(req())).status,401)
  assert.equal((await route.POST(req('wrong'))).status,401)
  assert.equal(adminCalls,0)
  assert.equal((await route.POST(req('job-secret'))).status,503)
  preview = true
  assert.equal((await route.POST(req('job-secret'))).status,404)
})

test('delivery rechecks opt-outs and stale reminders, records success, and retries provider failures', async () => {
  const { NextRequest,NextResponse } = await import('next/server.js')
  const crypto = await import('node:crypto')
  for (const scenario of ['opt-out','closed','updated','deliver','retry','unconfirmed','wrong-post','missing-response']) {
    const changes = [], messages = []
    const row = {id:'event-1',post_id:post,recipient_id:alice,response_id:scenario === 'missing-response' ? null : 'response-1',kind:['closed','updated'].includes(scenario) ? 'nudge' : 'response',attempts:1}
    const db = {
      rpc:async name => ({data:name === 'claim_notifications' ? [row] : null,error:null}),
      auth:{admin:{getUserById:async id => ({data:{user:{email:'verified@example.test',email_confirmed_at:scenario === 'unconfirmed' && id === bob ? null : new Date().toISOString()}},error:null})}},
      from(table) {
        let update
        const query = {
          select() { return query },eq() { return query },
          update(value) { update=value; changes.push(value); return query },
          async maybeSingle() { return {error:null,data:table === 'posts' ? {id:post,user_id:alice,title:'A pilot',status:scenario === 'closed' ? 'closed' : 'open',built_at:null,updated_at:scenario === 'updated' ? new Date().toISOString() : '2020-01-01'} : table === 'responses' ? {post_id:scenario === 'wrong-post' ? 'another-post' : post,user_id:bob,note:'Please review my pitch'} : {name:'Bob',cohort:'Cohort 2',introduction_emails:scenario !== 'opt-out',email_notifications:scenario !== 'opt-out'}} },
          then(resolve,reject) { return Promise.resolve(update ? {error:null} : {count:0,error:null}).then(resolve,reject) },
        }
        return query
      },
    }
    const route = {}
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/jobs/notifications/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
      exports:route,URL,Error,process:{env:{CRON_SECRET:'secret',RESEND_API_KEY:'test-key',EMAIL_FROM:'commons@example.test',APP_URL:'https://board.example.test'}},require(name) {
        if (name === 'node:crypto') return crypto
        if (name === 'next/server') return {NextResponse}
        if (name === '@/lib/runtime') return {isPreviewMode:() => false}
        if (name === '@/lib/supabase/admin') return {getSupabaseAdminClient:() => db}
        if (name === '@/lib/notifications') return {...exports,sendNotification:async draft => {messages.push(draft);if (scenario === 'retry') throw new Error('Provider rejected (429)')}}
        throw new Error(name)
      },
    })
    const response = await route.POST(new NextRequest('https://board.example.test/api/jobs/notifications',{method:'POST',headers:{authorization:'Bearer secret'}}))
    const result = await response.json()
    if (['opt-out','closed','updated'].includes(scenario)) {
      assert.equal(result.cancelled,1); assert.equal(messages.length,0); assert.ok(changes[0].cancelled_at)
    } else if (scenario === 'deliver') {
      assert.equal(result.sent,1); assert.equal(messages[0].to,'verified@example.test'); assert.ok(changes[0].delivered_at)
    } else if (['unconfirmed','wrong-post','missing-response'].includes(scenario)) {
      assert.equal(response.status,502); assert.equal(result.failed,1); assert.equal(messages.length,0); assert.ok(changes[0].last_error)
    } else {
      assert.equal(response.status,502); assert.equal(result.failed,1); assert.match(changes[0].last_error,/429/); assert.ok(new Date(changes[0].next_attempt_at).getTime() > Date.now()); assert.equal(changes[0].lease_expires_at,null)
    }
  }
})


test('introduction email includes the private note and verified Reply-To, without trusting header content', async () => {
  const draft = exports.introductionDraft('event-2','author@example.test',{id:'post-2',title:'Mentoring\r\n'},'https://board.example.test',{name:'Bob\r\n',cohort:'Cohort 2',email:'bob@example.test',note:'Could you review my pitch?'})
  let payload
  await exports.sendNotification(draft,{key:'test',from:'commons@example.test'},async (_url,options) => { payload=JSON.parse(options.body);return {ok:true,json:async()=>({id:'sent-2'})} })
  assert.equal(payload.reply_to,'bob@example.test')
  assert.match(payload.text,/Could you review my pitch/)
  assert.match(payload.text,/Reply to this email/)
  assert.ok(!/[\r\n]/.test(payload.subject))
  assert.throws(() => exports.introductionDraft('e','author@example.test',{id:'p',title:'T'},'https://board.example.test',{name:'B',cohort:null,email:'bob@example.test\r\nBcc:bad@example.test',note:'N'}),/reply address/)
})

test('introduction preference is independent from quiet reminders and queues an explicit response reference', async () => {
  const db=await database()
  try {
    await asUser(db,alice,"UPDATE public.fellows SET email_notifications=false,introduction_emails=true WHERE id=$1",[alice])
    await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES ($1,$2,'offer','Mentoring','Happy to help')",[post,alice])
    const response=(await asUser(db,bob,'INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,$3) RETURNING id',[post,bob,'Can we connect?'])).rows[0]
    const queued=(await db.query('SELECT * FROM public.notification_outbox')).rows[0]
    assert.equal(queued.response_id,response.id)
    assert.equal(queued.kind,'response')
    assert.equal((await asUser(db,bob,'SELECT * FROM public.notification_outbox')).rows.length,0)
  } finally {await db.close()}
})


test('scheduler uses a secret header, refuses redirects and surfaces job failures', async () => {
  const scheduler={}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/notification-scheduler.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:scheduler,URL,AbortSignal,fetch,Error})
  let request
  await scheduler.dispatchNotificationJob({appUrl:'https://board.example.test',secret:'test-secret'},async (url,options)=>{request={url:String(url),options};return {ok:true}})
  assert.equal(request.url,'https://board.example.test/api/jobs/notifications')
  assert.equal(request.options.headers.authorization,'Bearer test-secret')
  assert.equal(request.options.redirect,'manual')
  await assert.rejects(scheduler.dispatchNotificationJob({appUrl:'https://board.example.test',secret:'s'},async()=>({ok:false,status:302})),/302/)
  await assert.rejects(scheduler.dispatchNotificationJob({appUrl:'http://board.example.test',secret:'s'}),/HTTPS/)
  await assert.rejects(scheduler.dispatchNotificationJob({appUrl:'https://board.example.test/path',secret:'s'}),/origin/)
  await assert.rejects(scheduler.dispatchNotificationJob({}),/not configured/)
  await assert.rejects(scheduler.dispatchNotificationJob({appUrl:'https://board.example.test',secret:'s'},async()=>({ok:false,status:503})),/503/)
})
