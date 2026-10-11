import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function load(file,deps={}) {
  const exports={}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,TextEncoder,URL,URLSearchParams,AbortSignal,fetch,Response,Request,require:name=>deps[name]})
  return exports
}
const api=load('src/lib/website-preview.ts',{'@/lib/collaborator-credits':load('src/lib/collaborator-credits.ts',{'./post-fields':load('src/lib/post-fields.ts')}),'@/lib/validate-credits':{validateCredits:async()=>null},'@/lib/post-fields':load('src/lib/post-fields.ts')})
const preview={url:'https://example.org',title:'A fellowship project',description:'Built together.',image:'https://iad.microlink.io/example.png'}

test('website previews fetch only through the fixed provider and reject local or credential-bearing URLs',async()=>{
  let calls=0
  for (const url of ['http://localhost','http://127.0.0.1','http://[::1]','http://192.168.1.1','http://foo.local','https://user:pass@example.org','https://example.org:8080','file:///tmp/private']) {
    assert.equal(await api.fetchWebsitePreview(url,async()=>{calls++;throw new Error('Unexpected')}),null)
  }
  assert.equal(calls,0)
  const result=await api.fetchWebsitePreview(preview.url,async(url,options)=>{
    calls++
    assert.equal(url.origin,'https://api.microlink.io')
    assert.equal(url.searchParams.get('url'),preview.url)
    assert.equal(url.searchParams.get('screenshot'),'true')
    assert.equal(options.redirect,'manual')
    assert.equal(options.credentials,'omit')
    return new Response(JSON.stringify({status:'success',data:{title:preview.title,description:preview.description,screenshot:{url:preview.image}}}))
  })
  assert.equal(result.image,preview.image)
  assert.equal(calls,1)
})

test('malformed, stale, unsafe, and rate-limited previews degrade without blocking publication',async()=>{
  assert.equal(api.readWebsitePreview(preview,'https://different.org'),null)
  assert.equal(api.readWebsitePreview({...preview,image:'http://localhost/private'}),null)
  assert.equal(api.readWebsitePreview({...preview,image:'https://private.internal/image.png'}),null)
  assert.equal(api.readWebsitePreview({...preview,title:'x'.repeat(181)}),null)
  for(const response of [new Response(null,{status:302,headers:{Location:'https://elsewhere.example'}}),new Response('{}',{status:429}),new Response('invalid JSON'),new Response(JSON.stringify({status:'success',data:{screenshot:{url:'file:///private'}}}))]) {
    assert.equal(await api.fetchWebsitePreview(preview.url,async()=>response),null)
  }
  assert.equal(await api.fetchWebsitePreview(preview.url,async()=>{throw new Error('Timeout')}),null)
  const form=new FormData();form.set('link_preview',JSON.stringify(preview))
  assert.equal(api.submittedWebsitePreview(form,preview.url).image,preview.image)
  assert.equal(api.submittedWebsitePreview(form,'https://new.org'),null)
})

test('preview API returns JSON without navigating, authenticates before capture, and normalizes domains',async()=>{
  let calls=0
  let user=null
  const route=load('src/app/api/website-preview/route.ts',{
    '@/lib/mentions':load('src/lib/mentions.ts',{}),'@/lib/validate-mentions':{validateMentions:async()=>null},'@/lib/auth':{currentUser:async()=>user},
    '@/lib/collaborator-credits':load('src/lib/collaborator-credits.ts',{'./post-fields':load('src/lib/post-fields.ts')}),'@/lib/validate-credits':{validateCredits:async()=>null},'@/lib/post-fields':load('src/lib/post-fields.ts'),
    '@/lib/post-attachments': { stageAttachment: async () => ({attachment:null,uploadedPath:null}), removeAttachment: async () => {} },
    '@/lib/attachment-fields': load('src/lib/attachment-fields.ts', {}),
    '@/lib/website-preview':{...api,fetchWebsitePreview:async link=>{calls++;return {...preview,url:link}}},
  })
  const request=(url,headers={'X-Commons-Preview':'1'})=>new Request('https://commons.example.org/api/website-preview?url='+encodeURIComponent(url),{headers})
  const guest=await route.GET(request('example.org'))
  assert.equal(guest.status,401)
  assert.equal(guest.headers.get('location'),null)
  assert.equal(guest.headers.get('cache-control'),'private, no-store')
  assert.equal(calls,0)
  user={id:'fellow'}
  assert.equal((await route.GET(request('example.org',{}))).status,403)
  assert.equal((await route.GET(request('http://localhost'))).status,400)
  assert.equal(calls,0)
  const success=await route.GET(request('example.org'))
  assert.equal(success.status,200)
  assert.equal((await success.json()).preview.url,'https://example.org')
  assert.equal(calls,1)
})

test('website addresses normalize without accepting unsafe protocols or credentials',()=>{
  const fields=load('src/lib/post-fields.ts')
  for(const [raw,expected] of [[' project.example.org ','https://project.example.org'],['www.example.org/work?q=1','https://www.example.org/work?q=1'],['https://example.org','https://example.org'],['http://example.org','http://example.org'],['//example.org','https://example.org'],['','']]) {
    assert.equal(fields.normalizeProjectLink(raw),expected)
  }
  for(const raw of ['javascript:alert(1)','mailto:person@example.org','https://user:pass@example.org','not a website']) assert.equal(fields.validProjectLink(fields.normalizeProjectLink(raw)),false)
})

