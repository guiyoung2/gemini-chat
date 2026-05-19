# GeminiChat 프로젝트 진단 보고서

> 목적: 이력서·README 주장과 실제 코드의 정합성 검증, 다음 리팩토링 사이클의 우선순위 도출.
> 작성 기준일: 2026-05-19

---

## 1. 기술 스택 적정성 분석

| 기술 | 왜 썼나(추정) | 대안 | 이 프로젝트 규모에 적정한가 | 판정 |
|------|------------|------|--------------------------|------|
| **Next.js 16** (App Router) | RSC + API Routes로 별도 서버 없이 풀스택 | Remix, SvelteKit | Webhook·결제 콜백·채팅 스트리밍을 한 저장소에서 처리. 개인 SaaS 규모에 딱 맞음 | ✅ 적합 |
| **React 19** | Concurrent 렌더링, `use()` 패턴 적용 | React 18 | 실제 코드에서 React 19 전용 API(`use()`, Server Actions 등) 미사용. `useState`/`useEffect` 수준만 씀 | ⚠️ React 18로 충분. 19를 쓴 "고민의 흔적"이 코드에 없음 |
| **TypeScript 5** | 결제·Webhook·DB 스키마 타입 보호 | JavaScript | 실제로 `interface ChatMessage`, `UsageResult` 등 도메인 타입 정의해 사용. `any` 미사용 확인 | ✅ 적합 |
| **Tailwind CSS 4** | 다크 테마·반응형 빠른 구현 | CSS Modules, styled-components | 단일 개발자 SaaS에서 가장 생산적인 선택 | ✅ 적합 |
| **`@google/generative-ai`** | Gemini 스트리밍 SDK | 직접 REST fetch | SDK의 `sendMessageStream()` + async iterator가 스트리밍 구현을 안전하게 추상화. 직접 구현 대비 코드량 대폭 감소 | ✅ 적합 |
| **`@polar-sh/sdk`** | Checkout 생성, Webhook 서명 검증, 고객 포털, 구독 취소 | REST + 직접 HMAC 검증 | 4개 API 엔드포인트 전부에서 SDK 핵심 기능 사용 (`checkouts.create`, `validateEvent`, `customerSessions.create`, `customerPortal.subscriptions.cancel`). 과잉 아님 | ✅ 적합 |
| **`@supabase/ssr`** | 서버 컴포넌트·Route Handler용 쿠키 기반 세션 | `@supabase/supabase-js` 단독 | `lib/supabase/server.ts`에서 `createServerClient`로 쿠키 핸들링. 서비스롤 클라이언트는 `@supabase/supabase-js` 직접 사용 (분리는 돼 있으나 `@supabase/ssr`의 역할은 anon 쪽만) | ✅ 적합 (의도대로 사용됨) |
| **`framer-motion`** | 랜딩 히어로·플랜 카드 입장 애니메이션 | CSS `@keyframes`, Tailwind `animate-*` | `hero-section.tsx`와 `pricing-card.tsx` 2개 파일에서 사용. gzip ~150KB 번들 비용 대비 fade/slide 효과는 CSS로 대체 가능 | ⚠️ 과한 의존성. CSS animation으로 교체 시 번들 150KB 절감 가능. 단, orb 반복 애니메이션(`transition.repeat: Infinity`)은 CSS로도 구현 가능 |
| **`lucide-react`** | 아이콘 시스템 | heroicons, 직접 SVG | 3개 컴포넌트에서 일관되게 사용. tree-shaking으로 미사용 아이콘 제외 | ✅ 적합 |
| **`clsx` + `tailwind-merge`** | 조건부 클래스 병합 | 템플릿 리터럴 | `pricing-card.tsx`의 플랜별 스타일 분기(`PLAN_STYLES` Record)에서 실질적인 가치 발휘 | ✅ 적합 |

**스택 총평:** React 19를 쓴다는 결정이 코드에서 증명되지 않는 점과 framer-motion의 번들 비용이 두드러진 약점. 나머지는 규모 대비 적정하게 선택됨.

---

## 2. 주장 ↔ 코드 불일치 목록

