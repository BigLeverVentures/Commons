import { ImageResponse } from 'next/og'
import { loadPublicPost } from '@/lib/board-data'
import { topicFor } from '@/lib/topics'
export async function GET(_request: Request, {params}:{params:Promise<{id:string}>}) {
 const {id}=await params
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return new Response('Invalid post.',{status:400})
 const post=await loadPublicPost(id)
 if(!post)return new Response('Post not found.',{status:404})
 const topic=topicFor(post.tags,post.topic)
 return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',background:'#f5f3ea',color:'#263d34',padding:64}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:30}}>Commons</span><span style={{fontSize:22,color:'#657366'}}>{post.built_at?'Built here':post.type.toUpperCase()} · {topic.name}</span></div>
  <div style={{display:'flex',flexDirection:'column',gap:22}}><div style={{fontSize:54,lineHeight:1.15,fontWeight:700}}>{post.title}</div><div style={{fontSize:27,lineHeight:1.4,color:'#657366'}}>{(post.participation?.text || post.sharing?.text || post.description).slice(0,180)}</div></div>
  <div style={{display:'flex',justifyContent:'space-between',fontSize:23,borderTop:'1px solid #ccd5c8',paddingTop:24}}><span>{(post.fellow?.name || 'A fellow').slice(0,60)}</span><span>Ideas. People. Possibility.</span></div>
 </div>,{width:1200,height:630,headers:{'Cache-Control':'public, max-age=300'}})
}
