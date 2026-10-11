import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {database,asUser,alice,bob,post} from './helpers/database.mjs'
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL,process,require:name=>deps[name]});return exports}
const fields=load('src/lib/post-fields.ts'),files=load('src/lib/attachment-fields.ts')
const {shareDestination}=load('src/lib/share-destination.ts',{'./post-fields':fields,'./attachment-fields':files})
const file={path:`${alice}/00000000-0000-4000-8000-000000000001.pdf`,name:'Report.pdf',type:'application/pdf',size:100}
test('sharing resolves only the chosen saved resource and degrades missing destinations to the public post',()=>{
 const item={id:post,outcome_url:'https://example.org',attachment:file}
 assert.equal(shareDestination(item).url,item.outcome_url)
 assert.equal(shareDestination({...item,share_target:'post'}).url,`https://commons.example.org/posts/${post}`)
 assert.equal(shareDestination({...item,share_target:'attachment'},'https://backend.example.org').url,`https://backend.example.org/storage/v1/object/public/post-attachments/${file.path}`)
 assert.equal(shareDestination({...item,share_target:'attachment',attachment:null}).kind,'post')
 assert.equal(shareDestination({...item,outcome_url:'javascript:alert(1)',share_target:'website'}).kind,'post')
 assert.equal(shareDestination({...item,share_target:'attachment',attachment:{...file,path:'../../private'}}).kind,'post')
})
test('share destination storage is owner-only and the public projection exposes no private account data',async()=>{
 const db=await database()
 try {
  await asUser(db,alice,"INSERT INTO posts(id,user_id,type,title,description,share_target) VALUES ($1,$2,'project','Test','Story','post')",[post,alice])
  await assert.rejects(asUser(db,alice,"UPDATE posts SET share_target='https://evil.org' WHERE id=$1",[post]),/valid_share_target/)
  assert.equal((await asUser(db,bob,"UPDATE posts SET share_target='website' WHERE id=$1 RETURNING id",[post])).rows.length,0)
  await db.exec('SET ROLE anon')
  const visible=(await db.query('SELECT * FROM public_posts WHERE id=$1',[post])).rows[0]
  assert.equal(visible.share_target,'post')
  for(const key of ['email','user_id','note','introduction_emails'])assert.equal(key in visible,false)
 }finally{await db.close()}
})
