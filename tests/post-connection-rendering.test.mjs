import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
function load(file, require) {const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require});return exports}
const {postConnection}=load('src/lib/post-connection.ts',()=>{})
test('social strip stays beneath the post and before the connection action for guests and fellows',async()=>{
 for(const type of ['ask','offer','project'])for(const member of [false,true]) {
  const post={id:'post',user_id:'author',type,status:'open',title:'Example',description:'Main content',tags:[],created_at:'2026-10-09',fellow:{name:'Author'}}
  const page=load('src/app/posts/[id]/page.tsx',name=>{
   if(name==='react/jsx-runtime')return jsx
   if(name==='next/link')return {default:({children,href})=>React.createElement('a',{href},children)}
   if(name==='next/navigation')return {notFound(){throw Error('not found')}}
   if(name==='@/lib/auth')return {currentUser:async()=>member?{id:'viewer'}:null}
   if(name==='@/lib/board-data')return {loadPost:async()=>post,loadPublicPost:async()=>post,loadResponses:async()=>[]}
   if(name==='@/lib/reaction-data')return {reactionsFor:async()=>({counts:{},selected:null})}
   if(name==='@/lib/post-connection')return {postConnection}
   if(name==='@/lib/author-profile-key')return {authorProfileHref:()=>'/fellows/public-key'}
   if(name==='@/lib/support')return {supportLink:()=> 'mailto:support@example.org'}
   if(name==='@/lib/post-status')return {postStatusLabel:()=> 'Available'}
   if(name==='@/lib/connection-data')return {connectionsFor:async()=>[]}
   if(name==='@/lib/post-metadata')return {}
   if(name.startsWith('@/components/')) {
    const component=name.split('/').at(-1)
    return {[component]:['CommonsShell','PostStory'].includes(component)?({children})=>React.createElement('main',null,children):component==='Reactions'?()=>React.createElement('div',null,'Encouragement Sharing'):component==='SharePost'?()=>React.createElement('div',null,'Sharing'):component==='ResponseForm'?({type})=>React.createElement('form',null,postConnection(type).prompt):()=>null}
   }
   throw Error(name)
  }).default
  const html=renderToStaticMarkup(await page({params:Promise.resolve({id:'post'}),searchParams:Promise.resolve({})}))
  const action=postConnection(type).action
  assert.ok(html.indexOf('Sharing')<html.indexOf(action))
  assert.ok(html.indexOf('Encouragement')<html.indexOf('Sharing'))
  assert.ok(html.indexOf('Sharing')<html.indexOf('Request a correction'))
  assert.match(html,/href="\/fellows\/public-key"/)
  if(member)assert.ok(html.includes(postConnection(type).prompt));else assert.match(html,/Sign in to/)
 }
})
