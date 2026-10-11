import { NextRequest, NextResponse } from 'next/server'
import { isPreviewMode } from '@/lib/runtime'
import { PREVIEW_COOKIE, readPreview } from '@/lib/preview'

export async function POST(request: NextRequest) {
  if (!isPreviewMode()) return new NextResponse(null, { status: 404 })
  const origin = request.headers.get('origin')
  if (!origin || origin !== `http://${request.headers.get('host')}`) return new NextResponse(null, { status: 403 })
  const form = await request.formData()
  const id = form.get('fellow')
  if (!readPreview().fellows.some(fellow => fellow.id === id)) return new NextResponse(null, { status: 400 })
  const response = NextResponse.redirect(new URL('/board', origin), 303)
  response.cookies.set(PREVIEW_COOKIE, String(id), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 86400 })
  return response
}
