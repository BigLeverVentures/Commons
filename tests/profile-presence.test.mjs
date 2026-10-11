import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { database, asUser, alice, bob, post } from './helpers/database.mjs'
function load(file,dependencies={}) {
  const exports={}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,File,Buffer,require(name){if(!(name in dependencies))throw new Error(name);return dependencies[name]}})
  return exports
}
const presence=load('src/lib/profile-presence.ts')
test('personal links require labeled HTTPS destinations without credentials; avatar paths are allowlisted',()=>{
  assert.equal(presence.personalLinks([{label:'Website',url:'javascript:alert(1)'}]),null)
  assert.equal(presence.personalLinks([{label:'Site',url:'https://user:password@example.test'}]),null)
  assert.equal(presence.personalLinks([{label:'',url:'https://example.test'}]),null)
  assert.equal(presence.personalLinks(Array(4).fill({label:'Site',url:'https://example.test'})),null)
  assert.equal(presence.personalLinks([{label:' Site ',url:' https://example.test '}])[0].url,'https://example.test/')
  assert.equal(presence.avatarIllustration('peep-2'),'/avatars/peep-2.svg')
  assert.equal(presence.avatarIllustration('../../bad'),null)
})
test('presence saves validate topics and links before changing the fellow, and deduplicate preferences',async()=>{
  const fellow={id:alice,name:'Alice',avatar_path:'previous-photo'},changes=[]
  const api=load('src/app/(app)/profile/actions.ts',{
    'node:crypto':{randomUUID:()=> 'id'},'@/lib/profile-photos':{preparePhoto:()=>null},'@/lib/topics':load('src/lib/topics.ts'),
    '@/lib/profile-presence':presence,'@/lib/cohorts':load('src/lib/cohorts.ts'),'next/cache':{revalidatePath(){}},
    '@/lib/auth':{requireAuth:async()=>({id:alice})},'@/lib/runtime':{isPreviewMode:()=>true},
    '@/lib/preview':{changePreview:fn=>{changes.push(1);return fn({fellows:[fellow]})}},'@/lib/supabase/server':{},
  })
  const data=new FormData();data.set('name','Alice');data.append('interests','planet');data.append('interests','planet');data.append('contribution_preferences','Testing');data.set('avatar_style','peep-48');data.set('remove_photo','on');data.set('link_label_0','My work');data.set('link_url_0','https://example.test')
  assert.equal((await api.updateProfile({},data)).status,'success')
  assert.deepEqual(Array.from(fellow.interests),['planet']);assert.equal(fellow.avatar_style,'peep-48');assert.equal(fellow.avatar_path,null);assert.equal(fellow.personal_links[0].label,'My work')
  data.append('interests','unknown-topic');assert.equal((await api.updateProfile({},data)).status,'error');assert.equal(changes.length,1)
  data.delete('interests');data.set('link_url_0','javascript:bad');assert.equal((await api.updateProfile({},data)).status,'error');assert.equal(changes.length,1)
})
test('database protects presence ownership and keeps interests and links outside current public projections',async()=>{
  const db=await database()
  try {
    await asUser(db,alice,"UPDATE public.fellows SET interests=ARRAY['planet'],contribution_preferences=ARRAY['Testing'],avatar_style='peep-48',personal_links=$2 WHERE id=$1",[alice,JSON.stringify([{label:'Work',url:'https://example.test'}])])
    await assert.rejects(asUser(db,alice,"UPDATE public.fellows SET avatar_style='peep-49' WHERE id=$1",[alice]),/valid_avatar_style/)
    await asUser(db,bob,"UPDATE public.fellows SET interests=ARRAY['care'] WHERE id=$1",[alice])
    assert.deepEqual((await db.query('SELECT interests FROM public.fellows WHERE id=$1',[alice])).rows[0].interests,['planet'])
    await assert.rejects(asUser(db,alice,"UPDATE public.fellows SET interests=ARRAY['made-up'] WHERE id=$1",[alice]),/valid_fellow_interests/)
    await assert.rejects(asUser(db,alice,"UPDATE public.fellows SET personal_links=$2 WHERE id=$1",[alice,JSON.stringify([{label:'Bad',url:'javascript:bad'}])]),/valid_personal_links/)
    await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description) VALUES ($1,$2,'offer','Mentoring','Can help')",[post,alice])
    await db.exec('SET ROLE anon');const publicPost=(await db.query('SELECT * FROM public.public_posts')).rows[0]
    assert.equal(publicPost.author_avatar_style,'peep-48');assert.equal('interests' in publicPost,false);assert.equal('email' in publicPost,false)
    assert.equal((await db.query('SELECT * FROM public.fellows')).rows.length,0)
  } finally {await db.close()}
})


test('the 48-avatar gallery has unique local artwork and preserves existing IDs',()=>{
 assert.equal(presence.AVATARS.length,48)
 assert.equal(new Set(presence.AVATARS).size,48)
 for(let start=0;start<48;start+=12)assert.equal(presence.AVATARS.slice(start,start+12).filter(id=>Number(id.slice(5))>=37).length,3)
 for(let id=1;id<=36;id++)assert.equal(presence.avatarIllustration(`peep-${id}`),`/avatars/peep-${id}.svg`)
 const artwork=presence.AVATARS.map(id=>{
  assert.equal(presence.avatarIllustration(id),`/avatars/${id}.svg`)
  const svg=fs.readFileSync(`public/avatars/${id}.svg`,'utf8')
  assert.match(svg,/<svg/)
  assert.doesNotMatch(svg,/<script|<foreignObject/)
  return svg
 })
 assert.equal(new Set(artwork).size,48)
 assert.equal(presence.avatarIllustration('peep-49'),null)
})
