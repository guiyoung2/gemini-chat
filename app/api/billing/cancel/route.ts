import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { Polar } from '@polar-sh/sdk'

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER as 'sandbox' | 'production') ?? 'production',
})

// 구독 기간 만료 후 취소 (즉시 해지 아님)
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // DB에서 polar_subscription_id 조회
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('polar_subscription_id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!sub?.polar_subscription_id) {
      return NextResponse.json({ error: '활성 구독을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (sub.status === 'canceled') {
      return NextResponse.json({ error: '이미 취소된 구독입니다.' }, { status: 400 })
    }

    // 고객 세션 토큰 생성
    const session = await polar.customerSessions.create({
      externalCustomerId: user.id,
    })

    // Polar 구독 취소 (기간 만료 후 해지)
    await polar.customerPortal.subscriptions.cancel(
      { customerSession: session.token },
      { id: sub.polar_subscription_id },
    )

    // Supabase DB에 취소 상태 반영
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Subscription cancel error:', error)
    return NextResponse.json(
      { error: '구독 취소 중 오류가 발생했습니다.', detail },
      { status: 500 },
    )
  }
}
