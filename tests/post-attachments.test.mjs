import { communityConfig } from './helpers/community.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { randomUUID } from 'node:crypto'
import { database, asUser, alice, bob } from './helpers/database.mjs'
function load(file, dependencies = {}) {
  dependencies = {'@/config/community': communityConfig, ...dependencies}
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  const exports = {}
  vm.runInNewContext(js,{exports,TextEncoder,process,URL,File,Buffer,console,require(name){
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`)
    return dependencies[name]
  }})
  return exports
}
const fields = load('src/lib/attachment-fields.ts')
const oldPath = `${alice}/00000000-0000-4000-8000-000000000001.pdf`
const oldFile = {path:oldPath,name:'Original.pdf',type:'application/pdf',size:100}
const pdf = () => new File(['%PDF-1.4\nA sample document'],'plan.pdf',{type:'application/pdf'})
function harness({uploadFails=false,saveFails=false,owner=true,saveCommits=false,recoveryFails=false,concurrentWrite=false}={}) {
  const calls = {uploads:[],removals:[],writes:[]}
  let current = owner ? {attachment:oldFile,updated_at:"first"} : null
  let reads = 0
  const client = {
    storage:{from(bucket){assert.equal(bucket,'post-attachments');return {
      async upload(path,bytes,options){calls.uploads.push({path,bytes,options});return {error:uploadFails?new Error('Upload failed'):null}},
      async remove(paths){calls.removals.push(...paths);return {error:null}},
    }}},
    from(table){assert.equal(table,'posts');return {
      select(){return {eq(){return this},async maybeSingle(){reads++;return {data:reads>1&&recoveryFails?null:current?{...current}:null,error:reads>1&&recoveryFails?new Error('Read failed'):null}}}},
      insert(values){calls.writes.push(values);return {select(){return {async single(){return {data:saveFails?null:{id:'new-post'},error:saveFails?new Error('Save failed'):null}}}}}},
      update(values){calls.writes.push(values);const filters=new Map();return {
        eq(key,value){filters.set(key,value);return this},select(){return this},async maybeSingle(){
          if(concurrentWrite)current={attachment:{...oldFile,path:oldPath.replace('000000000001','000000000002')},updated_at:'second'}
          const matches=current&&filters.get('updated_at')===current.updated_at
          if(matches&&(!saveFails||saveCommits))current={...values,updated_at:'saved'}
          return {data:matches&&!saveFails?{id:'post'}:null,error:saveFails?new Error('Save failed'):null}
        }
      }},
    }},
  }
  const attachments=load('src/lib/post-attachments.ts',{
    '@/lib/post-draft':load('src/lib/post-draft.ts'),
    'node:crypto':{randomUUID},'@/lib/supabase/server':{getSupabaseServerClient:async()=>client},
    '@/lib/profile-photos':load('src/lib/profile-photos.ts'),'@/lib/runtime':{isPreviewMode:()=>false},'@/lib/attachment-fields':fields,
  })
  const api=load('src/app/(app)/posts/actions.ts',{
    '@/lib/post-draft':load('src/lib/post-draft.ts'),
    'node:crypto':{randomUUID},'@/lib/post-attachments':attachments,'@/lib/attachment-fields':fields,
    '@/lib/supabase/server':{getSupabaseServerClient:async()=>client},'@/lib/mentions':load('src/lib/mentions.ts',{}),'@/lib/validate-mentions':{validateMentions:async()=>null},'@/lib/auth':{requireAuth:async()=>({id:alice})},
    '@/lib/runtime':{isPreviewMode:()=>false},'@/lib/preview':{changePreview(){throw new Error('Unexpected preview')}},
    '@/lib/website-preview':{retainedWebsitePreview:()=>null,submittedWebsitePreview:()=>null,fetchWebsitePreview:async()=>null},
    '@/lib/collaborator-credits':load('src/lib/collaborator-credits.ts',{'./post-fields':load('src/lib/post-fields.ts')}),'@/lib/validate-credits':{validateCredits:async()=>null},'@/lib/post-fields':load('src/lib/post-fields.ts'),'@/lib/post-status':load('src/lib/post-status.ts'),'@/lib/invitations': load('src/lib/invitations.ts', {'./topics':load('src/lib/topics.ts', {}),'./post-activity':load('src/lib/post-activity.ts', {})}),
    '@/lib/topics':load('src/lib/topics.ts'),
    'next/cache':{revalidatePath(){}},'next/navigation':{redirect(url){throw new Error('redirect:'+url)}},
  })
  return {api,attachments,calls,current:()=>current,commitPending(){current={...calls.writes.at(-1),updated_at:"late"}}}
}
function form(file,remove=false,type='offer') {
  const data=new FormData();for(const [key,value] of Object.entries({id:'post',type,title:'A useful offer',description:'I can help.',outcome_url:'example.test'}))data.set(key,value)
  if(file)data.set('attachment',file)
  if(remove)data.set('remove_attachment','on')
  return data
}

test('attachments reject oversized, disguised, and unsupported files before upload',async()=>{
  for(const file of [new File([Buffer.alloc(2097153)],'large.pdf',{type:'application/pdf'}),new File(['fake'],'fake.pdf',{type:'application/pdf'}),new File(['<svg/>'],'drawing.svg',{type:'image/svg+xml'})]){
    const {api,calls}=harness()
    assert.equal((await api.createPost({},form(file))).status,'error')
    assert.equal(calls.uploads.length,0);assert.equal(calls.writes.length,0)
  }
})
test('all post types save a public PDF and normalized link using the authenticated folder',async()=>{
  for(const type of ['ask','offer','project','built']){
    const {api,calls}=harness()
    await assert.rejects(api.createPost({},form(pdf(),false,type)),/redirect:/)
    const created=calls.writes[0]
    assert.equal(created.outcome_url,'https://example.test');assert.equal(created.is_public,true)
    assert.equal(created.attachment.name,'plan.pdf');assert.match(created.attachment.path,new RegExp('^'+alice+'/'))
    assert.equal(calls.uploads[0].options.contentType,'application/pdf');assert.equal(calls.removals.length,0)
  }
})
test('attachment failures preserve the old file and clean up only unused new uploads',async()=>{
  const upload=harness({uploadFails:true});assert.equal((await upload.api.updatePost({},form(pdf()))).status,'error');assert.equal(upload.calls.writes.length,0)
  const save=harness({saveFails:true});assert.equal((await save.api.updatePost({},form(pdf()))).status,'error')
  assert.deepEqual(save.calls.removals,[])
  const other=harness({owner:false});assert.equal((await other.api.updatePost({},form(pdf()))).status,'error');assert.equal(other.calls.uploads.length,0)
})
test('successful edits preserve, replace, or remove the attachment after saving',async()=>{
  const keep=harness();await assert.rejects(keep.api.updatePost({},form()),/redirect:/);assert.equal(keep.calls.writes[0].attachment.path,oldPath);assert.equal(keep.calls.removals.length,0)
  const replace=harness();await assert.rejects(replace.api.updatePost({},form(pdf())),/redirect:/);assert.deepEqual(replace.calls.removals,[]);assert.notEqual(replace.calls.writes[0].attachment.path,oldPath)
  const remove=harness();await assert.rejects(remove.api.updatePost({},form(null,true)),/redirect:/);assert.equal(remove.calls.writes[0].attachment,null);assert.deepEqual(remove.calls.removals,[])
})
test('attachment storage and post metadata enforce ownership while public views expose the attachment',async()=>{
  const db=await database()
  try{
    await asUser(db,alice,'INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)',['post-attachments',oldPath])
    await assert.rejects(asUser(db,bob,'INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)',['post-attachments',oldPath]),/row-level security/)
    assert.equal((await asUser(db,bob,'DELETE FROM storage.objects WHERE name=$1 RETURNING id',[oldPath])).rows.length,0)
    await asUser(db,alice,"INSERT INTO public.posts(user_id,type,title,description,is_public,attachment) VALUES ($1,'offer','Help','An offer',true,$2)",[alice,JSON.stringify(oldFile)])
    for(const attachment of [{...oldFile,path:oldPath.replace(alice,bob)},{...oldFile,type:null},{...oldFile,size:2097153},{...oldFile,name:''}]){
      await assert.rejects(asUser(db,alice,"UPDATE public.posts SET attachment=$1 WHERE user_id=$2",[JSON.stringify(attachment),alice]),/check constraint/)
    }
    await db.exec('SET ROLE anon')
    assert.equal((await db.query('SELECT attachment FROM public.public_posts')).rows[0].attachment.name,'Original.pdf')
    assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0)
    await assert.rejects(db.query('INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)',['post-attachments',oldPath]),/row-level security/)
  }finally{await db.close()}
})

test('share destinations persist without a sharing invitation and follow attachment replacement/removal',async()=>{
 const create=harness();const data=form(pdf());data.set('share_target','attachment')
 await assert.rejects(create.api.createPost({},data),/redirect:/)
 assert.equal(create.calls.writes[0].share_target,'attachment');assert.equal(create.calls.writes[0].sharing,null)
 const keep=harness();const keepForm=form();keepForm.set('share_target','attachment')
 await assert.rejects(keep.api.updatePost({},keepForm),/redirect:/)
 assert.equal(keep.calls.writes[0].share_target,'attachment')
 const remove=harness();const removeForm=form(null,true);removeForm.set('share_target','attachment')
 await assert.rejects(remove.api.updatePost({},removeForm),/redirect:/)
 assert.equal(remove.calls.writes[0].share_target,'post')
 const website=harness();await assert.rejects(website.api.createPost({},form()),/redirect:/)
 assert.equal(website.calls.writes[0].share_target,'website')
})


test('a lost post update response preserves an attachment that the database committed',async()=>{
  const h=harness({saveFails:true,saveCommits:true})
  const result=await h.api.updatePost({},form(pdf()))
  assert.equal(result.status,'error');assert.match(result.message,/Refresh/)
  assert.equal(h.current().attachment.path,h.calls.uploads[0].path)
  assert.equal(h.calls.removals.length,0)
})
test('uncertain post recovery preserves staged uploads rather than guessing the write outcome',async()=>{
  const h=harness({saveFails:true,recoveryFails:true})
  assert.equal((await h.api.updatePost({},form(pdf()))).status,'error')
  assert.equal(h.calls.removals.length,0)
})
test('a concurrent post save rejects a stale attachment snapshot and preserves the newer file',async()=>{
  for(const file of [null,pdf()]){
    const h=harness({concurrentWrite:true})
    assert.equal((await h.api.updatePost({},form(file))).status,'error')
    assert.equal(h.current().updated_at,'second')
    assert.notEqual(h.current().attachment.path,oldPath)
    assert.deepEqual(h.calls.removals,file?[h.calls.uploads[0].path]:[])
  }
})

test('an uncertain post write finishing later cannot lose its staged attachment',async()=>{
  for(const create of [false,true]){
    const h=harness({saveFails:true,owner:!create})
    const result=create?await h.api.createPost({},form(pdf())):await h.api.updatePost({},form(pdf()))
    assert.equal(result.status,'error');assert.equal(h.calls.removals.length,0)
    h.commitPending()
    assert.equal(h.current().attachment.path,h.calls.uploads[0].path)
    assert.equal(h.calls.removals.length,0)
  }
})
