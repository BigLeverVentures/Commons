import 'server-only'
import {resolveFellowIdentities} from './fellow-identity-data'
import type {FellowMention} from './mentions'
export async function validateMentions(mentions:FellowMention[],prior:unknown=[]):Promise<string|null> {
 const identities=await resolveFellowIdentities(mentions.map(row=>row.fellow_id)),previous=Array.isArray(prior)?prior:[]
 for(const mention of mentions){const identity=identities.get(mention.fellow_id),historical=previous.some(row=>row?.fellow_id===mention.fellow_id&&row?.label_snapshot===mention.label_snapshot)
  if(!identity||(!historical&&(!identity.active||mention.label_snapshot!=='@'+identity.display_name)))return 'Please select the mentioned fellow again, or leave their name as ordinary text.'
 }
 return null
}
