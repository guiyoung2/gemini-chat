import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard']
const authRoutes = ['/login']

function needsAuth(pathname: string) {
  return (
    protectedRoutes.some((r) => pathname.startsWith(r)) ||
    authRoutes.includes(pathname)
  )
}

function createSupabaseClient(request: NextRequest, response: NextResponse) {
  let supabaseResponse = response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, getResponse: () => supabaseResponse }
}

// 인증이 필요한 라우트에서만 Supabase 세션 검증
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 인증 불필요한 페이지는 Supabase 호출 없이 즉시 통과
  if (!needsAuth(pathname)) {
    return NextResponse.next({ request })
  }

  const response = NextResponse.next({ request })
  const { supabase, getResponse } = createSupabaseClient(request, response)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (protectedRoutes.some((r) => pathname.startsWith(r)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (authRoutes.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return getResponse()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',],
}
