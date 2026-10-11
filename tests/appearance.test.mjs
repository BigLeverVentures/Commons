import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source=ts.transpileModule(fs.readFileSync('src/lib/appearance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
function runtime(stored=null,blocked=false) {
 const exports={},document={documentElement:{dataset:{}}}, listeners=new Map()
 const localStorage={getItem(){if(blocked)throw new Error('blocked');return stored},setItem(k,v){if(blocked)throw new Error('blocked');stored=v}}
 const media={matches:false,addEventListener(k,fn){listeners.set('media-'+k,fn)},removeEventListener(k){listeners.delete('media-'+k)}}
 const window={matchMedia(){return media},addEventListener(k,fn){listeners.set(k,fn)},removeEventListener(k){listeners.delete(k)},dispatchEvent(e){listeners.get(e.type)?.()}}
 const context={exports,document,localStorage,window,Event,matchMedia:window.matchMedia}
 vm.runInNewContext(source,context)
 vm.runInNewContext(exports.APPEARANCE_SCRIPT,context)
 return {...exports,document,listeners,localStorage,media}
}
test('appearance defaults safely and saved overrides apply before hydration',()=>{
 for(const [stored,expected] of [[null,'system'],['system','system'],['bad','system'],['dark','dark'],['light','light']]) assert.equal(runtime(stored).getAppearance(),expected)
 assert.equal(runtime('dark',true).getAppearance(),'system')
})
test('changing appearance persists and notifies; blocked storage still changes the current page',()=>{
 const app=runtime();let changes=0;const unsubscribe=app.subscribeAppearance(()=>changes++);changes=0
 assert.equal(app.setAppearance('dark'),true);assert.equal(app.getAppearance(),'dark');assert.equal(app.localStorage.getItem(),'dark');assert.equal(changes,1)
 app.setAppearance('system');assert.equal(app.getAppearance(),'system');unsubscribe();assert.equal(app.listeners.size,0)
 const blocked=runtime(null,true);assert.equal(blocked.setAppearance('light'),false);assert.equal(blocked.getAppearance(),'light')
})
test('changes in another tab and clearing storage refresh the appearance',()=>{
 const app=runtime('dark');let changes=0;app.subscribeAppearance(()=>changes++)
 app.localStorage.setItem(app.APPEARANCE_KEY,'light');app.listeners.get('storage')({key:app.APPEARANCE_KEY});assert.equal(app.getAppearance(),'light')
 app.localStorage.setItem(app.APPEARANCE_KEY,null);app.listeners.get('storage')({key:null});assert.equal(app.getAppearance(),'system')
 app.listeners.get('storage')({key:'another-setting'});assert.equal(changes,2)
})
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('system changes follow the device while explicit overrides stay stable',()=>{
 const app=runtime();app.subscribeAppearance(()=>{});assert.equal(app.document.documentElement.dataset.theme,'light')
 app.media.matches=true;app.listeners.get('media-change')();assert.equal(app.document.documentElement.dataset.theme,'dark')
 app.setAppearance('light');app.listeners.get('media-change')();assert.equal(app.document.documentElement.dataset.theme,'light')
 app.setAppearance('system');assert.equal(app.document.documentElement.dataset.theme,'dark')
})
test('core palettes retain readable text, links, action labels, and feedback',()=>{
 const css=fs.readFileSync('src/app/tokens.css','utf8')
 const tokens=text=>Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map(m=>[m[1],m[2]]))
 const light=tokens(css.split(':root[data-theme=')[0]),dark=tokens(css.split(':root[data-theme=')[1].split('@media')[0])
 const mix=(a,b,amount)=>'#'+a.slice(1).match(/../g).map((part,i)=>Math.round(parseInt(part,16)*amount+parseInt(b.slice(1).match(/../g)[i],16)*(1-amount)).toString(16).padStart(2,'0')).join('')
 for(const palette of [light,dark]) {
  for(const bg of [palette.page,palette.surface,mix(palette.page,palette.link,.9)]) for(const fg of ['ink','muted','link']) assert.ok(contrast(palette[fg],bg)>=4.5,`${fg} on ${bg}`)
  assert.ok(contrast(palette['on-action'],palette.action)>=4.5)
  for(const signal of ['success','danger']) for(const bg of [palette.page,palette.surface,mix(palette.surface,palette[signal],.92)]) assert.ok(contrast(palette[signal],bg)>=4.5,`${signal} on ${bg}`)
 }
})
