'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { ArrowLeft, ExternalLink, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ===== TYPES =====

interface SubscriptionData {
  plan: 'free' | 'pro' | 'unlimited'
  status: string
  current_period_end: string | null
}

// ===== 플랜 메타데이터 =====

const PLAN_META: Record<
  string,
  { label: string; price: string; limit: number | null; color: string; badgeClass: string }
> = {
  free: {
    label: 'Free',
    price: '무료',
    limit: 10,
    color: 'text-white/60',
    badgeClass: 'bg-white/10 text-white/60',
  },
  pro: {
    label: 'Pro',
    price: '₩9,900/월',
    limit: 100,
    color: 'text-indigo-400',
    badgeClass: 'bg-indigo-600/20 text-indigo-400',
  },
  unlimited: {
    label: 'Unlimited',
    price: '₩29,900/월',
    limit: null,
    color: 'text-violet-400',
    badgeClass: 'bg-violet-600/20 text-violet-400',
  },
}

// 날짜 포맷: ISO → 2026년 5월 27일
function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ===== MAIN PAGE =====

export default function BillingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [usageCount, setUsageCount] = useState(0)
  const [isLoadingSub, setIsLoadingSub] = useState(true)

  const [isPortalLoading, setIsPortalLoading] = useState(false)
  const [isCancelLoading, setIsCancelLoading] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  // 미로그인 시 리다이렉트
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // 구독 정보 + 이번 달 사용량 조회
  useEffect(() => {
    if (loading || !user) return

    void Promise.all([
      supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
      // usage 테이블이 없으면 0 반환
      supabase
        .from('usage')
        .select('count', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .then((r) => r)
        .catch(() => ({ count: 0 })),
    ]).then(([subResult, usageResult]) => {
      if (subResult.data) {
        setSubscription({
          plan: subResult.data.plan as SubscriptionData['plan'],
          status: subResult.data.status as string,
          current_period_end: subResult.data.current_period_end as string | null,
        })
      }
      setUsageCount(
        typeof (usageResult as { count: number | null }).count === 'number'
          ? ((usageResult as { count: number | null }).count ?? 0)
          : 0,
      )
      setIsLoadingSub(false)
    })
  }, [user, loading, supabase])

  // Polar 고객 포털 열기
  async function handleOpenPortal() {
    setIsPortalLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? '포털 URL 생성 실패')
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsPortalLoading(false)
    }
  }

  // 구독 취소 실행
  async function handleCancelSubscription() {
    setIsCancelLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? '취소 실패')
      setCancelSuccess(true)
      setShowCancelConfirm(false)
      setSubscription((prev) => (prev ? { ...prev, status: 'canceled' } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1217]">
        <div className="flex items-center gap-3 text-white/40">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-sm">로딩 중...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  const plan = subscription?.plan ?? 'free'
  const meta = PLAN_META[plan]
  const isActive = subscription?.status === 'active'
  const isCanceled = subscription?.status === 'canceled'
  const hasPaidPlan = plan !== 'free'
  const usageLimit = meta.limit
  const usagePct = usageLimit ? Math.min((usageCount / usageLimit) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-[#0A1217] text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center h-14 px-5 bg-[#0F1923] border-b border-white/6">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          대시보드
        </button>
      </header>

      {/* 본문 */}
      <main className="max-w-lg mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold text-white mb-1">Billing</h1>
        <p className="text-sm text-white/40 mb-7">구독 및 결제 정보를 관리합니다</p>

        {isLoadingSub ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/4 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* ── 현재 플랜 카드 ── */}
            <div className="rounded-2xl bg-[#161F2C] border border-white/6 p-5">
              <p className="text-xs text-white/40 mb-3">현재 플랜</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-white">{meta.label}</span>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-lg font-semibold text-white">{meta.price}</span>
                  {hasPaidPlan && (
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        isCanceled
                          ? 'bg-amber-500/15 text-amber-400'
                          : isActive
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-white/10 text-white/40',
                      )}
                    >
                      {isCanceled ? '취소됨' : isActive ? '활성' : subscription?.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── 이번 달 사용량 카드 ── */}
            <div className="rounded-2xl bg-[#161F2C] border border-white/6 p-5">
              <p className="text-xs text-white/40 mb-3">이번 달 사용량</p>

              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-bold text-white">{usageCount}</span>
                <span className="text-sm text-white/40">
                  / {usageLimit !== null ? `${usageLimit}회` : '무제한'}
                </span>
              </div>

              {/* 사용량 프로그레스 바 */}
              <div className="w-full h-1.5 rounded-full bg-white/8 mb-3 overflow-hidden">
                {usageLimit !== null ? (
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      usagePct >= 90
                        ? 'bg-red-500'
                        : usagePct >= 70
                          ? 'bg-amber-500'
                          : plan === 'pro'
                            ? 'bg-indigo-500'
                            : 'bg-white/30',
                    )}
                    style={{ width: `${usagePct}%` }}
                  />
                ) : (
                  <div className="h-full w-full bg-violet-500/40 rounded-full" />
                )}
              </div>

              {subscription?.current_period_end && (
                <p className="text-xs text-white/35">
                  다음 결제일: {formatDate(subscription.current_period_end)}
                </p>
              )}
            </div>

            {/* ── 오류 / 취소 성공 메시지 ── */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {cancelSuccess && (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                구독이 취소되었습니다. 현재 결제 기간이 끝나면 Free 플랜으로 전환됩니다.
              </div>
            )}

            {/* ── 액션 버튼 ── */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => router.push('/pricing')}
                className="flex-1 py-3 rounded-xl bg-white text-[#0A1217] font-semibold text-sm hover:bg-white/90 transition-colors"
              >
                플랜 변경
              </button>
              <button
                onClick={handleOpenPortal}
                disabled={isPortalLoading || !hasPaidPlan}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold border transition-colors',
                  hasPaidPlan
                    ? 'border-white/20 text-white hover:bg-white/6'
                    : 'border-white/8 text-white/25 cursor-not-allowed',
                )}
              >
                {isPortalLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-transparent animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                결제 수단 · 청구서 관리
              </button>
            </div>

            {/* ── 구독 취소 섹션 ── */}
            {hasPaidPlan && !isCanceled && !cancelSuccess && (
              <div className="rounded-2xl bg-[#161F2C] border border-white/6 p-5 mt-2">
                <p className="text-sm font-semibold text-white mb-1">구독 취소</p>
                <p className="text-xs text-white/40 mb-4">
                  취소하면 현재 결제 기간이 끝난 후 Free 플랜으로 전환됩니다.
                </p>

                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2 rounded-xl border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
                  >
                    구독 취소
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleCancelSubscription}
                      disabled={isCancelLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      {isCancelLoading && (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-red-400/40 border-t-red-400 animate-spin" />
                      )}
                      정말 취소할게요
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-4 py-2 rounded-xl text-white/40 text-sm hover:text-white/70 transition-colors"
                    >
                      돌아가기
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 이미 취소된 상태 안내 */}
            {isCanceled && !cancelSuccess && (
              <div className="rounded-2xl bg-[#161F2C] border border-white/6 p-5 mt-2">
                <p className="text-sm font-semibold text-amber-400 mb-1">구독 취소 예정</p>
                <p className="text-xs text-white/40">
                  {subscription?.current_period_end
                    ? `${formatDate(subscription.current_period_end)}에 Free 플랜으로 전환됩니다.`
                    : '현재 결제 기간이 끝나면 Free 플랜으로 전환됩니다.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
