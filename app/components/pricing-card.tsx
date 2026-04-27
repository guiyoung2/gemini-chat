'use client'

import { motion } from 'framer-motion'
import { Check, Zap, Crown, Sparkles, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type PlanId = 'free' | 'pro' | 'unlimited'

interface PricingCardsProps {
  currentPlan: string
  userEmail: string | null
  userId: string | null
}

interface PlanConfig {
  id: PlanId
  name: string
  price: number
  queries: string
  description: string
  features: string[]
  icon: React.ElementType
  recommended: boolean
}

// 플랜별 색상 팔레트
const PLAN_STYLES: Record<PlanId, {
  iconBg: string
  iconColor: string
  cardBorder: string
  cardGradient: string
  queriesColor: string
  checkColor: string
  upgradeBtnBg: string
}> = {
  free: {
    iconBg: 'bg-sky-600/20',
    iconColor: 'text-sky-400',
    cardBorder: 'border-sky-500/20 hover:border-sky-500/40',
    cardGradient: 'from-sky-900/10 to-[#111111]',
    queriesColor: 'text-sky-400',
    checkColor: 'text-sky-400',
    upgradeBtnBg: 'bg-sky-600/20 hover:bg-sky-600/30 text-sky-300',
  },
  pro: {
    iconBg: 'bg-indigo-600/20',
    iconColor: 'text-indigo-400',
    cardBorder: 'border-indigo-500/20 hover:border-indigo-500/40',
    cardGradient: 'from-indigo-900/10 to-[#111111]',
    queriesColor: 'text-indigo-400',
    checkColor: 'text-indigo-400',
    upgradeBtnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/25',
  },
  unlimited: {
    iconBg: 'bg-violet-600/20',
    iconColor: 'text-violet-400',
    cardBorder: 'border-violet-500/20 hover:border-violet-500/40',
    cardGradient: 'from-violet-900/10 to-[#111111]',
    queriesColor: 'text-violet-400',
    checkColor: 'text-violet-400',
    upgradeBtnBg: 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/25',
  },
}

const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    queries: '월 10회',
    description: '가볍게 시작하는 플랜',
    features: ['AI 쿼리 10회/월', '기본 기능', '커뮤니티 지원'],
    icon: Sparkles,
    recommended: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9900,
    queries: '월 100회',
    description: '개인 생산성을 높이는 플랜',
    features: ['AI 쿼리 100회/월', '모든 기본 기능', '이메일 지원', '빠른 응답'],
    icon: Zap,
    recommended: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 29900,
    queries: '무제한',
    description: '팀 또는 헤비 유저 플랜',
    features: ['AI 쿼리 무제한', '모든 Pro 기능', '우선순위 지원', 'API 접근'],
    icon: Crown,
    recommended: false,
  },
]

// 플랜 순서 (업그레이드 여부 판단)
const PLAN_ORDER: Record<PlanId, number> = { free: 0, pro: 1, unlimited: 2 }

const EASE_CURVE = [0.25, 0.4, 0.25, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: EASE_CURVE },
  }),
}

// 플랜 카드 목록 - 현재 플랜 뱃지, 업그레이드 버튼 처리
export default function PricingCards({
  currentPlan,
  userId,
}: PricingCardsProps) {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)

  const currentOrder = PLAN_ORDER[currentPlan as PlanId] ?? 0

  // 업그레이드 버튼 클릭 → Polar Checkout 생성 후 이동
  const handleUpgrade = async (planId: PlanId) => {
    if (!userId) {
      router.push('/login')
      return
    }

    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      const data = (await res.json()) as { url?: string; error?: string; detail?: string }

      if (!res.ok || !data.url) {
        throw new Error(data.detail ?? data.error ?? 'Checkout 생성 실패')
      }

      window.location.href = data.url
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '결제 페이지 이동 중 오류가 발생했습니다.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 페이지 헤더 */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          나에게 맞는{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            플랜 선택
          </span>
        </h1>
        <p className="text-white/50 text-lg">
          언제든지 업그레이드하거나 취소할 수 있습니다
        </p>
      </motion.div>

      {/* 플랜 카드 3열 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon
          const styles = PLAN_STYLES[plan.id]
          const isCurrent = plan.id === (currentPlan as PlanId)
          const isUpgradable = PLAN_ORDER[plan.id] > currentOrder
          const isLoading = loadingPlan === plan.id

          return (
            <motion.div
              key={plan.id}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={i + 1}
              className={cn(
                'relative flex flex-col p-8 rounded-2xl border bg-gradient-to-b transition-colors duration-200',
                styles.cardGradient,
                styles.cardBorder,
              )}
            >
              {/* 추천 뱃지 */}
              {plan.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                    추천
                  </span>
                </div>
              )}

              {/* 현재 플랜 뱃지 */}
              {isCurrent && (
                <div className="absolute top-5 right-5">
                  <span className="bg-white/10 text-white/60 text-xs font-medium px-3 py-1 rounded-full">
                    현재 플랜
                  </span>
                </div>
              )}

              {/* 아이콘 + 플랜 이름 */}
              <div className="flex items-center gap-3 mb-6">
                <div className={cn('p-2.5 rounded-xl', styles.iconBg)}>
                  <Icon className={cn('w-5 h-5', styles.iconColor)} />
                </div>
                <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
              </div>

              {/* 가격 표시 */}
              <div className="mb-1">
                {plan.price === 0 ? (
                  <span className="text-4xl font-bold text-white">무료</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      ₩{plan.price.toLocaleString('ko-KR')}
                    </span>
                    <span className="text-white/40 text-sm">/월</span>
                  </div>
                )}
              </div>

              {/* 쿼리 횟수 */}
              <p className={cn('text-sm font-semibold mb-1', styles.queriesColor)}>
                {plan.queries}
              </p>
              <p className="text-white/40 text-sm mb-8">{plan.description}</p>

              {/* 기능 목록 */}
              <ul className="flex flex-col gap-3 mb-10 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <Check className={cn('w-4 h-4 shrink-0', styles.checkColor)} />
                    <span className="text-white/65 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA 버튼 */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-white/5 text-white/35 text-sm font-medium cursor-default"
                >
                  현재 플랜
                </button>
              ) : isUpgradable ? (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isLoading}
                  className={cn(
                    'w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2',
                    styles.upgradeBtnBg,
                    isLoading && 'opacity-60 cursor-wait',
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '업그레이드'
                  )}
                </button>
              ) : (
                // 현재 플랜보다 낮은 플랜은 비활성 표시
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-white/5 text-white/30 text-sm font-medium cursor-default"
                >
                  다운그레이드 불가
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
