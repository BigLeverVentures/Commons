import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as jsx from 'react/jsx-runtime'
import {renderToStaticMarkup} from 'react-dom/server'
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URL,TextEncoder,require:name=>name==='react/jsx-runtime'?jsx:deps[name]});return exports}
const mentions=load('src/lib/mentions.ts'),identity=load('src/lib/fellow-identity.ts',{'@/config/community':{COMMUNITY:{directoryUrlPrefix:'https://directory.example.org/#/fellow/'}}})
const {MentionSegments}=load('src/components/MentionSegments.tsx',{'@/lib/mentions':mentions,'@/lib/fellow-identity':identity})
test('mention rendering escapes text, uses only verified destinations, and keeps inactive/invalid content readable',()=>{
 const label='@Morgan Rivera',id=identity.DEMO_IDENTITY.id,text=label+' <script>alert(1)</script>',references=[{fellow_id:id,start:0,end:label.length,label_snapshot:label}]
 const linked=renderToStaticMarkup(MentionSegments({text,references,links:{[id]:'https://directory.example.org/#/fellow/morgan_rivera'}}))
 assert.match(linked,/href="https:\/\/directory.example.org\/#\/fellow\/morgan_rivera"/);assert.match(linked,/noopener noreferrer/);assert.match(linked,/&lt;script&gt;/);assert.equal(linked.includes('gmail'),false)
 const disabled=renderToStaticMarkup(MentionSegments({text,references,links:{[id]:'javascript:alert(1)'}}));assert.equal(disabled.includes('href='),false);assert.match(disabled,/@Morgan Rivera/)
 const invalid=renderToStaticMarkup(MentionSegments({text,references:[{...references[0],start:1}]}));assert.equal(invalid.includes('href='),false);assert.match(invalid,/@Morgan Rivera/)
})