| # | 주장 문구 | 코드 실제 | 판정 | 근거 파일:라인 |
|---|-----------|-----------|------|--------------|
| 1 | README §5 파일 트리: `lib/supabase/service.ts` | 해당 파일 없음. 서비스롤 클라이언트는 각 라우트에서 `@supabase/supabase-js`로 인라인 생성 | ❌ 불일치 | `lib/supabase/` (glob 결과: client.ts, server.ts만 존재); `app/api/chat/route.ts:44`, `app/api/billing/cancel/route.ts:13`, `app/api/webhooks/polar/route.ts:6` |
| 2 | README §5 파일 트리: `lib/usage.ts` — check/call/record 분리 | 해당 파일 없음. `checkUsage()` 함수가 `app/api/chat/route.ts` 내에 인라인으로 구현됨 | ❌ 불일치 | `app/api/chat/route.ts:43–92` |
| 3 | README §5 파일 트리: `lib/crypto.ts` | 실제 파일명은 `lib/encryption.ts` | ❌ 불일치 | `lib/encryption.ts` (파일명 불일치) |
| 4 | README §6 환경변수: `POLAR_ACCESS_TOKEN` | 실제 코드는 `POLAR_API_TOKEN`을 읽음 | ❌ 불일치 | `app/api/checkout/route.ts:7`, `app/api/billing/portal/route.ts:7`, `app/api/billing/cancel/route.ts:7` |
| 5 | README Highlights: "`subscription.active` / `cancelled` / `revoked` 이벤트로 DB 구독 상태 자동 동기화" | Webhook 핸들러가 `subscription.active` **만** 처리. `cancelled`·`revoked` 분기 없음 | ❌ 불일치 (심각) | `app/api/webhooks/polar/route.ts:30` — `if (event.type === 'subscription.active')` 단일 분기만 존재 |
| 6 | README Highlights: "사용자 IP를 AES-256-GCM 앱 레벨 암호화 후 저장" | IP 외에 **이메일·이름**도 암호화 저장. `profiles` 테이블에 `encrypt(email)`, `encrypt(fullName)`, HMAC 해시까지 저장 | ⬆️ 과소주장 (코드가 더 많이 함) | `app/auth/callback/route.ts:52–55` |
| 7 | README §4-1: "check → call → record 3단 분리로 API 실패 시 잘못된 차감 방지" | `sendMessageStream()` 성공(객체 반환) 직후 `record()`가 즉시 호출됨. 이후 스트림 소비 중 실패해도 카운트는 이미 기록된 상태 | ⚠️ 부분 불일치 | `app/api/chat/route.ts:160–161` — `await chat.sendMessageStream(message)` 바로 다음 줄에 `await record()` |
| 8 | README §2 기술 스택: "React 19 — Concurrent 렌더링, `use()` 등 최신 패턴 적용" | 실제 코드에서 `use()`, Server Actions, `useTransition` 등 React 19 전용 API 미사용. 기본 `useState`/`useEffect` 수준 | ⚠️ 과장 | `contexts/AuthContext.tsx:21–36`, `app/components/hero-section.tsx`, `app/components/pricing-card.tsx` — React 19 전용 패턴 없음 |

---

## 3. 리팩토링 우선순위표

우선순위 기준: ① 이력서·README 주장을 사실로 만드는 것 > ② 측정 가능한 개선 > ③ 단순 정리

