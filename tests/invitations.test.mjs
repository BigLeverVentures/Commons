import { communityConfig } from './helpers/community.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {database,asUser,alice,bob,post} from './helpers/database.mjs'
function load(file,deps={}) {
 deps = {'@/config/community': communityConfig, ...deps}
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,require:name=>deps[name]});return exports}
const topics=load('src/lib/topics.ts'),api=load('src/lib/invitations.ts',{'./topics':topics})
function form(values){const data=new FormData();for(const [key,value] of Object.entries(values))data.set(key,value);return data}
const invitation={text:'Review our pitch',kind:'feedback',commitment:'15 minutes',deadline:null}
const share={text:'Help reach educators',audience:'Educators',message:'Come see our work'}
const base={id:post,user_id:alice,type:'project',title:'A pilot',status:'open',created_at:'2026-10-01T00:00:00Z',tags:['climate'],fellow:{name:'Alice'},participation:invitation,sharing:share}
const now=Date.parse('2026-10-08T12:00:00Z')
test('invitation validation requires explicit enabled text and real dates, and allows both kinds',()=>{
 assert.equal(api.invitationFields(form({participation_enabled:'on',participation_text:'',participation_kind:'feedback'})).error.includes('160'),true)
 assert.equal('error' in api.invitationFields(form({participation_enabled:'on',participation_text:'Pitch',participation_kind:'feedback',participation_deadline:'2026-02-30'})),true)
 assert.equal('error' in api.invitationFields(form({participation_enabled:'on',participation_text:'Pitch',participation_kind:'bad'})),true)
 const fields=api.invitationFields(form({participation_enabled:'on',participation_text:'Pitch',participation_kind:'feedback',sharing_enabled:'on',sharing_text:'Help share'}))
 assert.equal(fields.participation.text,'Pitch');assert.equal(fields.sharing.text,'Help share')
 assert.equal(api.invitationFields(form({sharing_text:'Disabled draft'})).sharing,null)
})
test('sharing eligibility is independent from paused, ended and expired contribution invitations',()=>{
 assert.equal(api.invitationsFor([base],now).length,2)
 for(const status of ['closed','ended']) {const rows=api.invitationsFor([{...base,status}],now);assert.equal(rows.length,1);assert.equal(rows[0].kind,'share')}
 const expired=api.invitationsFor([{...base,participation:{...invitation,deadline:'2026-10-07'}}],now);assert.equal(expired.length,1);assert.equal(expired[0].kind,'share')
 assert.equal(api.invitationsFor([{...base,participation:{...invitation,deadline:'2026-10-08'}}],now).length,2)
 const legacy=api.invitationsFor([{...base,type:'offer',participation:null,sharing:null}],now);assert.equal(legacy[0].text,'A pilot');assert.equal(legacy[0].action,'Explore this offer')
})
test('compact selection mixes opportunities, deduplicates authors/posts and is stable for a fixed day',()=>{
 const posts=[base,{...base,id:'offer',user_id:bob,type:'offer',participation:null,sharing:null},{...base,id:'share',user_id:'third',participation:null,status:'ended'}]
 const rows=api.invitationsFor(posts,now),chosen=api.selectInvitations(rows,now)
 assert.equal(chosen.length,3);assert.equal(new Set(chosen.map(row=>row.authorKey)).size,3);assert.equal(new Set(chosen.map(row=>row.postId)).size,3)
 assert.deepEqual(Array.from(new Set(chosen.map(row=>row.kind))).sort(),['offer','request','share'])
 assert.equal(JSON.stringify(chosen),JSON.stringify(api.selectInvitations(rows,now)))
 assert.equal(api.selectInvitations(rows,now,0).length,0)
 const confirmed=api.invitationsFor([{...base,confirmed_at:'2026-10-08T12:00:00Z'}],now);assert.equal(confirmed[0].publishedAt,base.created_at)
})
test('database validates invitations, owns publication/confirmation dates and exposes only public opportunity rows',async()=>{
 const db=await database()
 try {
  await asUser(db,alice,"INSERT INTO public.posts(id,user_id,type,title,description,participation,sharing,participation_published_at) VALUES ($1,$2,'project','A pilot','Story',$3,$4,'2099-01-01')",[post,alice,JSON.stringify(invitation),JSON.stringify(share)])
  const before=(await db.query('SELECT * FROM public.posts WHERE id=$1',[post])).rows[0];assert.ok(new Date(before.participation_published_at).getUTCFullYear()<2099)
  await asUser(db,alice,"UPDATE public.posts SET participation_published_at='2099-01-01',confirmed_at='2099-01-01' WHERE id=$1",[post])
  const after=(await db.query('SELECT * FROM public.posts WHERE id=$1',[post])).rows[0];assert.equal(String(after.participation_published_at),String(before.participation_published_at));assert.equal(String(after.created_at),String(before.created_at));assert.ok(new Date(after.confirmed_at).getUTCFullYear()<2099)
  await asUser(db,bob,"UPDATE public.posts SET sharing=NULL WHERE id=$1",[post]);assert.ok((await db.query('SELECT sharing FROM public.posts WHERE id=$1',[post])).rows[0].sharing)
  await assert.rejects(asUser(db,alice,'UPDATE public.posts SET participation=$2 WHERE id=$1',[post,JSON.stringify({...invitation,kind:'forged'})]),/valid_participation/)
  await asUser(db,alice,"UPDATE public.posts SET status='ended',tags=ARRAY['Climate'] WHERE id=$1",[post])
  await db.exec('SET ROLE anon');const rows=(await db.query('SELECT * FROM public.invitation_rows')).rows
  assert.equal(rows.length,1);assert.equal(rows[0].invitation_kind,'sharing');assert.equal(rows[0].resolved_topic,'planet');assert.equal('email' in rows[0],false);assert.equal(rows[0].author_key.length,32);assert.notEqual(rows[0].author_key,alice)
  assert.equal((await db.query('SELECT * FROM public.responses')).rows.length,0)
 }finally{await db.close()}
})

test('invitation rows show only the latest publication, edit or confirmation date',()=>{
 const row=api.invitationsFor([base],now)[0]
 assert.equal(api.invitationDate(row).label,'Published')
 const confirmedAt='2026-10-08T12:00:00Z',updatedAt='2026-10-09T12:00:00Z'
 assert.equal(api.invitationDate({...row,confirmedAt}).label,'Confirmed')
 const edited=api.invitationDate({...row,confirmedAt,updatedAt})
 assert.equal(edited.label,'Updated');assert.equal(edited.date,updatedAt)
 assert.equal(api.invitationDate({...row,confirmedAt:updatedAt,updatedAt}).label,'Confirmed')
 assert.equal(api.invitationDate({...row,publishedAt:updatedAt,confirmedAt}).label,'Published')
 assert.equal(api.invitationsFor([{...base,updated_at:updatedAt}],now)[0].updatedAt,updatedAt)
})
