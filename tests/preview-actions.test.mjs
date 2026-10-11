import { communityConfig } from './helpers/community.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server.js'

function load(file, dependencies) {
  dependencies = {'@/config/community': communityConfig, ...dependencies}
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, process, URL, File, Buffer, TextEncoder, require(name) {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`)
    return dependencies[name]
  } })
  return exports
}

function actions(userId = 'author', client = null) {
  const state = { posts: [{ id: 'post', user_id: 'author', status: 'open', title: 'Original' }], responses: [] }
  const api = load('src/app/(app)/posts/actions.ts', {
    'node:crypto': { randomUUID },
    '@/lib/post-draft': load('src/lib/post-draft.ts', {}),
    '@/lib/post-attachments': { stageAttachment: async () => ({attachment:null,uploadedPath:null}), removeAttachment: async () => {} },
    '@/lib/attachment-fields': load('src/lib/attachment-fields.ts', {}),
    '@/lib/website-preview': { fetchWebsitePreview: async () => null, retainedWebsitePreview: () => null, submittedWebsitePreview: () => null, readWebsitePreview: () => null },
    '@/lib/post-status': load('src/lib/post-status.ts', {}),
    '@/lib/post-fields': load('src/lib/post-fields.ts', {}),
    '@/lib/collaborator-credits': load('src/lib/collaborator-credits.ts', {'./post-fields':load('src/lib/post-fields.ts', {})}),
    '@/lib/validate-credits': {validateCredits:async()=>null},
    '@/lib/invitations': load('src/lib/invitations.ts', {'./topics':load('src/lib/topics.ts', {})}),
    '@/lib/topics': load('src/lib/topics.ts', {}),
    'next/navigation': { redirect(url) { throw new Error(`redirect:${url}`) } },
    'next/cache': { revalidatePath() {} },
    '@/lib/mentions':load('src/lib/mentions.ts',{}),'@/lib/validate-mentions':{validateMentions:async()=>null},'@/lib/auth': { async requireAuth() { return { id: userId } } },
    '@/lib/runtime': { isPreviewMode() { return !client } },
    '@/lib/preview': { readPreview:()=>state, changePreview(change) { return change(state) } },
    '@/lib/supabase/server': { getSupabaseServerClient() { if (client) return client; throw new Error('Preview must never use the real database') } },
  })
  return { api, state }
}
function form(fields) { const data = new FormData(); for (const [k,v] of Object.entries(fields)) data.set(k,v); return data }

test('preview mutations enforce authorship, open posts, and one response per fellow', async () => {
  const author = actions()
  assert.equal((await author.api.respondToPost({}, form({ post_id: 'post', note: 'Self' }))).status, 'error')
  const other = actions('other')
  const fields = form({ id: 'post', title: 'Forged', description: 'Not my post' })
  assert.equal((await other.api.updatePost({}, fields)).status, 'error')
  assert.equal(other.state.posts[0].title, 'Original')
  await assert.rejects(other.api.updatePostStatus('post', 'closed'), /cannot edit/)
  assert.equal((await other.api.respondToPost({}, form({ post_id: 'post', note: 'Happy to help' }))).status, 'success')
  assert.equal(other.state.responses.length, 1)
  assert.equal((await other.api.respondToPost({}, form({ post_id: 'post', note: 'Again' }))).status, 'error')
  other.state.posts[0].status = 'closed'
  assert.equal((await other.api.respondToPost({}, form({ post_id: 'post', note: 'Too late' }))).status, 'error')
  await author.api.updatePostStatus('post', 'closed')
  assert.equal(author.state.posts[0].status, 'closed')
})

test('preview cannot be enabled in a production process', () => {
  const runtime = load('src/lib/runtime.ts', {})
  const oldEnv = process.env.COMMONS_LOCAL_PREVIEW, oldNode = process.env.NODE_ENV
  try {
    process.env.COMMONS_LOCAL_PREVIEW = 'true'; process.env.NODE_ENV = 'production'
    assert.equal(runtime.isPreviewMode(), false)
    process.env.NODE_ENV = 'development'
    assert.equal(runtime.isPreviewMode(), true)
  } finally {
    if (oldEnv === undefined) delete process.env.COMMONS_LOCAL_PREVIEW; else process.env.COMMONS_LOCAL_PREVIEW = oldEnv
    if (oldNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNode
  }
})

test('preview login rejects cross-site requests and preserves the browser host on redirect', async () => {
  const { POST } = load('src/app/api/preview/login/route.ts', {
    'next/server': { NextResponse }, '@/lib/runtime': { isPreviewMode: () => true },
    '@/lib/preview': { PREVIEW_COOKIE: 'preview', readPreview: () => ({ fellows: [{ id:'author' }] }) },
  })
  const request = origin => new NextRequest('http://localhost:3100/api/preview/login', {
    method: 'POST', headers: { origin, host: '127.0.0.1:3100' }, body: form({ fellow:'author' }),
  })
  assert.equal((await POST(request('http://unrelated.test'))).status, 403)
  const response = await POST(request('http://127.0.0.1:3100'))
  assert.equal(response.headers.get('location'), 'http://127.0.0.1:3100/board')
  assert.equal(response.cookies.get('preview').value, 'author')
})

test('Built here editing checks ownership and dangerous links through the current action', async () => {
  const fields = { id:'post', type:'built', title:'Institute', description:'We launched.', outcome_url:'https://example.test' }
  const other = actions('other')
  assert.equal((await other.api.updatePost({},form(fields))).status,'error')
  const {api,state} = actions()
  for (const url of ['javascript:alert(1)', 'file:///tmp/private', 'https://user:password@example.test']) {
    assert.equal((await api.updatePost({},form({...fields,outcome_url:url}))).status,'error')
    assert.equal(state.posts[0].title,'Original')
  }
  await assert.rejects(api.updatePost({},form(fields)),/saved=updated/)
  assert.equal(state.posts[0].outcome_summary,'We launched.')
  assert.equal(state.posts[0].outcome_url,'https://example.test')
  assert.ok(state.posts[0].built_at)
})

test('profile saves standardize cohort names and reject invalid choices without changing the profile', async () => {
  const state = { fellows: [{ id: 'author', name: 'Original', cohort: 'Cohort 4' }] }
  const { updateProfile } = load('src/app/(app)/profile/actions.ts', {
    'node:crypto': { randomUUID },
    '@/lib/profile-photos': load('src/lib/profile-photos.ts', {}),
    'next/cache': { revalidatePath() {} },
    '@/lib/mentions':load('src/lib/mentions.ts',{}),'@/lib/validate-mentions':{validateMentions:async()=>null},'@/lib/auth': { async requireAuth() { return { id: 'author' } } },
    '@/lib/invitations': load('src/lib/invitations.ts', {'./topics':load('src/lib/topics.ts', {})}),
    '@/lib/topics': load('src/lib/topics.ts', {}),
    '@/lib/profile-presence': load('src/lib/profile-presence.ts', {}),
    '@/lib/cohorts': load('src/lib/cohorts.ts', {}),
    '@/lib/runtime': { isPreviewMode() { return true } },
    '@/lib/preview': { readPreview:()=>state, changePreview(change) { return change(state) } },
    '@/lib/supabase/server': { getSupabaseServerClient() { throw new Error('Preview must never use the real database') } },
  })
  for (const cohort of ['Cohort 9', 'Cohort seven', '0', 'Cohort 4 extra']) {
    assert.equal((await updateProfile({}, form({ name: 'Changed', cohort }))).status, 'error')
    assert.equal(state.fellows[0].name, 'Original')
    assert.equal(state.fellows[0].cohort, 'Cohort 4')
  }
  for (const cohort of ['7', ' cohort 7 ', 'COHORT7']) {
    assert.equal((await updateProfile({}, form({ name: 'Changed', cohort }))).status, 'success')
    assert.equal(state.fellows[0].cohort, 'Cohort 7')
  }
  assert.equal((await updateProfile({}, form({ name: 'Changed', cohort: '' }))).status, 'success')
  assert.equal(state.fellows[0].cohort, null)
})


test('Built here creation works without a prior post and normalizes collaborator credits', async () => {
  const {api,state} = actions()
  const fields = {type:'built',title:'A completed institute',description:'Fellows joined the board.',collaborators:' Morgan Rivera, Sam Patel, morgan rivera, ',outcome_url:'https://example.test',topic:'learning'}
  await assert.rejects(api.createPost({},form(fields)), /redirect:\/posts\/.*\?saved=built/)
  const created=state.posts.at(-1)
  assert.equal(created.type,'project')
  assert.equal(created.status,'closed')
  assert.equal(created.outcome_summary,fields.description)
  assert.equal(created.outcome_url,fields.outcome_url)
  assert.ok(created.built_at)
  assert.deepEqual(Array.from(created.collaborators),['Morgan Rivera','Sam Patel'])
  for (const outcome_url of ['javascript:alert(1)','https://user:password@example.test']) {
    assert.equal((await api.createPost({},form({...fields,outcome_url}))).status,'error')
  }
  assert.equal(state.posts.length,2)
})

test('collaborator credits apply to every post type and only the author can edit them', async () => {
  for (const type of ['ask','offer','project']) {
    const {api,state}=actions()
    await assert.rejects(api.createPost({},form({type,title:'Collaboration',description:'A good connection.',collaborators:'Maya Chen'})), /saved=created/)
    assert.deepEqual(Array.from(state.posts.at(-1).collaborators),['Maya Chen'])
    assert.equal(state.posts.at(-1).built_at,null)
  }
  const {api,state}=actions()
  await assert.rejects(api.updatePost({},form({id:'post',title:'Updated',description:'Credit a colleague',collaborators:'Morgan Rivera'})),/saved=updated/)
  assert.deepEqual(Array.from(state.posts[0].collaborators),['Morgan Rivera'])
  assert.equal((await api.updatePost({},form({id:'post',title:'Too many',description:'Rejected',collaborators:Array.from({length:21},(_,i)=>'Name '+i).join(',')}))).status,'error')
  assert.equal(state.posts[0].title,'Updated')
})

test('Built here publication accepts a bare domain and stores an https link', async () => {
  const {api,state}=actions()
  await assert.rejects(api.createPost({},form({type:'built',title:'A completed project',description:'We built together.',outcome_url:'project.example.org'})),/saved=built/)
  assert.equal(state.posts.at(-1).outcome_url,'https://project.example.org')
})

test('Built here milestone persists independently across all project states',async()=>{
  for(const status of ['open','closed','ended']) {
    const {api,state}=actions()
    await assert.rejects(api.createPost({},form({type:'built',title:'A built institute',description:'A fellowship board came together.',collaboration_status:status})),/saved=built/)
    const created=state.posts.at(-1)
    assert.equal(created.status,status)
    assert.ok(created.built_at)
    assert.equal(created.outcome_summary,'A fellowship board came together.')
    await api.updatePostStatus(created.id,status==='open'?'ended':'open')
    assert.ok(created.built_at)
    assert.equal(created.outcome_summary,'A fellowship board came together.')
  }
  const {api,state}=actions()
  assert.equal((await api.createPost({},form({type:'built',title:'A built institute',description:'Our story',collaboration_status:'invalid'}))).status,'error')
  assert.equal(state.posts.length,1)
  await api.updatePostStatus('post','ended')
  assert.equal(state.posts[0].status,'ended')
})


test('every post type can create, edit, and clear a normalized website link', async () => {
  for (const type of ['ask', 'offer', 'project', 'built']) {
    const { api, state } = actions()
    await assert.rejects(api.createPost({}, form({ type, title: 'Linked post', description: 'Our work', outcome_url: 'example.test' })), /saved=/)
    const post = state.posts.at(-1)
    assert.equal(post.outcome_url, 'https://example.test')
    await assert.rejects(api.updatePost({}, form({ id: post.id, title: post.title, description: post.description, outcome_url: 'another.test' })), /saved=updated/)
    assert.equal(post.outcome_url, 'https://another.test')
    await assert.rejects(api.updatePost({}, form({ id: post.id, title: post.title, description: post.description })), /saved=updated/)
    assert.equal(post.outcome_url, null)
    assert.equal((await api.updatePost({}, form({ id: post.id, title: post.title, description: post.description, outcome_url: 'javascript:alert(1)' }))).status, 'error')
    assert.equal(post.outcome_url, null)
  }
})


test('participation and sharing invitations publish atomically, retain first dates, and validate before mutation',async()=>{
 const {api,state}=actions()
 const values={type:'offer',title:'Mentoring',description:'Happy to help',participation_enabled:'on',participation_text:'Bring your pitch',participation_kind:'offer',sharing_enabled:'on',sharing_text:'Help reach founders'}
 await assert.rejects(api.createPost({},form(values)),/redirect:/)
 const saved=state.posts.at(-1)
 assert.equal(saved.participation.text,'Bring your pitch');assert.equal(saved.sharing.text,'Help reach founders');assert.ok(saved.participation_published_at)
 const published=saved.participation_published_at
 await assert.rejects(api.updatePost({},form({...values,id:saved.id,participation_text:'Bring your first idea'})),/redirect:/)
 assert.equal(saved.participation_published_at,published)
 assert.equal(saved.participation.text,'Bring your first idea')
 const count=state.posts.length
 assert.equal((await api.createPost({},form({...values,sharing_text:'x'.repeat(161)}))).status,'error')
 assert.equal(state.posts.length,count)
 const confirmed=await api.confirmPostCurrent(saved.id)
 assert.equal(confirmed.status,'success');assert.ok(saved.confirmed_at);assert.equal(saved.participation_published_at,published)
})

test('selected credits publish and clear atomically while pending ordinary names are retained',async()=>{
 const {api,state}=actions()
 const selected={kind:'fellow',fellow_id:'90000000-0000-4000-8000-000000000001',name_snapshot:'Morgan Rivera'}
 await assert.rejects(api.createPost({},form({type:'built',title:'Institute',description:'Built together',collaborator_credits:JSON.stringify([selected]),collaborator_names_draft:'Outside colleague'})),/saved=built/)
 const saved=state.posts.at(-1)
 assert.equal(saved.collaborator_credits.length,2);assert.equal(saved.collaborator_credits[0].fellow_id,selected.fellow_id);assert.equal(saved.collaborators[1],'Outside colleague')
 await assert.rejects(api.updatePost({},form({id:saved.id,title:saved.title,description:saved.description,collaborator_credits:'[]'})),/saved=updated/)
 assert.equal(saved.collaborators.length,0);assert.equal(saved.collaborator_credits.length,0)
 const count=state.posts.length
 assert.equal((await api.createPost({},form({type:'ask',title:'New',description:'Draft',collaborator_credits:'broken'}))).status,'error');assert.equal(state.posts.length,count)
})


test('selected mentions create Built here references together, keep one editable story, and validate before saving',async()=>{
 const {api,state}=actions(),label='@Morgan Rivera',mention={fellow_id:'90000000-0000-4000-8000-000000000001',start:2,end:16,label_snapshot:label},description='🌱 '+label+' joined'
 await assert.rejects(api.createPost({},form({type:'built',title:'Together',description,description_mentions:JSON.stringify([mention])})),/saved=built/)
 const saved=state.posts.at(-1);assert.equal(saved.description_mentions.length,1);assert.equal(saved.outcome_mentions.length,1)
 await assert.rejects(api.updatePost({},form({id:saved.id,title:saved.title,description:'A new ordinary story',description_mentions:'[]'})),/saved=updated/)
 assert.equal(saved.description_mentions.length,0);assert.equal(saved.outcome_mentions.length,0);assert.equal(saved.outcome_summary,'A new ordinary story')
 const count=state.posts.length;assert.equal((await api.createPost({},form({type:'offer',title:'Invalid',description,description_mentions:JSON.stringify([{...mention,start:1}])}))).status,'error');assert.equal(state.posts.length,count)
})


test('retrying a creation whose response was lost returns the same post', async () => {
  const {api,state} = actions()
  const id = randomUUID()
  const draft = form({submission_id:id,type:'offer',title:'Recoverable offer',description:'The same draft'})
  await assert.rejects(api.createPost({},draft), new RegExp(`redirect:/posts/${id}`))
  await assert.rejects(api.createPost({},draft), new RegExp(`redirect:/posts/${id}`))
  assert.equal(state.posts.filter(post=>post.id===id).length,1)
  const other = actions('other')
  other.state.posts.push(state.posts.at(-1))
  assert.equal((await other.api.createPost({},draft)).status,'error')
  assert.equal((await api.createPost({},form({submission_id:'invalid',type:'ask',title:'Invalid',description:'Id'}))).status,'error')
})


test('database retry recovers a committed insert with a lost response, without duplicates or another author access', async()=>{
 const posts=new Map(), writes=[]
 let loseResponse=true,lookupFailure=false
 const client={from(){return {
   select(){const filters={};return {eq(key,value){filters[key]=value;return this},async maybeSingle(){const post=posts.get(filters.id);return {data:!lookupFailure&&post?.user_id===filters.user_id?post:null,error:lookupFailure?{message:'network failure'}:null}}}},
   insert(values){writes.push(values);const conflict=posts.has(values.id);if(!conflict)posts.set(values.id,values);return {select(){return {async single(){const lost=loseResponse;loseResponse=false;return {data:lost||conflict?null:{id:values.id},error:conflict?{code:'23505'}:lost?{message:'response lost'}:null}}}}}},
 }}}
 const {api}=actions('author',client),id=randomUUID(),draft=form({submission_id:id,type:'offer',title:'One offer',description:'Saved once'})
 await assert.rejects(api.createPost({},draft),new RegExp(`redirect:/posts/${id}`))
 await assert.rejects(api.createPost({},draft),new RegExp(`redirect:/posts/${id}`))
 assert.equal(writes.length,1);assert.equal(posts.size,1)
 const other=actions('other',client)
 assert.equal((await other.api.createPost({},draft)).status,'error');assert.equal(posts.get(id).user_id,'author')
 const attempts=writes.length
 lookupFailure=true
 assert.equal((await api.createPost({},draft)).status,'error');assert.equal(writes.length,attempts)
})

 test('marking an existing post Built here keeps identity and milestone across edits', async()=>{
 const {api,state}=actions();const p=state.posts[0];p.description='Initial ask';p.created_at='2026-01-01T00:00:00Z'
 await assert.rejects(api.updatePost({},form({id:p.id,type:'built',title:'We launched',description:'Latest story'})),/saved=updated/)
 const milestone=p.built_at;assert.ok(milestone);assert.equal(p.description,p.outcome_summary);assert.equal(state.posts.length,1)
 await assert.rejects(api.updatePost({},form({id:p.id,title:p.title,description:'Funding secured'})),/saved=updated/)
 assert.equal(p.built_at,milestone);assert.equal(p.outcome_summary,'Funding secured');assert.equal(p.created_at,'2026-01-01T00:00:00Z')
 assert.equal((await api.updatePost({},form({id:p.id,title:p.title,description:'x'.repeat(1001)}))).status,'error');assert.equal(p.description,'Funding secured')
 })
 test('legacy Built here story preserves latest text and mentions without mutating stored originals',()=>{
 const {withPostStory}=load('src/lib/post-story.ts',{});const p={built_at:'2026-01-01',description:'Original',description_mentions:[],outcome_summary:'Latest',outcome_mentions:[{label_snapshot:'@Fellow'}]}
 const shown=withPostStory(p);assert.equal(shown.description,'Latest');assert.equal(shown.description_mentions.length,1);assert.equal(p.description,'Original');assert.equal(withPostStory({...p,built_at:null}).description,'Original')
 })
