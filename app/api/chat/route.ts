import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/encryption";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// 플랜별 월 사용량 한도 (null = 무제한)
const PLAN_LIMITS: Record<string, number | null> = {
  free: 10,
  pro: 100,
  unlimited: null,
}

// 현재 월 문자열 (YYYY-MM 형식)
function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// 요청 IP 추출 (프록시 헤더 우선)
function extractIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

interface UsageResult {
  allowed: boolean
  plan: string
  record: () => Promise<void>
}

// 사용량 한도 체크만 수행, 기록은 Gemini 성공 후 호출할 record() 반환
async function checkUsage(userId: string): Promise<UsageResult> {
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

// IP 주소를 user_activity_logs에 비동기 기록 (실패해도 무시)
async function logActivity(userId: string, ip: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from("user_activity_logs").insert({
      user_id: userId,
      ip_address: encrypt(ip),
      event_type: "chat",
    })
  } catch {
    // 로그 실패는 채팅 응답에 영향 없음
  }
}

// Gemini 스트리밍 채팅 API (히스토리 + 날짜 시스템 프롬프트 포함)
export async function POST(request: NextRequest) {
  try {
    const { message, history } = (await request.json()) as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return new Response("메시지가 비어있습니다.", { status: 400 });
    }

    // 인증 확인
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response("로그인이 필요합니다.", { status: 401 })
    }

    // 사용량 한도 체크 (기록은 Gemini 성공 후)
    const { allowed, plan, record } = await checkUsage(user.id)
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "usage_limit_exceeded", plan }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      )
    }

    // IP 비동기 로깅 (채팅 응답에 영향 없음)
    void logActivity(user.id, extractIp(request))

    const today = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: `[컨텍스트] 오늘: ${today}. 날짜를 직접 질문받을 때만 언급하세요. 한국어로 답변하세요.`,
    });

    // assistant → model 로 역할 변환 후 Gemini 히스토리 형식 변환
    const geminiHistory = (history ?? []).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    // sendMessageStream 성공 시점에 사용량 기록 (실패하면 record 미호출)
    const result = await chat.sendMessageStream(message);
    await record();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Gemini API 오류:", error);
    return new Response("AI 응답 생성 실패", { status: 500 });
  }
}
