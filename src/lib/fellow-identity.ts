export type FellowIdentity = {id:string;display_name:string;cohort:string|null;directory_url:string|null;active:boolean}
export type FellowSearchResult = Pick<FellowIdentity,'id'|'display_name'|'cohort'> & {has_directory_link:boolean}
export const DEMO_IDENTITY:FellowIdentity={id:'90000000-0000-4000-8000-000000000001',display_name:'Morgan Rivera',cohort:null,directory_url:'https://directory.example.org/#/fellow/morgan_rivera',active:true}
export function directoryDestination(value:unknown):string|null {
 if(typeof value!=='string'||!/^https:\/\/directory\.example\.org\/#\/fellow\/[A-Za-z0-9_-]+$/.test(value))return null
 return value
}
export function identityQuery(value:string):string|null {const query=value.trim();return query.length>=2&&query.length<=80?query:null}
export function literalPattern(query:string):string {return `%${query.replace(/[\\%_]/g,character=>'\\'+character)}%`}
export function safeSearchResult(identity:FellowIdentity):FellowSearchResult {return {id:identity.id,display_name:identity.display_name,cohort:identity.cohort,has_directory_link:!!directoryDestination(identity.directory_url)}}
