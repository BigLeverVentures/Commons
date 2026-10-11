import 'server-only'
import {resolveFellowIdentities} from './fellow-identity-data'
import {readCredits} from './collaborator-credits'
import type {CollaboratorCredit} from './collaborator-credits'
export async function validateCredits(credits:CollaboratorCredit[]|null,prior:unknown=[]):Promise<string|null> {
 if(!credits)return null
 const selected=credits.filter(row=>row.kind==='fellow'),identities=await resolveFellowIdentities(selected.map(row=>row.fellow_id))
 const previous=readCredits(prior)??[]
 for(const credit of selected){
  const identity=identities.get(credit.fellow_id)
  const historical=previous.some(row=>row.kind==='fellow'&&row.fellow_id===credit.fellow_id&&row.name_snapshot===credit.name_snapshot)
  if(!identity||(!historical&&(!identity.active||identity.display_name!==credit.name_snapshot)))return 'Please select the correct person again, or keep the credit as an ordinary name.'
 }
 return null
}
