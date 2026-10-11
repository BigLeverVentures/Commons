import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {database,asUser,alice,bob,outsider,post} from './helpers/database.mjs'
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>deps[name]});return exports}
const reactions=load('src/lib/reactions.ts')
test('reactions enforce membership, one of each kind per fellow, self exclusion, changes/removal and anonymous aggregate privacy',async()=>{
 const db=await database()
 try{
  await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES($1,$2,'project','A pilot','Work')",[post,alice])
  await assert.rejects(asUser(db,alice,"INSERT INTO public.post_reactions VALUES($1,$2,'celebrate',now())",[post,alice]),/row-level security/)
  await assert.rejects(asUser(db,outsider,"INSERT INTO public.post_reactions VALUES($1,$2,'celebrate',now())",[post,outsider]))
  await asUser(db,bob,"INSERT INTO public.post_reactions VALUES($1,$2,'celebrate',now())",[post,bob])
  await asUser(db,bob,"INSERT INTO public.post_reactions VALUES($1,$2,'inspired',now())",[post,bob])
  await asUser(db,bob,"INSERT INTO public.post_reactions VALUES($1,$2,'appreciate',now())",[post,bob])
  await assert.rejects(asUser(db,bob,"INSERT INTO public.post_reactions VALUES($1,$2,'celebrate',now())",[post,bob]),/duplicate/)
  await asUser(db,alice,"DELETE FROM public.post_reactions WHERE post_id=$1",[post])
  assert.equal((await asUser(db,bob,'SELECT * FROM public.post_reactions')).rows.length,3)
  await asUser(db,bob,"DELETE FROM public.post_reactions WHERE post_id=$1 AND kind='celebrate'",[post])
  assert.equal((await asUser(db,outsider,'SELECT * FROM public.post_reactions')).rows.length,0)
  await db.exec('SET ROLE anon')
  assert.equal((await db.query('SELECT * FROM public.post_reactions')).rows.length,0)
  const counts=(await db.query('SELECT * FROM public.reaction_counts')).rows
  assert.equal(counts.length,2);assert.equal(counts.some(row=>row.kind==='celebrate'),false);assert.ok(counts.every(row=>Number(row.count)===1));assert.equal('user_id' in counts[0],false)
  await db.exec('RESET ROLE')
  await asUser(db,bob,'DELETE FROM public.post_reactions WHERE post_id=$1',[post])
  assert.equal((await db.query('SELECT * FROM public.reaction_counts')).rows.length,0)
 }finally{await db.close()}
})
test('server rejects arbitrary reactions, preserves failed actions and gates identities before loading data',async()=>{
 let userId='bob',authorized=true
 const state={posts:[{id:'post',user_id:'alice'}],reactions:[],fellows:[{id:'bob',name:'Bob',email:'secret@example.test'}]}
 const api=load('src/app/(app)/posts/reaction-actions.ts',{
  '@/lib/auth':{requireAuth:async()=>{if(!authorized)throw new Error('Sign in');return {id:userId}}},
  'next/cache':{revalidatePath(){}},'@/lib/runtime':{isPreviewMode:()=>true},'@/lib/reactions':reactions,
  '@/lib/preview':{readPreview:()=>state,changePreview:fn=>fn(state)},'@/lib/supabase/server':{}
 })
 assert.equal((await api.reactToPost('post','celebrate')).status,'success');assert.equal(state.reactions.length,1)
 assert.equal((await api.reactToPost('post','forged')).status,'error');assert.equal(state.reactions[0].kind,'celebrate')
 await api.reactToPost('post','appreciate');await api.reactToPost('post','inspired');assert.equal(state.reactions.length,3)
 const result=await api.reactionActors('post');assert.equal(result.actors[0].name,'Bob');assert.equal('email' in result.actors[0],false)
 userId='alice';assert.equal((await api.reactToPost('post','inspired')).status,'error');assert.equal(state.reactions.length,3)
 authorized=false;await assert.rejects(api.reactionActors('post'),/Sign in/)
 authorized=true;userId='bob';await api.reactToPost('post','celebrate',true);assert.equal(state.reactions.length,2);assert.equal(state.reactions.some(row=>row.kind==='celebrate'),false)
})
test('the reaction migration preserves existing appreciation before allowing other kinds',async()=>{
 const db=await database()
 try {
  await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES($1,$2,'offer','An offer','Help')",[post,alice])
  await db.exec('ALTER TABLE public.post_reactions DROP CONSTRAINT post_reactions_pkey; ALTER TABLE public.post_reactions ADD PRIMARY KEY(post_id,user_id)')
  await asUser(db,bob,"INSERT INTO public.post_reactions VALUES($1,$2,'celebrate',now())",[post,bob])
  await db.exec(fs.readFileSync('supabase/migrations/20261009002000_independent_reactions.sql','utf8'))
  const saved=(await asUser(db,bob,'SELECT kind FROM public.post_reactions')).rows
  assert.equal(saved.length,1);assert.equal(saved[0].kind,'celebrate')
  await asUser(db,bob,"INSERT INTO public.post_reactions VALUES($1,$2,'inspired',now()),($1,$2,'appreciate',now())",[post,bob])
  assert.equal((await asUser(db,bob,'SELECT kind FROM public.post_reactions')).rows.length,3)
 }finally{await db.close()}
})
test('the signed-in reader accepts all selected kinds rather than requiring one row',async()=>{
 const selections=[]
 const db={from(table){const q={select(){return q},eq(){return q},then(resolve){selections.push(table);return Promise.resolve({data:table==='reaction_counts'?[{kind:'celebrate',count:1},{kind:'appreciate',count:1}]:[{kind:'celebrate'},{kind:'appreciate'}],error:null}).then(resolve)}};return q}}
 const api=load('src/lib/reaction-data.ts',{'server-only':{},'./supabase/server':{getSupabaseServerClient:async()=>db},'./runtime':{isPreviewMode:()=>false},'./preview':{},'./reactions':reactions})
 const result=await api.reactionsFor('post','bob')
 assert.equal(JSON.stringify(result.selected),JSON.stringify(['celebrate','appreciate']))
 assert.equal(result.counts.celebrate,1);assert.equal(result.counts.appreciate,1)
 assert.equal(selections.length,2)
})
