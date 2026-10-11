import {readMentions} from '@/lib/mentions'
import {directoryDestination} from '@/lib/fellow-identity'
export function MentionSegments({text,references,links={}}:{text:string;references?:unknown;links?:Record<string,string>}) {
 const mentions=readMentions(references??[],text)??[],points=Array.from(text)
 const parts=mentions.map((mention,index)=>{const ordinary=points.slice(index?mentions[index-1].end:0,mention.start).join(''),destination=directoryDestination(links[mention.fellow_id]);return <span key={index}>{ordinary}{destination?<a href={destination} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-[var(--pounamu)] underline-offset-4">{mention.label_snapshot}</a>:<span className="font-medium">{mention.label_snapshot}</span>}</span>})
 return <>{parts}{points.slice(mentions[mentions.length-1]?.end??0).join('')}</>
}
