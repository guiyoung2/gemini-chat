import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Polar } from '@polar-sh/sdk'
import { encrypt } from '@/lib/encryption'

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER as 'sandbox' | 'production') ?? 'production',
})

// 플랜 이름 → Polar 상품 ID 매핑
function getProductId(plan: string): string | null {
  if (plan === 'pro') return process.env.POLAR_PRODUCT_ID_PRO ?? null
  if (plan === 'unlimited') return process.env.POLAR_PRODUCT_ID_UNLIMITED ?? null
  return null
}

// 요청 IP 추출
function extractIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// Polar Checkout 세션 생성 후 리다이렉트 URL 반환
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 결제 시도 IP 로깅 (실패해도 checkout 계속)
    try {
      await supabase.from('user_activity_logs').insert({
        user_id: user.id,
        ip_address: encrypt(extractIp(req)),
        event_type: 'checkout',
      })
    } catch {
      // 로그 실패는 결제 흐름에 영향 없음
    }

    const { plan } = (await req.json()) as { plan: string }
    const productId = getProductId(plan)

    if (!productId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const host = req.headers.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const origin = `${protocol}://${host}`

    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${origin}/payment/success`,
      customerEmail: user.email,
      externalCustomerId: user.id,
    })

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Checkout creation error:', error)
    return NextResponse.json(
      { error: 'Checkout creation failed', detail },
      { status: 500 },
    )
  }
}
