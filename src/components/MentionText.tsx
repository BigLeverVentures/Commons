import {readMentions} from '@/lib/mentions'
import {resolveFellowIdentities} from '@/lib/fellow-identity-data'
import {MentionSegments} from './MentionSegments'
export async function MentionText({text,references}:{text:string;references?:unknown}) {
 const mentions=readMentions(references??[],text)??[],identities=await resolveFellowIdentities(mentions.map(row=>row.fellow_id)),links:Record<string,string>={}
 for(const identity of identities.values())if(identity.directory_url)links[identity.id]=identity.directory_url
 return <MentionSegments text={text} references={mentions} links={links}/>
}