test('publishing a matching author preview saves it without fetching a second screenshot',async()=>{
  let calls=0
  const state={posts:[]}
  const action=load('src/app/(app)/posts/actions.ts',{
    '@/lib/post-draft':load('src/lib/post-draft.ts'),
    'node:crypto':{randomUUID:()=> 'new-post'},
    'next/navigation':{redirect:url=>{throw new Error('redirect:'+url)}},
    'next/cache':{revalidatePath(){}},
    '@/lib/mentions':load('src/lib/mentions.ts',{}),'@/lib/validate-mentions':{validateMentions:async()=>null},'@/lib/auth':{requireAuth:async()=>({id:'author'})},
    '@/lib/runtime':{isPreviewMode:()=>true},
    '@/lib/preview':{changePreview:change=>change(state)},
    '@/lib/supabase/server':{getSupabaseServerClient(){throw new Error('Unexpected database')}},
    '@/lib/invitations': load('src/lib/invitations.ts', {'./topics':load('src/lib/topics.ts', {})}),
    '@/lib/topics':{TOPICS:[]},
    '@/lib/post-status':load('src/lib/post-status.ts'),
    '@/lib/collaborator-credits':load('src/lib/collaborator-credits.ts',{'./post-fields':load('src/lib/post-fields.ts')}),'@/lib/validate-credits':{validateCredits:async()=>null},'@/lib/post-fields':load('src/lib/post-fields.ts'),
    '@/lib/post-attachments': { stageAttachment: async () => ({attachment:null,uploadedPath:null}), removeAttachment: async () => {} },
    '@/lib/attachment-fields': load('src/lib/attachment-fields.ts', {}),
    '@/lib/website-preview':{...api,fetchWebsitePreview:async()=>{calls++;return null}},
  })
  const form=new FormData()
  for(const [key,value] of Object.entries({type:'built',title:'A completed project',description:'We did it.',outcome_url:preview.url,link_preview:JSON.stringify(preview)})) form.set(key,value)
  await assert.rejects(action.createPost({},form),/saved=built/)
  assert.equal(calls,0)
  assert.equal(state.posts[0].link_preview.image,preview.image)
})

test('website social images take precedence over screenshots and unsafe images fall back',async()=>{
 for(const image of ['https://cdn.example.org/social.png','http://localhost/image.png']) {
  const result=await api.fetchWebsitePreview(preview.url,async()=>new Response(JSON.stringify({status:'success',data:{title:'Website',image:{url:image},screenshot:{url:preview.image}}})))
  assert.equal(result.image,image.startsWith('https://')?image:preview.image)
 }
})


test('full post and field capture share server success, browser fallback, and admission failures',async()=>{
 const capture=load('src/lib/capture-website-preview.ts',{'@/lib/website-preview':api}).captureWebsitePreview
 let calls=[]
 const fallback=await capture(preview.url,async(url)=>{
  calls.push(String(url))
  return String(url).startsWith('/api/')?new Response(JSON.stringify({preview:null})):new Response(JSON.stringify({status:'success',data:{title:preview.title,description:preview.description,image:{url:preview.image}}}))
 })
 assert.equal(fallback.preview.image,preview.image)
 assert.equal(calls.length,2)
 calls=[]
 const server=await capture(preview.url,async(url)=>{calls.push(String(url));return new Response(JSON.stringify({preview}))})
 assert.equal(server.preview.image,preview.image)
 assert.equal(calls.length,1)
 calls=[]
 const denied=await capture(preview.url,async(url)=>{calls.push(String(url));return new Response(JSON.stringify({message:'Please sign in again.'}),{status:401})})
 assert.equal(denied.preview,null)
 assert.equal(denied.message,'Please sign in again.')
 assert.equal(calls.length,1)
 let attempt=0
 const timeout=await capture(preview.url,async()=>{if(++attempt===1)throw new Error('Timeout');return new Response(JSON.stringify({status:'success',data:{title:preview.title,image:{url:preview.image}}}))})
 assert.equal(timeout.preview.image,preview.image)
 const failed=await capture(preview.url,async()=>new Response('{}',{status:429}))
 assert.equal(failed.preview,null)
 assert.ok(failed.message.includes('Retry'))
})


test('editing preserves a saved preview only for the unchanged website',()=>{
 const form=new FormData()
 assert.equal(api.retainedWebsitePreview(form,preview.url,preview).image,preview.image)
 form.set('link_preview','invalid capture')
 assert.equal(api.retainedWebsitePreview(form,preview.url,preview).image,preview.image)
 assert.equal(api.retainedWebsitePreview(form,'https://changed.org',preview),null)
 assert.equal(api.retainedWebsitePreview(form,'',preview),null)
 const replacement={...preview,image:'https://cdn.example.org/new.png'}
 form.set('link_preview',JSON.stringify(replacement))
 assert.equal(api.retainedWebsitePreview(form,preview.url,preview).image,replacement.image)
})
