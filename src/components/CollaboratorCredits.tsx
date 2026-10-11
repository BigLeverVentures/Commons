import {initialCredits,creditName} from '@/lib/collaborator-credits'
import {resolveFellowIdentities} from '@/lib/fellow-identity-data'
export async function CollaboratorCredits({canonical,legacy}:{canonical:unknown;legacy:string[]}) {
 const credits=initialCredits(canonical,legacy)
 if(!credits.length)return null
 const identities=await resolveFellowIdentities(credits.filter(row=>row.kind==='fellow').map(row=>row.fellow_id))
 return <p className="my-4 text-sm"><span className="font-medium">In collaboration with </span>{credits.map((credit,index)=>{const destination=credit.kind==='fellow'?identities.get(credit.fellow_id)?.directory_url:null;return <span key={index}>{index>0?', ':''}{destination?<a href={destination} target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--pounamu)] underline-offset-4">{creditName(credit)}</a>:creditName(credit)}</span>})}</p>
}
