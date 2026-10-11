import { communityConfig } from './helpers/community.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { randomUUID } from 'node:crypto'
import { database, asUser, alice, bob, post } from './helpers/database.mjs'

function load(file, dependencies = {}) {
 dependencies = {'@/config/community': communityConfig, ...dependencies}

  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, process, URL, File, Buffer, require(name) {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`)
    return dependencies[name]
  } })
  return exports
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=', 'base64')
const photos = load('src/lib/profile-photos.ts')
function form(photo, remove = false) {
  const data = new FormData()
  data.set('name', 'Test Fellow'); data.set('cohort', 'Cohort 4')
  if (photo) data.set('photo', photo)
  if (remove) data.set('remove_photo', 'on')
  return data
}
function profile({uploadFails = false, saveFails = false, cleanupFails = false, saveCommits = false, recoveryFails = false, concurrentWrite = false} = {}) {
  const calls = { uploads: [], removals: [], updates: [] }
  const oldPath = `${alice}/00000000-0000-4000-8000-000000000001.png`
  let current = {avatar_path:oldPath,updated_at:"first"}
  let reads = 0
  const client = {
    storage: { from(bucket) { assert.equal(bucket, 'profile-photos'); return {
      async upload(path, bytes, options) { calls.uploads.push({path, bytes, options}); return {error: uploadFails ? new Error('Upload failed') : null} },
      async remove(paths) { calls.removals.push(paths); return {error: cleanupFails ? new Error('Cleanup failed') : null} },
    } } },
    from(table) { assert.equal(table, 'fellows'); return {
      select() { const query={eq(column,value){assert.equal(column,'id');assert.equal(value,alice);return query},async single(){return query.maybeSingle()},async maybeSingle(){reads++;return {data:reads>1&&recoveryFails?null:{...current},error:reads>1&&recoveryFails?new Error('Read failed'):null}}};return query },
      update(values) { calls.updates.push(values);const filters=new Map();const query={eq(column,value){filters.set(column,value);return query},select(){return query},async maybeSingle(){
        assert.equal(filters.get('id'),alice)
        if(concurrentWrite)current={avatar_path:oldPath.replace('000000000001','000000000002'),updated_at:'second'}
        const matches=filters.get('updated_at')===current.updated_at
        if(matches&&(!saveFails||saveCommits))current={...values,updated_at:'saved'}
        return {data:matches&&!saveFails?{id:alice}:null,error:saveFails?new Error('Save failed'):null}
      }};return query },
    } },
  }
  const api = load('src/app/(app)/profile/actions.ts', {
    'node:crypto': { randomUUID }, '@/lib/profile-photos': photos,
    'next/cache': { revalidatePath() {} }, '@/lib/auth': { async requireAuth() { return {id:alice} } },
    '@/lib/topics': load('src/lib/topics.ts', {}),
    '@/lib/profile-presence': load('src/lib/profile-presence.ts', {}),
    '@/lib/topics': load('src/lib/topics.ts'), '@/lib/profile-presence': load('src/lib/profile-presence.ts'),
    '@/lib/cohorts': load('src/lib/cohorts.ts'), '@/lib/runtime': { isPreviewMode() { return false } },
    '@/lib/preview': { changePreview() { throw new Error('Unexpected preview') } },
    '@/lib/supabase/server': { async getSupabaseServerClient() { return client } },
  })
  return {...api, calls, oldPath, current:()=>current,commitPending(){current={...calls.updates.at(-1),updated_at:"late"}}}
}

test('photo validation rejects oversized, unsupported, and disguised files before upload', async () => {
  const oversized = new File([Buffer.alloc(2 * 1024 * 1024 + 1)], 'large.png', {type:'image/png'})
  for (const photo of [oversized, new File(['<svg/>'],'photo.svg',{type:'image/svg+xml'}), new File(['fake PNG'],'photo.png',{type:'image/png'})]) {
    const api = profile()
    assert.equal((await api.updateProfile({},form(photo))).status,'error')
    assert.equal(api.calls.uploads.length,0)
    assert.equal(api.calls.updates.length,0)
  }
})

test('photo replacement uses the authenticated folder and cleans up only after profile persistence', async () => {
  const api = profile()
  assert.equal((await api.updateProfile({},form(new File([png],'portrait.png',{type:'image/png'})))).status,'success')
  assert.ok(api.calls.uploads[0].path.startsWith(alice+'/'))
  assert.equal(api.calls.uploads[0].options.upsert,false)
  assert.equal(api.calls.updates[0].avatar_path,api.calls.uploads[0].path)
  assert.equal(api.calls.removals.length,0)
  const remove = profile()
  assert.equal((await remove.updateProfile({},form(null,true))).status,'success')
  assert.equal(remove.calls.updates[0].avatar_path,null)
  assert.equal(remove.calls.removals.length,0)
})

test('upload and database failures preserve the previous photo and clean up unused uploads', async () => {
  const file = new File([png],'portrait.png',{type:'image/png'})
  const upload = profile({uploadFails:true})
  assert.equal((await upload.updateProfile({},form(file))).status,'error')
  assert.equal(upload.calls.updates.length,0)
  assert.equal(upload.calls.removals.length,0)
  const save = profile({saveFails:true})
  assert.equal((await save.updateProfile({},form(file))).status,'error')
  assert.equal(save.calls.removals.length,0)
})

test('storage ownership rules block other fellows and guests while public posts expose only the photo path', async () => {
  const db = await database()
  const path = `${alice}/00000000-0000-4000-8000-000000000001.png`
  try {
    await asUser(db,alice,'INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)',['profile-photos',path])
    assert.equal((await asUser(db,bob,'SELECT * FROM storage.objects')).rows.length,0)
    assert.equal((await asUser(db,bob,'DELETE FROM storage.objects WHERE name=$1 RETURNING id',[path])).rows.length,0)
    await assert.rejects(asUser(db,bob,'INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)',['profile-photos',path]), /row-level security/)
    await assert.rejects(asUser(db,bob,'UPDATE public.fellows SET avatar_path=$1 WHERE id=$2',[path,bob]), /check constraint/)
    await asUser(db,alice,'UPDATE public.fellows SET avatar_path=$1 WHERE id=$2',[path,alice])
    await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES ($1,$2,'project','Photo test','Public post')",[post,alice])
    await db.exec('SET ROLE anon')
    assert.equal((await db.query('SELECT author_avatar_path FROM public.public_posts')).rows[0].author_avatar_path,path)
    assert.equal((await db.query('SELECT * FROM public.fellows')).rows.length,0)
    assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0)
    await assert.rejects(db.query('INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)',['profile-photos',path]), /row-level security/)
    await db.exec('RESET ROLE')
    assert.equal((await asUser(db,alice,'DELETE FROM storage.objects WHERE name=$1 RETURNING id',[path])).rows.length,1)
  } finally { await db.close() }
})


test('successful photo removal defers physical cleanup without asking for support', async () => {
  const api = profile({cleanupFails:true})
  const result = await api.updateProfile({},form(null,true))
  assert.equal(result.status,'success')
  assert.equal(result.message,'Profile successfully saved.');assert.equal(api.calls.removals.length,0)
  assert.equal(api.calls.updates[0].avatar_path,null)
})


test('a lost profile update response preserves the photo already referenced by the database',async()=>{
  const h=profile({saveFails:true,saveCommits:true})
  const result=await h.updateProfile({},form(new File([png],'portrait.png',{type:'image/png'})))
  assert.equal(result.status,'error');assert.match(result.message,/Refresh/)
  assert.equal(h.current().avatar_path,h.calls.uploads[0].path)
  assert.equal(h.calls.removals.length,0)
})
test('failed profile recovery keeps the staged photo until its write outcome is known',async()=>{
  const h=profile({saveFails:true,recoveryFails:true})
  assert.equal((await h.updateProfile({},form(new File([png],'portrait.png',{type:'image/png'})))).status,'error')
  assert.equal(h.calls.removals.length,0)
})
test('a concurrent profile save cannot restore or remove an obsolete photo reference',async()=>{
  for(const file of [null,new File([png],'portrait.png',{type:'image/png'})]){
    const h=profile({concurrentWrite:true})
    assert.equal((await h.updateProfile({},form(file))).status,'error')
    assert.equal(h.current().updated_at,'second')
    assert.notEqual(h.current().avatar_path,h.oldPath)
    assert.deepEqual(h.calls.removals.map(x=>Array.from(x)),file?[[h.calls.uploads[0].path]]:[])
  }
})

test('an uncertain profile write finishing later cannot lose its staged photo',async()=>{
  const h=profile({saveFails:true})
  assert.equal((await h.updateProfile({},form(new File([png],'portrait.png',{type:'image/png'})))).status,'error')
  assert.equal(h.calls.removals.length,0)
  h.commitPending()
  assert.equal(h.current().avatar_path,h.calls.uploads[0].path)
  assert.equal(h.calls.removals.length,0)
})
