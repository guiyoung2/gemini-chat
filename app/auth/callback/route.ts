import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt, hashForLookup } from '@/lib/encryption'

// 구글 OAuth 콜백 처리 - 인가 코드를 세션으로 교환 후 profiles 동기화
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    // 로그인 성공 시 profiles 테이블에 암호화된 PII 동기화
    if (session?.user) {
      try {
        const user = session.user
        const email = user.email
        const rawFullName: unknown = user.user_metadata?.full_name
        const fullName = typeof rawFullName === 'string' && rawFullName ? rawFullName : null

        if (email) {
          const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SECRET_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )

          await admin.from('profiles').upsert(
            {
              id: user.id,
              email: encrypt(email),
              email_hash: hashForLookup(email),
              full_name: fullName ? encrypt(fullName) : null,
              full_name_hash: fullName ? hashForLookup(fullName) : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
        }
      } catch (err) {
        // profiles 동기화 실패 시 로그인 자체는 계속 진행
        console.error('profiles 동기화 실패:', err)
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
