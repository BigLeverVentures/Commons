import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {database,asUser,alice,bob,post} from './helpers/database.mjs'
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,TextEncoder,require:name=>deps[name]});return exports}
const api=load('src/lib/mentions.ts'),id='90000000-0000-4000-8000-000000000001',label='@Morgan Rivera'
function ref(text,start){return {fellow_id:id,start,end:start+Array.from(label).length,label_snapshot:label}}
test('mention offsets use code points while text preserves whitespace and normalizes line endings',()=>{
 const text=api.normalizedBody('  🌱\r\n'+label+'  '),start=Array.from('  🌱\n').length,mention=ref(text,start)
 assert.equal(api.codePointOffset(text,text.indexOf('@')),start);assert.equal(api.utf16Offset(text,start),text.indexOf('@'))
 assert.equal(api.readMentions([mention],text).length,1);assert.equal(text.startsWith('  '),true);assert.equal(text.endsWith('  '),true)
 for(const rows of [[{...mention,start:start+1}],[mention,mention],[{...mention,url:'https://evil.test'}],[{...mention,fellow_id:'invalid'}]])assert.equal(api.readMentions(rows,text),null)
})
test('editing before/after/boundaries shifts references; editing through labels drops only affected links',()=>{
 const text=label+' built a thing',mention=ref(text,0)
 const before=api.transformMentions(text,'🌱 '+text,[mention],{start:0,end:0});assert.equal(before[0].start,2);assert.equal(before[0].end,16)
 const after=api.transformMentions(text,label+'! built a thing',[mention],{start:14,end:14});assert.equal(after[0].end,14)
 assert.equal(api.transformMentions(text,'@Morg Rivera built a thing',[mention]).length,0)
 assert.equal(api.transformMentions(text,'No one built a thing',[mention]).length,0)
 assert.equal(api.transformMentions(text,text+' today',[mention])[0].start,0)
 assert.equal(api.mentionQuery('mail deborah@example.test',24),null);assert.equal(api.mentionQuery('https://example.test/@Deb',24),null);assert.equal(api.mentionQuery('Hello @Deb',10).text,'Deb')
})
test('Postgres rejects forged, overlapping and excessive references, preserves renames and strips stale legacy spans',async()=>{
 const db=await database()
 try{
  const body='🌱 '+label+' and '+label,refs=[ref(body,2),ref(body,21)]
  await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description,description_mentions) VALUES($1,$2,'project','Together',$3,$4)",[post,alice,body,JSON.stringify(refs)])
  await assert.rejects(asUser(db,alice,'UPDATE public.posts SET description_mentions=$2 WHERE id=$1',[post,JSON.stringify([refs[0],refs[0]])]),/Invalid fellow mentions/)
  await assert.rejects(asUser(db,alice,'UPDATE public.posts SET description=$2,description_mentions=$3 WHERE id=$1',[post,'@Someone Else',JSON.stringify([{...refs[0],start:0,end:13,label_snapshot:'@Someone Else'}])]),/Invalid fellow mentions/)
  const excessive=Array.from({length:26},(_,index)=>ref('',index*(label.length+1)))
  await assert.rejects(asUser(db,alice,'UPDATE public.posts SET description=$2,description_mentions=$3 WHERE id=$1',[post,Array(26).fill(label).join(' '),JSON.stringify(excessive)]),/Invalid fellow mentions/)
  const changed='🌱 '+ 'X'.repeat(label.length)+' and '+label
  await asUser(db,alice,'UPDATE public.posts SET description=$2 WHERE id=$1',[post,changed])
  let saved=(await db.query('SELECT * FROM public.posts WHERE id=$1',[post])).rows[0];assert.equal(saved.description_mentions.length,1);assert.equal(saved.description_mentions[0].start,21)
  await db.query("UPDATE public.fellow_identities SET display_name='New Name',active=false WHERE id=$1",[id]);await asUser(db,alice,"UPDATE public.posts SET title='Still readable' WHERE id=$1",[post])
  await assert.rejects(asUser(db,alice,"INSERT INTO public.posts(user_id,type,title,description,description_mentions) VALUES($1,'ask','New',$2,$3)",[alice,label,JSON.stringify([ref(label,0)])]),/Invalid fellow mentions/)
  await db.exec('SET ROLE anon');saved=(await db.query('SELECT * FROM public.public_posts WHERE id=$1',[post])).rows[0];assert.equal(saved.description_mentions.length,1);assert.equal('note_mentions' in saved,false);await assert.rejects(db.query('SELECT public.valid_fellow_mentions($1,$2,$3,25)',[label,'[]','[]']),/permission denied/)
 }finally{await db.close()}
})
test('private note mentions save atomically and never appear in anonymous projections',async()=>{
 const db=await database()
 try{
  await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES($1,$2,'ask','Help','Story')",[post,alice])
  const body='Hi\n'+label,refs=[ref(body,3)]
  await asUser(db,bob,'INSERT INTO public.responses(post_id,user_id,note,note_mentions) VALUES($1,$2,$3,$4)',[post,bob,'Hi\r\n'+label,JSON.stringify(refs)])
  const saved=(await asUser(db,alice,'SELECT * FROM public.responses')).rows[0];assert.equal(saved.note,body);assert.equal(saved.note_mentions.length,1)
  await db.exec('SET ROLE anon');assert.equal((await db.query('SELECT * FROM public.responses')).rows.length,0)
 }finally{await db.close()}
})
test('mention identity validation accepts historical snapshots and rejects new inactive or forged labels',async()=>{
 const identity={id,display_name:'Morgan Rivera',active:true},validator=load('src/lib/validate-mentions.ts',{'server-only':{},'./fellow-identity-data':{resolveFellowIdentities:async()=>new Map([[id,identity]])}}),mention=ref(label,0)
 assert.equal(await validator.validateMentions([mention]),null);assert.equal(typeof await validator.validateMentions([{...mention,label_snapshot:'@Other'}]),'string')
 identity.active=false;identity.display_name='Changed';assert.equal(typeof await validator.validateMentions([mention]),'string');assert.equal(await validator.validateMentions([mention],[mention]),null)
})