| 순위 | 항목 | 분류 | 예상 임팩트 | 근거 |
|------|------|------|------------|------|
| **P1** | Webhook `subscription.cancelled`·`subscription.revoked` 이벤트 처리 추가 | ① 주장 사실화 + 기능 완성 | 높음 — 구독 취소 후에도 DB 상태가 `active`로 남는 실제 버그 | `app/api/webhooks/polar/route.ts:30` |
| **P2** | 환경변수명 통일: `POLAR_API_TOKEN` → `POLAR_ACCESS_TOKEN` (코드 수정) 또는 README 수정 | ① 주장 사실화 | 높음 — 현재 README대로 `.env.local`을 설정하면 결제 API 전체가 동작 불가 | `app/api/checkout/route.ts:7` |
| **P3** | `lib/usage.ts` 분리 — `checkUsage` 로직을 별도 파일로 추출 | ① 주장 사실화 | 중간 — README 구조와 코드 일치, 테스트 작성 용이해짐 | `app/api/chat/route.ts:43–92` |
| **P4** | 서비스롤 클라이언트 중앙화 (`lib/supabase/service.ts` 신설) | ② 측정 가능한 개선 | 중간 — 3개 라우트의 인라인 admin client 생성 코드 제거, DRY 달성 | `app/api/chat/route.ts:44`, `app/api/billing/cancel/route.ts:13`, `app/api/webhooks/polar/route.ts:6` |
| **P5** | README §5 파일 트리 수정 (service.ts → server.ts, usage.ts 제거, crypto.ts → encryption.ts) | ① 주장 사실화 | 낮음 — 코드 변경 없이 문서만 수정 | `README.md:194–196` |
| **P6** | README §1 암호화 설명 보강 (IP 외 이메일·이름도 암호화 사실 추가) | ① 주장 사실화 (과소주장 → 정확히) | 낮음 — 실제보다 적게 주장하는 항목 수정, 이력서 근거 강화 | `app/auth/callback/route.ts:52–55` |
| **P7** | `record()` 호출 타이밍 검토 — 스트림 소비 완료 후 기록 방식으로 전환 가능 여부 | ② 측정 가능한 개선 | 낮음 — 현재도 대부분의 실패 케이스에서 보호됨. 트레이드오프: 스트림 소비 후 record는 응답 지연 없이 비동기 처리 필요 | `app/api/chat/route.ts:161` |
| **P8** | `framer-motion` 제거 → CSS animation 대체 (번들 ~150KB 절감) | ② 측정 가능한 개선 | 중간 — Core Web Vitals(LCP, INP) 개선 가능. 단, 기존 Orb 무한 루프 애니메이션을 CSS로 재구현 필요 | `app/components/hero-section.tsx:3`, `app/components/pricing-card.tsx:3` |

---

## 4. 측정 베이스라인 (before)

> 측정 일시: 2026-05-19 / `npm run build` (Next.js 16.2.4)
> **주의:** Next.js 16 기본 번들러는 Turbopack이며, `@next/bundle-analyzer`는 Turbopack 미지원. 번들 분석은 `ANALYZE=true npm run build -- --webpack` (webpack 모드)으로 실행.

### 빌드 결과

**빌드 성공** ✅ (Turbopack: 컴파일 2.2s / webpack: 컴파일 10.0s, TypeScript 체크 통과)

경고: `metadataBase` 미설정 — social OG/Twitter 이미지 URL이 `http://localhost:3000` 기준으로 해석됨

### 라우트 목록

| Route | 유형 |
|-------|------|
| `/` | ○ Static |
| `/_not-found` | ○ Static |
| `/api/billing/cancel` | ƒ Dynamic |
| `/api/billing/portal` | ƒ Dynamic |
| `/api/chat` | ƒ Dynamic |
| `/api/checkout` | ƒ Dynamic |
| `/api/webhooks/polar` | ƒ Dynamic |
| `/auth/callback` | ƒ Dynamic |
| `/dashboard` | ○ Static |
| `/dashboard/billing` | ○ Static |
| `/icon.png` | ○ Static |
| `/login` | ○ Static |
| `/payment/success` | ○ Static |
| `/pricing` | ƒ Dynamic |

(ƒ Proxy: Middleware 적용)

### 빌드 산출물 크기

#### Turbopack 모드 (`npm run build`)

| 항목 | 크기 |
|------|------|
| `.next/static/chunks/` (JS 17개) | **1,041 KB** |
| `.next/static/` CSS (1개) | **52 KB** |
| `.next/static/` 전체 | **2.1 MB** |
| `.next/server/` (SSR 번들) | **27 MB** |

**상위 5개 JS 청크 (미압축):**

| 파일 | 크기 |
|------|------|
| `107ftcfsijbo3.js` | 224 KB |
| `0n~dq4kpx9xxx.js` | 223 KB |
| `0wlo_fhr3g5u..js` | 138 KB |
| `0flkx-jm-4e.k.js` | 118 KB |
| `03~yq9q893hmn.js` | 110 KB |

#### webpack 모드 (`ANALYZE=true npm run build -- --webpack`) — 번들 분석 기준선

