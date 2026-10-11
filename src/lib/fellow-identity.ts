import { COMMUNITY } from '@/config/community'
export type FellowIdentity = {id:string;display_name:string;cohort:string|null;directory_url:string|null;active:boolean}
export type FellowSearchResult = Pick<FellowIdentity,'id'|'display_name'|'cohort'> & {has_directory_link:boolean}
export const DEMO_IDENTITY:FellowIdentity={id:'90000000-0000-4000-8000-000000000001',display_name:'Morgan Rivera',cohort:null,directory_url:null,active:true}
// An operator configures one HTTPS directory prefix; disabled deployments never link out.
export function directoryDestination(value:unknown):string|null {
 const prefix=COMMUNITY.directoryUrlPrefix
 if(typeof value!=='string'||!prefix)return null
 try {
  const destination=new URL(value),base=new URL(prefix)
  if(destination.protocol!=='https:'||base.protocol!=='https:'||destination.username||destination.password||base.username||base.password)return null
  // Check before URL parsing can normalize dot segments, including fragment routers.
  for(const candidate of [value,prefix]) {
   const decoded=decodeURIComponent(candidate)
   if(decoded.includes('\\')||decoded.split(/[/?#]/).some(segment=>segment==='.'||segment==='..'))return null
  }
  if(destination.origin!==base.origin||!destination.href.startsWith(base.href))return null
  const suffix=destination.href.slice(base.href.length)
  if(!base.href.endsWith('/')&&suffix&&!/^[/?#]/.test(suffix))return null
  return destination.href
 }catch{return null}
}
export function identityQuery(value:string):string|null {const query=value.trim();return query.length>=2&&query.length<=80?query:null}
export function literalPattern(query:string):string {return `%${query.replace(/[\\%_]/g,character=>'\\'+character)}%`}
export function safeSearchResult(identity:FellowIdentity):FellowSearchResult {return {id:identity.id,display_name:identity.display_name,cohort:identity.cohort,has_directory_link:!!directoryDestination(identity.directory_url)}}
