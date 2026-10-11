import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {database,asUser,alice} from './helpers/database.mjs'
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Response,require:name=>deps[name]});return exports}
const identity=load('src/lib/fellow-identity.ts')
test('identity search uses literal bounded queries and verified profile destinations',()=>{
 assert.equal(identity.identityQuery('x'),null);assert.equal(identity.identityQuery('x'.repeat(81)),null)
 assert.equal(identity.literalPattern('a%_b'),'%a\\%\\_b%')
 for(const value of ['http://directory.example.org/#/fellow/morgan_rivera','https://evil.test/#/fellow/morgan_rivera','https://user:pass@directory.example.org/#/fellow/morgan_rivera','https://directory.example.org/#/fellow/../bad','javascript:alert(1)'])assert.equal(identity.directoryDestination(value),null)
 assert.equal(identity.directoryDestination(identity.DEMO_IDENTITY.directory_url),identity.DEMO_IDENTITY.directory_url)
 const result=identity.safeSearchResult({...identity.DEMO_IDENTITY,email:'private@example.test'})
 assert.equal('email' in result,false);assert.equal('directory_url' in result,false);assert.equal(result.has_directory_link,true)
})
test('identity and source indexes stay private, permit same-name people, and do not grant admission',async()=>{
 const db=await database()
 try{
  const seed=(await db.query('SELECT * FROM public.fellow_identities')).rows[0];assert.equal(seed.display_name,'Morgan Rivera');assert.equal(seed.cohort,null)
  await assert.rejects(asUser(db,alice,'SELECT * FROM public.fellow_identities'),/permission denied/)
  await assert.rejects(asUser(db,alice,"INSERT INTO public.fellow_identities(display_name) VALUES('Forged')"),/permission denied/)
  await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT * FROM public.fellow_directory_sources'),/permission denied/);await db.exec('RESET ROLE')
  await db.exec("INSERT INTO public.fellow_identities(display_name,cohort) VALUES('Morgan Rivera','Cohort 4')")
  assert.equal((await db.query("SELECT * FROM public.fellow_identities WHERE display_name='Morgan Rivera'")).rows.length,2)
  await assert.rejects(db.exec("UPDATE public.fellow_identities SET directory_url='https://evil.test/person'"),/check constraint/)
  await db.query("INSERT INTO public.fellow_directory_sources VALUES('test','stable-source',$1)",[seed.id])
  await assert.rejects(db.query("INSERT INTO public.fellow_directory_sources VALUES('test','stable-source',$1)",[seed.id]),/duplicate/)
  assert.equal((await db.query("SELECT * FROM public.auth_email_allowlist WHERE email='morgan@example.test'")).rows.length,0)
 }finally{await db.close()}
})
test('search route authenticates before querying and never caches identity responses publicly',async()=>{
 let user=null,calls=0
 const {GET}=load('src/app/api/fellows/search/route.ts',{'@/lib/auth':{currentUser:async()=>user},'@/lib/runtime':{isPreviewMode:()=>true},'@/lib/fellow-identity':identity,'@/lib/fellow-identity-data':{searchFellowIdentities:async()=>{calls++;return [identity.safeSearchResult(identity.DEMO_IDENTITY)]}},'@/lib/supabase/server':{}})
 const request=value=>new Request('https://commons.example.org/api/fellows/search?q='+value)
 assert.equal((await GET(request('Deb'))).status,401);assert.equal(calls,0)
 user={id:alice};assert.equal((await GET(request('D'))).status,400);assert.equal(calls,0)
 const result=await GET(request('Deb'));assert.equal(result.status,200);assert.equal(result.headers.get('Cache-Control'),'private, no-store');const body=await result.json();assert.equal(body.fellows.length,1);assert.match(body.coverage,/pending/);assert.equal('email' in body.fellows[0],false)
})
test('batch resolver degrades safely and suppresses deactivated or unverified destinations',async()=>{
 const rows=[{...identity.DEMO_IDENTITY,active:false},{...identity.DEMO_IDENTITY,id:'90000000-0000-4000-8000-000000000002',directory_url:'https://evil.test'}]
 const api=load('src/lib/fellow-identity-data.ts',{'server-only':{},'./runtime':{isPreviewMode:()=>false},'./fellow-identity':identity,'./supabase/admin':{getSupabaseAdminClient:()=>({from:()=>({select:()=>({in:async()=>({data:rows})})})})}})
 assert.equal((await api.resolveFellowIdentities(['bad'])).size,0)
 const result=await api.resolveFellowIdentities(rows.map(row=>row.id));assert.equal(result.size,2);assert.equal(result.get(rows[0].id).directory_url,null);assert.equal(result.get(rows[1].id).directory_url,null)
})