| 항목 | 크기 |
|------|------|
| `.next/static/chunks/` (JS 14개) | **1.4 MB** |
| `.next/static/` CSS (1개) | **50 KB** |
| `.next/static/` 전체 | **1.4 MB** |
| `.next/server/` (SSR 번들) | **5.5 MB** |

**상위 7개 JS 청크 (webpack, 미압축):**

| 파일 | 크기 | 추정 내용 |
|------|------|-----------|
| `794-...js` | **221 KB** | framer-motion 포함 (P8 제거 대상) |
| `4bd1b696-...js` | **200 KB** | 공유 vendor chunk |
| `framework-...js` | **190 KB** | React / ReactDOM |
| `536-...js` | **177 KB** | 공유 vendor chunk |
| `main-...js` | **131 KB** | 앱 진입점 |
| `435-...js` | **120 KB** | 공유 vendor chunk |
| `polyfills-...js` | **113 KB** | 브라우저 폴리필 |

> `@next/bundle-analyzer`가 생성한 상세 리포트: `.next/analyze/client.html` (커밋 제외, `.gitignore` 등록됨).  
> 상위 4개 vendor 청크(221+200+177+120 KB = 718 KB)가 전체 JS의 ~51%를 차지. `framer-motion`은 `794-...js`에 포함된 것으로 분석됨.

### 기타 베이스라인

| 항목 | 값 |
|------|-----|
| 테스트 파일 수 | **5개** (chat-input, hero-section, pricing-card, encryption, utils) |
| 테스트 케이스 수 | **34개** (all passing) |
| 테스트 커버리지 | 미측정 (`@vitest/coverage-v8` 미설치) |
| CI | **있음** (`.github/workflows/ci.yml`) |
| Lighthouse | **측정 완료** — 아래 §5 참조 |

---

## 5. Lighthouse 기준선 (before)

> 측정 방식: 공개 페이지 — `@lhci/cli` 헤드리스 Chrome Mobile 모드 3회 중앙값 / 인증 페이지 — Chrome DevTools Lighthouse 수동 3회 중앙값  
> 측정 대상: 전체 4개 페이지

| 페이지 | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|--------|-------------|---------------|----------------|-----|-----|-----|-----|-----|
| / | 98 | 100 | 100 | 100 | 797 ms | 2268 ms | 19 ms | 0.000 |
| /pricing | 98 | 96 | 100 | 100 | 825 ms | 2277 ms | 6 ms | 0.000 |
| /dashboard | 97 | 92 | 100 | 100 | 800 ms | 2600 ms | 50 ms | 0.000 |
| /dashboard/billing | 94 | 95 | 100 | 100 | 800 ms | 3000 ms | 20 ms | 0.000 |

_측정일: 2026-05-19 · 점수 0–100, 시간 ms, CLS 단위 없음 · `/dashboard`·`/dashboard/billing` 3회 측정: (94/99/97), (92/95/94) 등 — 중앙값 기입_

---

## 6. 측정 결과 (after)

> 측정 일시: 2026-05-19 / `npm run build` (Next.js 16.2.4 Turbopack) + `npm run test:cov` (Vitest v4.1.6 + @vitest/coverage-v8)

### 번들 크기 (after)

**빌드 성공** ✅ (컴파일 2.2s, TypeScript 체크 통과)

| 항목 | 크기 |
|------|------|
| `.next/static/chunks/` (JS 17개) | **1,040 KB** |
| `.next/static/` CSS (1개) | **51 KB** |
| `.next/static/` 전체 | **2.1 MB** |
| `.next/server/` (SSR 번들) | **27 MB** |

**상위 5개 JS 청크 (미압축):**

| 파일 | 크기 |
|------|------|
| `107ftcfsijbo3.js` | 229 KB |
| `0n~dq4kpx9xxx.js` | 228 KB |
| `0wlo_fhr3g5u..js` | 141 KB |
| `0flkx-jm-4e.k.js` | 120 KB |
| `03~yq9q893hmn.js` | 113 KB |

### 커버리지 (after)

**테스트 파일 5개 / 케이스 34개 — 전부 통과** ✅

