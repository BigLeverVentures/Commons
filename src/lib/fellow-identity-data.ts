import 'server-only'
import {getSupabaseAdminClient} from './supabase/admin'
import {isPreviewMode} from './runtime'
import {DEMO_IDENTITY,directoryDestination,identityQuery,literalPattern,safeSearchResult} from './fellow-identity'
import type {FellowIdentity,FellowSearchResult} from './fellow-identity'
const projection='id,display_name,cohort,directory_url,active'
const previewIdentities:FellowIdentity[]=[DEMO_IDENTITY,{id:'90000000-0000-4000-8000-000000000002',display_name:'Maya Chen',cohort:'Cohort 4',directory_url:null,active:true}]
const cache=new Map<string,{expires:number;rows:FellowSearchResult[]}>()
export async function searchFellowIdentities(value:string):Promise<FellowSearchResult[]> {
 const query=identityQuery(value)
 if(!query)throw new Error('Use 2–80 characters to search for a fellow.')
 if(isPreviewMode())return previewIdentities.filter(identity=>identity.active&&identity.display_name.toLowerCase().includes(query.toLowerCase())).slice(0,10).map(safeSearchResult)
 const db=getSupabaseAdminClient()
 if(!db)throw new Error('Fellow search is temporarily unavailable.')
 const key=query.toLowerCase(),cached=cache.get(key),now=Date.now()
 if(cached&&cached.expires>now)return cached.rows
 const {data,error}=await db.from('fellow_identities').select(projection).eq('active',true).ilike('display_name',literalPattern(query)).order('display_name').order('id').limit(10)
 if(error)throw new Error('Fellow search is temporarily unavailable.')
 const rows=(data??[]).map(safeSearchResult)
 if(cache.size>=100)cache.delete(cache.keys().next().value!)
 cache.set(key,{expires:now+30000,rows})
 return rows
}
// Internal renderer helper only: bounded IDs referenced by already-authorized content.
export async function resolveFellowIdentities(ids:string[]):Promise<Map<string,FellowIdentity>> {
 const unique=[...new Set(ids)]
 if(unique.length>100||unique.some(id=>!/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)))return new Map()
 if(!unique.length)return new Map()
 try {
  let rows:FellowIdentity[]
  if(isPreviewMode())rows=previewIdentities.filter(identity=>unique.includes(identity.id))
  else {
   const db=getSupabaseAdminClient();if(!db)return new Map()
   const result=await db.from('fellow_identities').select(projection).in('id',unique)
   if(result.error)return new Map();rows=result.data??[]
  }
  return new Map(rows.map(identity=>[identity.id,{...identity,directory_url:identity.active?directoryDestination(identity.directory_url):null}]))
 }catch{return new Map()}
}
