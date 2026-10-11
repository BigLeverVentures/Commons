import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {database,insertDemoIdentity,asUser,alice,bob,post} from './helpers/database.mjs'
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>deps[name]});return exports}
const api=load('src/lib/collaborator-credits.ts',{'./post-fields':load('src/lib/post-fields.ts')})
const id='90000000-0000-4000-8000-000000000001',other='90000000-0000-4000-8000-000000000003'
const selected={kind:'fellow',fellow_id:id,name_snapshot:'Morgan Rivera'}
test('credits preserve explicit empty selection, ordinary legacy names and distinct same-name identities',()=>{
 assert.equal(api.initialCredits([],['Old credit']).length,0)
 assert.equal(api.initialCredits(null,['Old credit'])[0].kind,'text')
 assert.equal(api.readCredits([selected,{...selected,fellow_id:other}]).length,2)
 for(const value of [[selected,selected],[{...selected,name_snapshot:''}],[{...selected,url:'https://evil.test'}],[{kind:'text',name:'Name'},{kind:'text',name:'name'}]])assert.equal(api.readCredits(value),null)
 const form=new FormData();form.set('collaborator_credits','[]');const fields=api.creditFields(form);assert.equal(fields.names.length,0)
})
test('database validates identity-backed credits and enforces canonical compatibility on direct writes',async()=>{
 const db=await database();await insertDemoIdentity(db)
 try{
  await db.query('INSERT INTO public.fellow_identities(id,display_name) VALUES($1,$2)',[other,'Morgan Rivera'])
  const credits=[selected,{...selected,fellow_id:other},{kind:'text',name:'Outside collaborator'}]
  await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description,collaborator_credits) VALUES($1,$2,'project','Our work','Story',$3)",[post,alice,JSON.stringify(credits)])
  let saved=(await db.query('SELECT * FROM public.posts WHERE id=$1',[post])).rows[0]
  assert.equal(saved.collaborators.length,3);assert.equal(saved.collaborators[0],saved.collaborators[1])
  await asUser(db,bob,"UPDATE public.posts SET collaborator_credits='[]' WHERE id=$1",[post]);assert.equal((await db.query('SELECT collaborator_credits FROM public.posts WHERE id=$1',[post])).rows[0].collaborator_credits.length,3)
  await assert.rejects(asUser(db,alice,'UPDATE public.posts SET collaborator_credits=$2 WHERE id=$1',[post,JSON.stringify([{...selected,name_snapshot:'Another person'}])]),/Invalid collaborator/)
  await db.query("UPDATE public.fellow_identities SET display_name='Morgan New',active=false WHERE id=$1",[id])
  await asUser(db,alice,"UPDATE public.posts SET title='Revised' WHERE id=$1",[post])
  await assert.rejects(asUser(db,alice,"INSERT INTO public.posts(user_id,type,title,description,collaborator_credits) VALUES($1,'ask','New','Story',$2)",[alice,JSON.stringify([selected])]),/Invalid collaborator/)
  await db.exec('SET ROLE anon');saved=(await db.query('SELECT * FROM public.public_posts WHERE id=$1',[post])).rows[0];assert.equal(saved.collaborator_credits.length,3);assert.equal('email' in saved,false);await db.exec('RESET ROLE')
  await asUser(db,alice,"UPDATE public.posts SET collaborators=ARRAY['A plain credit'] WHERE id=$1",[post]);saved=(await db.query('SELECT * FROM public.posts WHERE id=$1',[post])).rows[0];assert.equal(saved.collaborator_credits[0].kind,'text')
  await asUser(db,alice,"UPDATE public.posts SET collaborator_credits='[]' WHERE id=$1",[post]);saved=(await db.query('SELECT * FROM public.posts WHERE id=$1',[post])).rows[0];assert.equal(saved.collaborators.length,0);assert.equal(saved.collaborator_credits.length,0)
 }finally{await db.close()}
})
test('server identity validator rejects forged/new inactive credits while permitting historical snapshots',async()=>{
 const identities=new Map([[id,{id,display_name:'Morgan New',active:false}]])
 const validator=load('src/lib/validate-credits.ts',{'server-only':{},'./fellow-identity-data':{resolveFellowIdentities:async()=>identities},'./collaborator-credits':api})
 assert.equal(typeof await validator.validateCredits([selected]),'string')
 assert.equal(await validator.validateCredits([selected],[selected]),null)
 identities.get(id).active=true;identities.get(id).display_name='Morgan Rivera';assert.equal(await validator.validateCredits([selected]),null)
 assert.equal(typeof await validator.validateCredits([{...selected,name_snapshot:'Forged'}]),'string')
})
