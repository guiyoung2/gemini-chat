import { createClient as createAdminClient } from '@supabase/supabase-js'

// 플랜별 월 사용량 한도 (null = 무제한)
export const PLAN_LIMITS: Record<string, number | null> = {
  free: 10,
  pro: 100,
  unlimited: null,
}

// 현재 월 문자열 (YYYY-MM 형식)
function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export interface UsageResult {
  allowed: boolean
  plan: string
  record: () => Promise<void>
}

// 사용량 한도 체크 및 기록 함수 반환
export async function checkUsage(userId: string): Promise<UsageResult> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 활성 구독 플랜 조회 (없으면 free)
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()

  const plan: string = sub?.plan ?? "free"
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const month = currentMonth()

  // 현재 월 사용량 행 조회
  const { data: usageRow } = await admin
    .from("usage")
    .select("id, count")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle()

  const currentCount = usageRow?.count ?? 0

  // 한도 초과 시 빈 record() 반환
  if (limit !== null && currentCount >= limit) {
    return { allowed: false, plan, record: async () => {} }
  }

  // Gemini 성공 후 호출할 기록 함수 (실패 시 미호출 → 카운트 안 올라감)
  return {
    allowed: true,
    plan,
    record: async () => {
      if (usageRow) {
        await admin
          .from("usage")
          .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
          .eq("id", usageRow.id)
      } else {
        await admin.from("usage").insert({ user_id: userId, month, count: 1 })
      }
    },
  }
}
