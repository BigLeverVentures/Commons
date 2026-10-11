import { communityConfig } from './helpers/community.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {createHash} from 'node:crypto'
function load(file,deps) {deps={'@/config/community':communityConfig,...deps};const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL,require:name=>{if(name in deps)return deps[name];throw Error(name)}});return exports}
const keys=load('src/lib/author-profile-key.ts',{'node:crypto':{createHash}})
const presence=load('src/lib/profile-presence.ts',{})
const identity=load('src/lib/fellow-identity.ts',{'@/config/community':{COMMUNITY:{directoryUrlPrefix:null}}})
test('public author profiles require a published author and omit private fields',async()=>{
 const id='10000000-0000-4000-8000-000000000001',key=keys.authorProfileKey(id)
 const row={id,email:'private@example.org',name:'A fellow',bio:'Public introduction',avatar_path:null,avatar_style:null,personal_links:[{label:'Website',url:'https://example.org'}],email_notifications:true}
 let adminCalls=0
 const admin={from(table){adminCalls++;const query={select(){return query},eq(){return query},maybeSingle:async()=>({data:table==='posts'?{user_id:id}:row,error:null})};return query}}
 const api=load('src/lib/public-fellow.ts',{'server-only':{},'./author-profile-key':keys,'./board-data':{loadPublicPosts:async()=>[{id:'post',user_id:key}]},'./supabase/admin':{getSupabaseAdminClient:()=>admin},'./runtime':{isPreviewMode:()=>false},'./preview':{},'./profile-presence':presence,'./fellow-identity':identity,'./verified-directory-links':{VERIFIED_DIRECTORY_LINKS:{[key]:'https://directory.example.org/#/fellow/example'}}})
 assert.equal(await api.loadPublicFellow('invalid'),null)
 assert.equal(await api.loadPublicFellow('0'.repeat(32)),null)
 assert.equal(adminCalls,0)
 const profile=await api.loadPublicFellow(key)
 assert.equal(profile.name,'A fellow');assert.equal(profile.directoryUrl,null)
 assert.doesNotMatch(JSON.stringify(profile),/private@example|email_notifications/)
 assert.equal(keys.authorProfileKey(key),key)
 assert.equal(adminCalls,2)
})
test('category actions use universal prompts without interpreting post content',()=>{
 const {postConnection}=load('src/lib/post-connection.ts',{})
 assert.equal(postConnection('ask').action,'Offer help')
 assert.equal(postConnection('offer').prompt,'How would you like to make use of this offer?')
 assert.equal(postConnection('project').action,'Get involved')
})
