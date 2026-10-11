import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const redirectTo = request.nextUrl.clone()

  if (!token_hash || type !== 'email') {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.set('error', 'expired')
    redirectTo.searchParams.delete('token_hash')
    redirectTo.searchParams.delete('type')
    return NextResponse.redirect(redirectTo)
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: 'email',
  })

  if (error) {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.delete('token_hash')
    redirectTo.searchParams.delete('type')
    // Map common errors
    if (error.message.includes('expired')) {
      redirectTo.searchParams.set('error', 'expired')
    } else {
      redirectTo.searchParams.set('error', 'used')
    }
    return NextResponse.redirect(redirectTo)
  }

  // Success — redirect to board
  redirectTo.pathname = '/board'
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  const redirectResponse = NextResponse.redirect(redirectTo)
  response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
  return redirectResponse
}
