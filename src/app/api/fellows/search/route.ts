import {currentUser} from '@/lib/auth'
import {getSupabaseServerClient} from '@/lib/supabase/server'
import {isPreviewMode} from '@/lib/runtime'
import {identityQuery} from '@/lib/fellow-identity'
import {searchFellowIdentities} from '@/lib/fellow-identity-data'
const headers={'Cache-Control':'private, no-store'}
export async function GET(request:Request) {
 const user=await currentUser()
 if(!user)return Response.json({error:'Sign in to search.'},{status:401,headers})
 if(!isPreviewMode()) {
  const db=await getSupabaseServerClient()
  const {data,error}=await db.from('fellows').select('id').eq('id',user.id).maybeSingle()
  if(error||!data)return Response.json({error:'Fellow access is required.'},{status:403,headers})
 }
 const query=identityQuery(new URL(request.url).searchParams.get('q')??'')
 if(!query)return Response.json({error:'Use 2–80 characters to search.'},{status:400,headers})
 try {return Response.json({fellows:await searchFellowIdentities(query),coverage:'Search includes identities explicitly imported by this community.'},{headers})}
 catch {return Response.json({error:'Fellow search is temporarily unavailable; your draft is unchanged.'},{status:503,headers})}
}
