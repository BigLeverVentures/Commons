import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { database, asUser, alice, bob, post } from './helpers/database.mjs'

function load(file, dependencies = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {exports,require(name){if (!(name in dependencies)) throw new Error(name); return dependencies[name]}})
  return exports
}
function api(state, options = {}) {
  return load('src/app/(app)/deletion-actions.ts', {
    'next/navigation':{redirect(url){throw new Error(`redirect:${url}`)}},
    'next/cache':{revalidatePath(){}},
    '@/lib/auth':{requireAuth:async()=>{if(options.guest) throw new Error('redirect:/login');return {id:alice}}},
    '@/lib/runtime':{isPreviewMode:()=>!options.db},
    '@/lib/preview':{changePreview:change=>change(state)},
    '@/lib/supabase/server':{getSupabaseServerClient:async()=>options.db},
    '@/lib/profile-photos':{PHOTO_BUCKET:'profile-photos'},
    '@/lib/attachment-fields':load('src/lib/attachment-fields.ts'),
  })
}
function state() { return {fellows:[{id:alice,email:'alice@example.test',name:'Alice',bio:'Bio',avatar_path:'photo',interests:['care']},{id:bob,name:'Bob'}],posts:[{id:post,user_id:alice},{id:'other',user_id:bob}],responses:[{post_id:post,user_id:bob},{post_id:'other',user_id:alice}],reactions:[{post_id:post,user_id:bob},{post_id:'other',user_id:alice}]} }
function confirmation(value='DELETE') {const form=new FormData();form.set('confirmation',value);return form}

test('profile deletion requires typed confirmation and preserves sign-in, posts and reactions',async()=>{
  const data=state(), action=api(data)
  assert.equal((await action.deleteProfile({},confirmation('delete'))).status,'error')
  assert.equal(data.fellows[0].name,'Alice')
  await assert.rejects(action.deleteProfile({},confirmation()),/redirect:\/profile\?deleted=1/)
  assert.equal(data.fellows[0].name,null);assert.equal(data.fellows[0].avatar_path,null)
  assert.equal(data.fellows[0].email,'alice@example.test');assert.equal(data.fellows[0].introduction_emails,false)
  assert.equal(data.fellows[1].name,'Bob');assert.equal(data.posts.length,2);assert.equal(data.reactions.length,2)
})
test('post deletion rejects other owners and removes only the selected post dependencies',async()=>{
  const data=state(), action=api(data)
  assert.equal((await action.deletePost('other')).status,'error')
  assert.equal(data.posts.length,2)
  await assert.rejects(action.deletePost(post),/redirect:\/board/)
  assert.deepEqual(data.posts.map(p=>p.id),['other'])
  assert.deepEqual(data.responses.map(p=>p.post_id),['other'])
  assert.deepEqual(data.reactions.map(p=>p.post_id),['other'])
})
test('signed-out deletion never mutates content',async()=>{
  const data=state(), action=api(data,{guest:true})
  await assert.rejects(action.deletePost(post),/redirect:\/login/)
  await assert.rejects(action.deleteProfile({},confirmation()),/redirect:\/login/)
  assert.equal(data.posts.length,2);assert.equal(data.fellows[0].name,'Alice')
})
function client({foreign=false,storageFailure=false,writeFailure=false}={}) {
  const events=[]
  const path=`${alice}/30000000-0000-4000-8000-000000000001.pdf`
  return {events,storage:{from(bucket){return {async remove(paths){events.push(['storage',bucket,paths]);return {error:storageFailure?new Error('offline'):null}}}}},from(table){
    let operation='read';const filters=[]
    const query={select(){return query},eq(key,value){filters.push([key,value]);return query},update(value){operation='update';events.push(['update',value]);return query},delete(){operation='delete';events.push(['delete']);return query},async maybeSingle(){
      events.push(['query',table,operation,filters])
      if(operation!=='read')return {data:writeFailure?null:{id:table==='posts'?post:alice},error:null}
      if(foreign&&table==='posts')return {data:null,error:null}
      return {data:table==='posts'?{id:post,updated_at:'timestamp',attachment:{path,name:'report.pdf',type:'application/pdf',size:10}}:{avatar_path:`${alice}/photo.png`,updated_at:'timestamp'},error:null}
    }};return query
  }}
}
test('production deletion never touches storage and keeps CAS guards',async()=>{
  const foreign=client({foreign:true})
  assert.equal((await api(null,{db:foreign}).deletePost(post)).status,'error')
  assert.equal(foreign.events.some(e=>e[0]==='storage'),false)
  for(const profile of [false,true]) {
    const db=client({storageFailure:true}),action=api(null,{db})
    await assert.rejects(profile?action.deleteProfile({},confirmation()):action.deletePost(post),/redirect:/)
    assert.equal(db.events.some(e=>e[0]==='storage'),false)
    const mutation=db.events.find(e=>e[0]==='query'&&e[2]===(profile?'update':'delete'))
    assert.deepEqual(JSON.parse(JSON.stringify(mutation[3])),profile?[['id',alice],['updated_at','timestamp']]:[['id',post],['user_id',alice],['updated_at','timestamp']])
    const failed=client({writeFailure:true}),failedAction=api(null,{db:failed})
    const result=profile?await failedAction.deleteProfile({},confirmation()):await failedAction.deletePost(post)
    assert.equal(result.status,'error');assert.match(result.message,/could not be confirmed deleted/)
    assert.equal(failed.events.some(e=>e[0]==='storage'),false)
  }
})
test('database enforces owner deletion, cascades dependencies, and profile clearing retains reactions',async()=>{
  const db=await database()
  try {
    await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES ($1,$2,'offer','Help','A post')",[post,alice])
    await asUser(db,bob,"INSERT INTO public.responses(post_id,user_id,note) VALUES ($1,$2,'Hi')",[post,bob])
    await asUser(db,bob,"INSERT INTO public.post_reactions(post_id,user_id,kind) VALUES ($1,$2,'celebrate')",[post,bob])
    await asUser(db,bob,'UPDATE public.fellows SET name=NULL,bio=NULL,avatar_path=NULL WHERE id=$1',[bob])
    assert.equal((await db.query('SELECT count(*) FROM public.post_reactions')).rows[0].count,1)
    assert.equal((await asUser(db,bob,'DELETE FROM public.posts WHERE id=$1 RETURNING id',[post])).rows.length,0)
    await db.exec('SET ROLE anon')
    assert.equal((await db.query('DELETE FROM public.posts WHERE id=$1 RETURNING id',[post])).rows.length,0)
    await db.exec('RESET ROLE')
    assert.equal((await asUser(db,alice,'DELETE FROM public.posts WHERE id=$1 RETURNING id',[post])).rows.length,1)
    for(const table of ['responses','post_reactions','notification_outbox'])assert.equal((await db.query(`SELECT count(*) FROM public.${table}`)).rows[0].count,0,table)
    assert.equal((await db.query('SELECT count(*) FROM public.fellows')).rows[0].count,2)
  } finally {await db.close()}
})
