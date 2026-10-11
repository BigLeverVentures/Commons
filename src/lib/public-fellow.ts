import { COMMUNITY } from '@/config/community'
import 'server-only'
import { authorProfileKey } from './author-profile-key'
import { loadPublicPosts } from './board-data'
import { getSupabaseAdminClient } from './supabase/admin'
import { isPreviewMode } from './runtime'
import { readPreview } from './preview'
import { personalLinks } from './profile-presence'
import { directoryDestination } from './fellow-identity'
import { VERIFIED_DIRECTORY_LINKS } from './verified-directory-links'

// Public author pages are rooted in published posts, not a browsable fellow directory.
export async function loadPublicFellow(key: string) {
  if (!/^[a-f0-9]{32}$/.test(key)) return null
  const posts = (await loadPublicPosts()).filter(post => authorProfileKey(post.user_id) === key)
  if (!posts.length) return null
  let profile: { name: string | null; bio: string | null; avatar_path: string | null; avatar_style?: string | null; personal_links?: unknown } | null = null
  if (isPreviewMode()) profile = readPreview().fellows.find(fellow => authorProfileKey(fellow.id) === key) ?? null
  else {
    const admin = getSupabaseAdminClient()
    if (!admin) throw new Error('Unable to load this profile.')
    const author = await admin.from('posts').select('user_id').eq('id', posts[0].id).maybeSingle()
    if (author.error) throw new Error('Unable to load this profile.')
    if (!author.data || authorProfileKey(author.data.user_id) !== key) return null
    const result = await admin.from('fellows').select('name,bio,avatar_path,avatar_style,personal_links').eq('id', author.data.user_id).maybeSingle()
    if (result.error) throw new Error('Unable to load this profile.')
    profile = result.data
  }
  if (!profile) return null
  const links = personalLinks(profile.personal_links) ?? []
  const directoryUrl = directoryDestination(VERIFIED_DIRECTORY_LINKS[key]) ?? links.map(link => directoryDestination(link.url)).find(Boolean) ?? null
  return { name: profile.name || `A ${COMMUNITY.memberSingular}`, bio: profile.bio, avatarPath: profile.avatar_path, avatarStyle: profile.avatar_style ?? null, links, directoryUrl, posts }
}
