export type FellowMention={fellow_id:string;start:number;end:number;label_snapshot:string}
export function normalizedBody(value:unknown):string{return typeof value==='string'?value.replace(/\r\n?/g,'\n'):''}
export function codePointOffset(text:string,utf16:number){return Array.from(text.slice(0,utf16)).length}
export function utf16Offset(text:string,codePoint:number){return Array.from(text).slice(0,codePoint).join('').length}
export function readMentions(value:unknown,text:string,limit=25):FellowMention[]|null {
 if(!Array.isArray(value)||value.length>limit||new TextEncoder().encode(JSON.stringify(value)).length>8192)return null
 const points=Array.from(text);let previous=0
 for(const row of value){
  if(!row||typeof row!=='object'||Object.keys(row).length!==4||typeof row.fellow_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.fellow_id)||!Number.isInteger(row.start)||!Number.isInteger(row.end)||row.start<previous||row.end<=row.start||row.end>points.length||typeof row.label_snapshot!=='string'||row.label_snapshot.length>101||!row.label_snapshot.startsWith('@')||points.slice(row.start,row.end).join('')!==row.label_snapshot)return null
  previous=row.end
 }
 return value as FellowMention[]
}
export function mentionField(form:FormData,field:string,text:string,limit=25):FellowMention[]|null {
 const raw=form.get(field)
 if(raw===null)return []
 if(typeof raw!=='string'||raw.length>8192)return null
 try{return readMentions(JSON.parse(raw),text,limit)}catch{return null}
}
// Native edits provide an exact range. A conservative diff handles other changes.
export function transformMentions(before:string,after:string,mentions:FellowMention[],range?:{start:number;end:number}):FellowMention[] {
 const old=Array.from(before),next=Array.from(after);let start=0,end=old.length,added=next.length
 if(range&&range.start>=0&&range.end>=range.start&&range.end<=old.length&&next.slice(0,range.start).join('')===old.slice(0,range.start).join('')&&next.slice(next.length-(old.length-range.end)).join('')===old.slice(range.end).join('')&&next.length>=range.start+old.length-range.end){start=range.start;end=range.end;added=next.length-start-(old.length-end)}
 else {while(start<old.length&&start<next.length&&old[start]===next[start])start++;let suffix=0;while(suffix<old.length-start&&suffix<next.length-start&&old[old.length-1-suffix]===next[next.length-1-suffix])suffix++;end=old.length-suffix;added=next.length-start-suffix}
 const delta=added-(end-start)
 return mentions.flatMap(mention=>{
  let shifted:FellowMention
  if(mention.end<=start)shifted=mention
  else if(mention.start>=end)shifted={...mention,start:mention.start+delta,end:mention.end+delta}
  else return []
  return readMentions([shifted],after,1)?[shifted]:[]
 })
}
export function mentionQuery(text:string,caret:number):{start:number;end:number;text:string}|null {
 const match=text.slice(0,caret).match(/(^|[\s(])@([^@\n]{2,80})$/)
 if(!match)return null
 const start=caret-match[2].length-1
 return {start,end:caret,text:match[2]}
}
