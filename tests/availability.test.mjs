import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {database,asUser,alice,bob,post} from './helpers/database.mjs'
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL});return exports}
test('labels preserve type-specific availability and support links expose only the public post reference',()=>{
 const status=load('src/lib/post-status.ts')
 assert.equal(status.postStatusLabel('closed','ask'),'Help found');assert.equal(status.postStatusLabel('closed','offer'),'Taking a pause');assert.equal(status.postStatusLabel('ended','project'),'No longer operating')
 assert.equal(status.postStatusLabel('ended','ask'),'No longer needed');assert.equal(status.postStatusLabel('ended','offer'),'No longer offered');assert.equal(status.validPostStatus('invented'),false)
 const link=new URL(load('src/lib/support.ts').supportLink(post));assert.equal(link.pathname,'support@commons.example.org');assert.equal(link.searchParams.get('body').includes(`/posts/${post}`),true);assert.equal(link.searchParams.get('body').includes('example.test'),false)
})
test('asks/offers can end without losing history or allowing new introductions or discovery invitations',async()=>{
 const db=await database()
 try{
  for(const type of ['ask','offer']){
   await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES($1,$2,$3,'An invitation','Original story')",[post,alice,type])
   await asUser(db,alice,"UPDATE public.posts SET status='ended' WHERE id=$1",[post])
   await assert.rejects(asUser(db,bob,'INSERT INTO public.responses(post_id,user_id,note) VALUES($1,$2,$3)',[post,bob,'Can help']))
   const saved=(await db.query('SELECT * FROM public.public_posts WHERE id=$1',[post])).rows[0];assert.equal(saved.description,'Original story');assert.equal(saved.status,'ended')
   assert.equal((await db.query('SELECT * FROM public.invitation_rows WHERE id=$1',[post])).rows.length,0)
   await db.query('DELETE FROM public.posts WHERE id=$1',[post])
  }
 }finally{await db.close()}
})
