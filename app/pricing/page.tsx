import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PricingCards from '@/app/components/pricing-card'

// 현재 유저의 구독 플랜을 조회해 PricingCards에 전달
export default async function PricingPage() {
  const supabase = await createClient()

  let currentPlan = 'free'
  let userEmail: string | null = null
  let userId: string | null = null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    userEmail = user.email ?? null
    userId = user.id

    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (data?.plan) currentPlan = data.plan
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] py-20 px-4">
      {/* 대시보드 뒤로가기 버튼 */}
      <div className="max-w-5xl mx-auto mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          대시보드로 돌아가기
        </Link>
      </div>
      <PricingCards
        currentPlan={currentPlan}
        userEmail={userEmail}
        userId={userId}
      />
    </main>
  )
}
