import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {randomUUID} from 'node:crypto'
function load(file) {
  const exports={}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,setTimeout,clearTimeout})
  return exports
}
const {snapshotDraft,readDraft,draftKey,hasDraftContent}=load('src/lib/post-draft.ts')
const {recoverableSave}=load('src/lib/recoverable-save.ts')
const idle={status:'idle'}
test('offline and rejected saves return inline errors without changing the draft or marking success',async()=>{
 const data=new FormData();data.set('type','offer');data.set('description','Keep this text')
 let calls=0,saved=0
 const action=async()=>{calls++;throw new TypeError('Failed to fetch')}
 const options={online:false,onSaved:()=>saved++}
 assert.match((await recoverableSave(action,idle,data,options)).message,/offline/)
 assert.equal(calls,0)
 assert.equal((await recoverableSave(action,idle,data,{...options,online:true})).status,'error')
 assert.equal(saved,0);assert.equal(data.get('description'),'Keep this text');assert.equal(data.get('type'),'offer')
})
test('a stalled save releases the editor for retry, and late rejection is handled',async()=>{
 let rejectAction
 const result=await recoverableSave(()=>new Promise((_,reject)=>{rejectAction=reject}),idle,new FormData(),{online:true,onSaved:()=>assert.fail(),timeoutMs:5})
 assert.equal(result.status,'error');assert.match(result.message,/confirm/)
 rejectAction(new TypeError('Connection eventually failed'))
 await new Promise(resolve=>setTimeout(resolve,5))
})
test('navigation exceptions are preserved; only confirmed publication clears a draft',async()=>{
 let saved=0
 for(const digest of ['NEXT_REDIRECT;push;/posts/123?saved=created;303;','NEXT_REDIRECT;push;/login;303;','NEXT_HTTP_ERROR_FALLBACK;404']) {
   const exception={digest,handled:true}
   await assert.rejects(recoverableSave(async()=>{throw exception},idle,new FormData(),{online:true,onSaved:()=>saved++}),error=>error===exception)
 }
 assert.equal(saved,1)
 const failure={status:'error',message:'Validation failed'}
 assert.equal(await recoverableSave(async()=>failure,idle,new FormData(),{online:true,onSaved:()=>saved++}),failure)
 assert.equal(saved,1)
})
test('reload drafts retain invalid text, type, invitations, selected identities, preview, and attachment reminder',()=>{
 const form=new FormData()
 const values={type:'built',title:'Our institute',description:'x'.repeat(2100),tags:'education, ai',topic:'learning',share_target:'attachment',collaboration_status:'open',participation_enabled:'on',participation_text:'Come join us',participation_kind:'collaboration',sharing_enabled:'on',sharing_text:'Share our work',collaborator_credits:'[{"kind":"text","name":"Morgan Rivera"}]',collaborator_names_draft:'Another colleague',description_mentions:'[]',website_url_draft:'example.test',outcome_url:'https://example.test',link_preview:'{"url":"https://example.test"}'}
 for(const [key,value] of Object.entries(values))form.set(key,value)
 form.set('attachment',new File(['%PDF-1.4'],'project.pdf',{type:'application/pdf'}));form.set('password','never store');form.set('user_id','never trust')
 const id=randomUUID(),draft=snapshotDraft(form,id),raw=JSON.stringify(draft)
 const restored=readDraft(raw)
 for(const [key,value] of Object.entries(values))assert.equal(restored.fields[key],value)
 const older={...draft,fields:{...draft.fields}};delete older.fields.share_target
 assert.equal(readDraft(JSON.stringify(older)).fields.share_target,'')
 assert.equal(restored.submissionId,id);assert.equal(restored.attachmentName,'project.pdf')
 assert.equal('password' in restored.fields,false);assert.equal('user_id' in restored.fields,false);assert.equal('attachment' in restored.fields,false)
 assert.notEqual(draftKey('a'),draftKey('b'));assert.notEqual(draftKey('a'),draftKey('a','post'))
 assert.equal(readDraft(raw,draft.updatedAt+8*86400000),null)
 assert.equal(readDraft('{invalid'),null)
 assert.equal(readDraft(JSON.stringify({...draft,submissionId:'invalid'})),null)
 assert.equal(readDraft(JSON.stringify({...draft,fields:{}})),null)
})


test('a blank form is not retained as an unsaved draft',()=>{
 const data=new FormData();data.set('type','built');data.set('collaboration_status','open');data.set('collaborator_credits','[]')
 assert.equal(hasDraftContent(snapshotDraft(data,randomUUID())),false)
 data.set('website_url_draft','an incomplete URL')
 assert.equal(hasDraftContent(snapshotDraft(data,randomUUID())),true)
})
