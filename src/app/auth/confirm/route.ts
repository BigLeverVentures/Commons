import { COMMUNITY } from '@/config/community'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Keep tokens out of Referer without suppressing Origin on native form POSTs.
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'strict-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
}

function validToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{1,256}$/.test(token)
}

function redirect(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303)
  Object.entries(privateHeaders).forEach(([name, value]) => response.headers.set(name, value))
  return response
}

// Email previews and security scanners must not consume the one-use token.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token_hash')
  if (!validToken(token) || request.nextUrl.searchParams.get('type') !== 'email') {
    return redirect(request, '/login?error=expired')
  }
  const communityName = COMMUNITY.name.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · ${communityName}</title><style>
    :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;background:#f8f2e9;color:#0d121d;font:18px/1.6 Arial,sans-serif}main{max-width:520px;margin:12vh auto;padding:24px}h1{font:700 36px/1.2 Georgia,serif}button{width:100%;min-height:48px;border:1px solid #8d5431;border-radius:14px;background:#fffdf9;color:#8d5431;font:inherit;padding:12px;cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid currentColor;outline-offset:4px}a{color:#8d5431}@media(prefers-color-scheme:dark){body{background:#0d121d;color:#f8f2e9}button{background:#171e2d;color:#ffca75;border-color:#ffca75}a{color:#ffca75}}
    </style></head><body><main><h1>Come on in.</h1><p>Press Sign in to enter ${communityName}. No password needed.</p><form action="/auth/confirm" method="post"><input type="hidden" name="token_hash" value="${token}"><input type="hidden" name="type" value="email"><button type="submit">Sign in</button></form><p><a href="/login">Request a new link</a></p></main></body></html>`, {
    headers: { ...privateHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function HEAD() {
  return new NextResponse(null, { status: 204, headers: privateHeaders })
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return new NextResponse('Please open your sign-in link again.', { status: 403, headers: privateHeaders })
  }
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return redirect(request, '/login?error=expired')
  }
  const token = form.get('token_hash')
  if (!validToken(token) || form.get('type') !== 'email') {
    return redirect(request, '/login?error=expired')
  }
  const response = redirect(request, '/board')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )
  try {
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' })
    if (error) {
      const invalid = error.code === 'otp_expired' || /expired|invalid|already.*used/i.test(error.message)
      return redirect(request, invalid ? '/login?error=expired' : '/login?error=unavailable')
    }
    return response
  } catch {
    return redirect(request, '/login?error=unavailable')
  }
}
