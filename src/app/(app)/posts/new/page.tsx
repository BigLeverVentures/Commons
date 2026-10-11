import { requireAuth } from '@/lib/auth'
import { isPreviewMode } from '@/lib/runtime'
import { previewFellow } from '@/lib/preview'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PostForm } from '@/components/PostForm'

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ built?: string }> }) {
  const user = await requireAuth()
  const author = isPreviewMode() ? await previewFellow() : (await (await getSupabaseServerClient()).from('fellows').select('name,avatar_path,avatar_style').eq('id',user.id).maybeSingle()).data
  const built = (await searchParams).built === '1'
  return <div><h1 className="type-title mb-6">{built ? 'Share something built' : 'New post'}</h1><PostForm userId={user.id} author={author ?? {name:null}} initialBuilt={built} /></div>
}
