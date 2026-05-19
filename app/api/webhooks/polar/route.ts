import { NextRequest, NextResponse } from 'next/server'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { supabaseAdmin } from '@/lib/supabase/service'

// Polar 상품 ID → 플랜 이름 매핑
function getPlanFromProductId(productId: string): string | null {
  if (productId === process.env.POLAR_PRODUCT_ID_PRO) return 'pro'
  if (productId === process.env.POLAR_PRODUCT_ID_UNLIMITED) return 'unlimited'
  return null
}

// Polar Webhook 수신 및 구독 DB 업데이트
export async function POST(req: NextRequest) {
  const body = await req.text()
  const headers = Object.fromEntries(req.headers.entries())

  try {
    const event = validateEvent(
      body,
      headers,
      process.env.POLAR_WEBHOOK_SECRET!,
    )

    if (event.type === 'subscription.active') {
      const sub = event.data
      const userId = sub.customer.externalId
      const plan = getPlanFromProductId(sub.productId)

      if (userId && plan) {
        const { error } = await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId,
            plan,
            polar_subscription_id: sub.id,
            polar_customer_id: sub.customerId,
            status: 'active',
            current_period_end: sub.currentPeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )

        if (error) {
          console.error('Subscription upsert error:', error)
          return NextResponse.json(
            { error: 'DB update failed' },
            { status: 500 },
          )
        }
      }
    }

    // 구독 취소·강제 해지 이벤트 처리
    if (
      event.type === 'subscription.canceled' ||
      event.type === 'subscription.revoked'
    ) {
      const sub = event.data
      const userId = sub.customer.externalId

      if (userId) {
        const newStatus =
          event.type === 'subscription.revoked' ? 'revoked' : 'canceled'

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        if (error) {
          console.error('Subscription status update error:', error)
          return NextResponse.json(
            { error: 'DB update failed' },
            { status: 500 },
          )
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
