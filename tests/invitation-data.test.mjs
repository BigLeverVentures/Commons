import { communityConfig } from './helpers/community.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function load(file,deps={}) {
 deps={'@/config/community':communityConfig,...deps}
 const exports={}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(!(name in deps))throw Error(name);return deps[name]}})
 return exports
}
const invitations=load('src/lib/invitations.ts',{'./topics':load('src/lib/topics.ts'),'./post-activity':load('src/lib/post-activity.ts')})
test('compact digest fetches every batch and retains invitations from the same author',async()=>{
 const rows=Array.from({length:503},(_,i)=>({id:`post-${String(i).padStart(3,'0')}`,type:'offer',title:`Invitation ${i}`,status:'open',created_at:'2026-10-01T00:00:00Z',updated_at:i===502?'2026-10-10T00:00:00Z':null,tags:['technology'],author_key:'same-author',author_name:'A member',invitation_kind:'legacy'}))
 const ranges=[]
 const db={from(table){assert.equal(table,'invitation_rows');const query={select(){return query},order(){return query},range(start,end){ranges.push([start,end]);return Promise.resolve({data:rows.slice(start,end+1),error:null})}};return query}}
 const api=load('src/lib/invitation-data.ts',{'server-only':{},'./supabase/server':{getSupabaseServerClient:async()=>db},'./runtime':{isPreviewMode:()=>false,hasSupabaseConfiguration:()=>true},'./preview':{},'./invitations':invitations})
 const result=await api.loadInvitationPage({compact:true})
 assert.equal(result.invitations.length,503);assert.equal(result.more,false)
 assert.equal(result.invitations[0].postId,'post-502')
 assert.deepEqual(ranges,[[0,499],[500,999]])
 const page=await api.loadInvitationPage({page:2})
 assert.equal(page.invitations.length,24);assert.equal(page.more,true)
 assert.equal(page.invitations[0].postId,'post-023')
 assert.equal((await api.loadInvitationPage({compact:true,interests:[]})).invitations.length,0)
})
