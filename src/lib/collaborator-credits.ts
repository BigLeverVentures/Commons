import {parseCollaborators} from './post-fields'
export type CollaboratorCredit = {kind:'fellow';fellow_id:string;name_snapshot:string}|{kind:'text';name:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function creditName(credit:CollaboratorCredit){return credit.kind==='fellow'?credit.name_snapshot:credit.name}
export function readCredits(value:unknown):CollaboratorCredit[]|null {
 if(!Array.isArray(value)||value.length>20)return null
 const ids=new Set<string>(),names=new Set<string>()
 for(const row of value){
  if(!row||typeof row!=='object')return null
  const name=row.kind==='fellow'?row.name_snapshot:row.name
  if(typeof name!=='string'||!name.trim()||name.length>100)return null
  if(row.kind==='fellow'){
   if(Object.keys(row).length!==3||typeof row.fellow_id!=='string'||!uuid.test(row.fellow_id)||ids.has(row.fellow_id.toLowerCase()))return null
   ids.add(row.fellow_id.toLowerCase())
  }else if(row.kind==='text'){
   if(Object.keys(row).length!==2||names.has(name.toLowerCase()))return null
   names.add(name.toLowerCase())
  }else return null
 }
 return value as CollaboratorCredit[]
}
export function creditFields(form:FormData):{credits:CollaboratorCredit[]|null;names:string[]}|{error:string} {
 const raw=form.get('collaborator_credits')
 if(raw===null){const names=parseCollaborators(String(form.get('collaborators')??''));return names?{credits:null,names}:{error:'Use up to 20 collaborator names, each up to 100 characters.'}}
 if(typeof raw!=='string'||raw.length>8192)return {error:'Please check your collaborator credits.'}
 try{const credits=readCredits(JSON.parse(raw));if(!credits)return {error:'Please check your collaborator credits.'};const pending=parseCollaborators(String(form.get('collaborator_names_draft')??''));if(!pending)return {error:'Please check the additional names.'};for(const name of pending)if(!credits.some(row=>row.kind==='text'&&row.name.toLowerCase()===name.toLowerCase()))credits.push({kind:'text',name});if(credits.length>20)return {error:'Use up to 20 collaborator credits.'};return {credits,names:credits.map(creditName)}}catch{return {error:'Please check your collaborator credits.'}}
}
export function initialCredits(canonical:unknown,legacy:string[]=[]):CollaboratorCredit[]{return readCredits(canonical)??legacy.map(name=>({kind:'text',name}))}
