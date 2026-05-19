import { http, HttpResponse } from "msw";

export const handlers = [
  // /api/chat — Gemini 스트리밍 채팅 모킹
  http.post("/api/chat", () => {
    return new HttpResponse("안녕하세요! 테스트 응답입니다.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }),

  // /api/checkout — Polar 체크아웃 세션 생성 모킹
  http.post("/api/checkout", () => {
    return HttpResponse.json({ url: "https://checkout.polar.sh/test-session" });
  }),

  // /api/billing/portal — 빌링 포털 URL 모킹
  http.post("/api/billing/portal", () => {
    return HttpResponse.json({ url: "https://polar.sh/portal/test" });
  }),

  // /api/billing/cancel — 구독 취소 모킹
  http.post("/api/billing/cancel", () => {
    return HttpResponse.json({ success: true });
  }),
];
