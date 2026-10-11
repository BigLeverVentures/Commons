import { timingSafeEqual, createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isPreviewMode } from '@/lib/runtime'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { introductionDraft, notificationDraft, sendNotification } from '@/lib/notifications'

export const maxDuration = 120
export async function POST(request: NextRequest) {
  if (isPreviewMode()) return NextResponse.json({error:'Email delivery is disabled in preview.'},{status:404})
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization') ?? ''
  const hash = (value:string) => createHash('sha256').update(value).digest()
  if (!secret || !timingSafeEqual(hash(supplied),hash(`Bearer ${secret}`))) return NextResponse.json({error:'Unauthorized'},{status:401})
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM, appUrl = process.env.APP_URL
  const db = getSupabaseAdminClient()
  if (!key || !from || !appUrl || !db) return NextResponse.json({error:'Notification delivery is not configured.'},{status:503})
  try { if (new URL(appUrl).protocol !== 'https:') throw new Error() } catch { return NextResponse.json({error:'APP_URL must be a complete HTTPS URL.'},{status:503}) }
  const queued = await db.rpc('queue_quiet_post_nudges')
  if (queued.error) return NextResponse.json({error:'Unable to queue reminders.'},{status:500})
  const claimed = await db.rpc('claim_notifications',{batch_size:10})
  if (claimed.error) return NextResponse.json({error:'Unable to claim notifications.'},{status:500})
  let sent = 0, cancelled = 0, failed = 0
  for (const item of claimed.data ?? []) {
    try {
      const [postResult,fellowResult] = await Promise.all([
        db.from('posts').select('id,user_id,title,status,built_at,updated_at').eq('id',item.post_id).maybeSingle(),
        db.from('fellows').select('email_notifications,introduction_emails').eq('id',item.recipient_id).maybeSingle(),
      ])
      if (postResult.error || fellowResult.error) throw new Error('Could not verify delivery eligibility.')
      const post = postResult.data, fellow = fellowResult.data
      let skip = !post || post.user_id !== item.recipient_id || !(item.kind === 'response' ? fellow?.introduction_emails : fellow?.email_notifications)
      if (item.kind === 'nudge' && post) {
        const { count, error } = await db.from('responses').select('id',{count:'exact',head:true}).eq('post_id',post.id)
        if (error) throw new Error('Could not verify reminder eligibility.')
        skip ||= post.status !== 'open' || !!post.built_at || !!count || new Date(post.updated_at).getTime() > Date.now() - 14 * 86400000
      }
      if (skip) {
        const { error } = await db.from('notification_outbox').update({cancelled_at:new Date().toISOString(),lease_expires_at:null}).eq('id',item.id)
        if (error) throw new Error('Could not record cancellation.')
        cancelled++; continue
      }
      const { data, error } = await db.auth.admin.getUserById(item.recipient_id)
      if (error) throw new Error('Could not verify recipient identity.')
      if (!data.user?.email || !data.user.email_confirmed_at) throw new Error('Recipient has no confirmed email.')
      let draft
      if (item.kind === 'response') {
        if (!item.response_id) throw new Error('Introduction reference is missing; review historical queue records.')
        const response = await db.from('responses').select('post_id,user_id,note').eq('id',item.response_id).maybeSingle()
        if (response.error) throw new Error('Could not load introduction.')
        if (!response.data || response.data.post_id !== item.post_id) throw new Error('Introduction does not match its post.')
        const [identity, profile] = await Promise.all([
          db.auth.admin.getUserById(response.data.user_id),
          db.from('fellows').select('name,cohort').eq('id',response.data.user_id).maybeSingle(),
        ])
        if (identity.error || profile.error) throw new Error('Could not verify introducing fellow.')
        if (!identity.data.user?.email_confirmed_at || !identity.data.user.email) throw new Error('Introducing fellow has no confirmed email.')
        draft = introductionDraft(item.id,data.user.email,post!,appUrl,{name:profile.data?.name ?? null,cohort:profile.data?.cohort ?? null,email:identity.data.user.email,note:response.data.note})
      } else draft = notificationDraft(item.kind,item.id,data.user.email,post!,appUrl)
      await sendNotification(draft,{key,from})
      const saved = await db.from('notification_outbox').update({delivered_at:new Date().toISOString(),lease_expires_at:null,last_error:null}).eq('id',item.id)
      if (saved.error) throw new Error('Could not record delivery.')
      sent++
    } catch (error) {
      const saved = await db.from('notification_outbox').update({lease_expires_at:null,next_attempt_at:new Date(Date.now()+Math.min(64,2**item.attempts)*60000).toISOString(),last_error:error instanceof Error ? error.message : 'Delivery failed.'}).eq('id',item.id)
      if (saved.error) return NextResponse.json({error:'Unable to save retry state.',sent,cancelled,failed:failed+1},{status:500})
      failed++
    }
  }
  return NextResponse.json({sent,cancelled,failed},{status:failed ? 502 : 200})
}