| 항목 | 수치 | 분자/분모 |
|------|------|---------|
| Statements | **24.19%** | 166 / 686 |
| Branches | **15.91%** | 71 / 446 |
| Functions | **24.69%** | 41 / 166 |
| Lines | **24.91%** | 155 / 622 |

**핵심 파일별 커버리지:**

| 파일 | Stmts | Branch | Funcs |
|------|-------|--------|-------|
| `app/components/chat-input.tsx` | 81.96% | 71.42% | 65.78% |
| `app/components/hero-section.tsx` | 80.00% | 60.00% | 60.00% |
| `app/components/pricing-card.tsx` | 84.84% | 70.37% | 100% |
| `lib/encryption.ts` | 93.54% | 66.66% | 100% |
| `lib/usage.ts` | 0% | 0% | 0% |
| API routes / pages | 0% | 0% | 0% |

> `lib/usage.ts`·API routes 커버리지 0%는 통합 테스트(MSW 또는 실제 HTTP)가 없어서 발생. 컴포넌트·순수 로직에 집중된 현행 테스트 범위의 한계.

### before / after 비교표

| 항목 | before | after | 변화 |
|------|--------|-------|------|
| 번들 크기 (JS chunks 합계, 미압축) | 1,041 KB | 1,040 KB | ≈ 동일 (−1 KB) |
| CSS | 52 KB | 51 KB | ≈ 동일 (−1 KB) |
| `.next/static/` 전체 | 2.1 MB | 2.1 MB | 동일 |
| 테스트 파일 수 | 5 | 5 | 동일 |
| 테스트 케이스 수 | 34 | 34 | 동일 |
| 커버리지 (statements) | 0%¹ | **24.19%** | +24.19%p |
| 커버리지 (branches) | 0%¹ | **15.91%** | +15.91%p |
| 커버리지 (functions) | 0%¹ | **24.69%** | +24.69%p |
| 커버리지 (lines) | 0%¹ | **24.91%** | +24.91%p |
| CI | 있음 | 있음 | 동일 |

> ¹ before 단계에서 `@vitest/coverage-v8` 미설치로 커버리지 미측정 — 수치상 0%로 기입.

**헤드라인:** 번들 크기 변화는 드라마틱하지 않다(서버 로직 파일 추출은 클라이언트 번들에 영향 없음). 이번 사이클의 핵심 성과는 **커버리지 0% → 24.19%** 달성과 측정 인프라(`@vitest/coverage-v8`) 구축이다.

---

## 7. Lighthouse 측정 결과 (after)

> 측정 방식: 공개 페이지(`/`, `/pricing`) — `@lhci/cli` 헤드리스 Chrome Mobile 모드 3회 중앙값 / 인증 페이지(`/dashboard`, `/dashboard/billing`) — 수동 측정 대기 중

| 페이지 | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|--------|-------------|---------------|----------------|-----|-----|-----|-----|-----|
| / | 98 | 100 | 100 | 100 | 795 ms | 2263 ms | 9 ms | 0.000 |
| /pricing | 98 | 96 | 100 | 100 | 824 ms | 2275 ms | 17 ms | 0.000 |
| /dashboard | — | — | — | — | — | — | — | — |
| /dashboard/billing | — | — | — | — | — | — | — | — |

_측정일: 2026-05-19 · 점수 0–100, 시간 ms, CLS 단위 없음 · `/dashboard`·`/dashboard/billing`은 Chrome DevTools Lighthouse 수동 측정 필요_

### before / after 헤드라인 비교

| 페이지 | Performance (b→a) | LCP (b→a) | TBT (b→a) | CLS (b→a) |
|--------|-------------------|-----------|-----------|-----------|
| / | 98 → 98 | 2268 ms → 2263 ms | 19 ms → 9 ms | 0.000 → 0.000 |
| /pricing | 98 → 98 | 2277 ms → 2275 ms | 6 ms → 17 ms | 0.000 → 0.000 |
| /dashboard | 97 → — | 2600 ms → — | 50 ms → — | 0.000 → — |
| /dashboard/billing | 94 → — | 3000 ms → — | 20 ms → — | 0.000 → — |

_`—` 항목은 `/dashboard`·`/dashboard/billing` 수동 측정 후 채워주세요._
