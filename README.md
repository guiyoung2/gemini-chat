# GeminiChat

> Google Gemini API 기반 **실시간 스트리밍 AI 채팅 + 구독 결제**가 결합된 개인 SaaS 프로젝트.
> 가입 → 무료 플랜 → 사용량 한도 → 업그레이드 유도 → 결제 → 기능 해제까지 **서비스 흐름 전체를 직접 설계·구현**했습니다.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%2BRLS-3FCF8E?logo=supabase)](https://supabase.com/)
[![Polar](https://img.shields.io/badge/Polar-Subscription-0062FF)](https://polar.sh/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com/)

**Live**: [gemini-gy-ruby.vercel.app](https://gemini-gy-ruby.vercel.app)
**Repo**: [github.com/guiyoung2/gemini-chat](https://github.com/guiyoung2/gemini-chat)

---

## 1. Highlights

| 영역                | 내용                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| **AI 스트리밍**     | `ReadableStream`으로 Gemini 응답을 청크 단위로 UI에 실시간 반영         |
| **사용량 제어**     | check → call → record 3단 분리로 **API 실패 시 잘못된 차감 방지**       |
| **결제 보안**       | Polar Webhook **서명 검증** (`validateEvent` 실패 시 403), DB 위조 차단 |
| **데이터 보안**     | 사용자 IP를 **AES-256-GCM 앱 레벨 암호화** 후 저장                      |
| **권한 모델**       | Supabase RLS로 사용자별 데이터 격리, Webhook은 서비스 롤로 우회 처리    |
| **멀티턴 컨텍스트** | Gemini `history` 파라미터로 이전 대화 흐름 유지                         |

> Lighthouse / Core Web Vitals 실측 수치는 측정 후 채워질 자리입니다.
>
> | 지표        | 값          |
> | ----------- | ----------- |
> | Performance | _측정 예정_ |
> | LCP         | _측정 예정_ |
> | INP         | _측정 예정_ |
> | CLS         | _측정 예정_ |

---

## 2. 기술 스택과 선택 이유

### Frontend

| 기술                        | 사용 이유                                                                      |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Next.js 16** (App Router) | RSC + API Routes로 별도 서버 없이 풀스택 구현. 결제 콜백·Webhook 핸들링 일원화 |
| **React 19**                | Concurrent 렌더링, `use()` 등 최신 패턴 적용                                   |
| **TypeScript**              | 결제·Webhook·DB 스키마처럼 형이 깨지면 위험한 영역 보호                        |
| **Tailwind CSS 4**          | 다크 테마 일관성·반응형 빠르게 구현                                            |
| **Framer Motion**           | 랜딩 히어로·진입 애니메이션                                                    |
| **Lucide React**            | 일관된 아이콘 시스템                                                           |

### Backend & Infra

| 기술                  | 사용 이유                                                                       |
| --------------------- | ------------------------------------------------------------------------------- |
| **Supabase**          | PostgreSQL + Auth + RLS를 한 곳에서. 백엔드 서버 없이도 권한 모델까지 구현 가능 |
| **Google Gemini API** | 스트리밍 응답이 SDK 레벨에서 안정적. 가격·한도 정책이 개인 SaaS에 적합          |
| **Polar**             | Stripe 대비 결제·Webhook 구조 학습에 진입장벽 낮고, sandbox 환경이 명확         |
| **Vercel**            | git push 즉시 배포, App Router·Edge Function과의 정합성이 가장 좋음             |

---

## 3. 주요 기능

### 인증

- **Google OAuth** — Supabase Auth, `auth/callback` 라우트에서 세션 교환
- 미로그인 보호 라우트 자동 리다이렉트

### AI 채팅

- **실시간 스트리밍** — 서버 `ReadableStream` → 클라이언트 `getReader()`로 청크 단위 메시지 누적 렌더
- **대화 히스토리** — `conversations` / `messages` 테이블에 영구 저장
- **컨텍스트 유지** — 이전 대화 배열을 Gemini `history`로 전달, 멀티턴 자연스럽게 이어짐
- 대화 검색, 삭제, 날짜별 그룹핑(오늘 / 어제 / 이번 주 / 지난 주)

### 구독 & 결제

| 플랜      | 월 사용량 | 가격    |
| --------- | --------- | ------- |
| Free      | 10회      | 무료    |
| Pro       | 100회     | ₩9,900  |
| Unlimited | 무제한    | ₩29,900 |

- **Polar Checkout** — 결제 페이지 리다이렉트 방식
- **Webhook 처리** — `subscription.active` / `cancelled` / `revoked` 이벤트로 DB 구독 상태 자동 동기화
- **Polar Customer Portal** — 결제 수단 변경·청구서 확인 외부 위임
- **구독 취소** — 확인 모달 + 기간 만료 후 Free 자동 전환

### 사용량 제어

- 요청 시 **플랜 한도 선체크 → Gemini 호출 → 성공 시에만 카운트 기록**
- 한도 초과 시 `429` + UI에 업그레이드 안내
- 사용량 프로그레스바 (70% 황색 경고, 90% 적색 경보)

### 보안

- **AES-256-GCM** 앱 레벨 암호화 — 사용자 IP를 DB에 평문 저장하지 않음
- Polar Webhook **서명 검증** (`WebhookVerificationError` 처리)
- **Supabase RLS** — 본인 데이터만 접근. Webhook은 서비스 롤 클라이언트로 우회

---

## 4. 트러블슈팅 / 의사결정

### 4-1. Gemini 실패 시 사용량이 부당하게 차감되는 문제

**문제**
초기 구현은 "사용량 +1 → Gemini 호출"이었습니다. Gemini가 timeout / 429를 던지면 사용자는 응답을 못 받았는데도 한도가 1 줄어듭니다. 무료 플랜(10회) 사용자가 결제 직전에 이 경험을 하면 이탈로 직결됩니다.

**해결**
3단계로 분리:

```
1. checkUsage()   — 한도만 검증, DB 쓰기 없음
2. callGemini()   — 외부 API 호출
3. recordUsage()  — 응답 성공이 확정된 후에만 +1
```

**결과**
Gemini 측 실패가 사용자 한도에 영향을 주지 않게 됨. "잘못된 차감"으로 인한 CS·환불 리스크 제거.

### 4-2. Polar Webhook 위조 가능성

**문제**
Webhook 엔드포인트는 외부 접근이 가능합니다. 누가 `subscription.active` payload를 위조해서 보내면 DB가 그대로 업데이트돼 무료 사용자가 결제 없이 Unlimited 권한을 얻을 수 있습니다.

**해결**
Polar SDK의 `validateEvent(rawBody, headers, secret)`로 서명을 검증한 후에만 DB를 업데이트. 검증 실패 시 `403`을 반환하고 로깅. raw body를 그대로 받기 위해 Next.js에서 `bodyParser`를 끄고 `request.text()`로 읽습니다.

**결과**
Webhook을 통한 권한 위조 경로 차단. 결제 데이터 신뢰성 보장.

### 4-3. 스트리밍 응답 메시지의 ID 충돌

**문제**
스트리밍 중에는 DB에 메시지가 아직 저장되지 않은 상태이므로 진짜 ID가 없습니다. 클라이언트에서 임시 ID로 메시지를 렌더링하다가 스트림 종료 후 DB에 저장하면, 같은 메시지가 임시 ID·실제 ID 둘 다 가지게 돼 중복 렌더링이나 키 충돌이 발생합니다.

**해결**
임시 ID(`temp-{timestamp}`)로 시작 → 스트림 종료 후 DB 저장 → 응답으로 받은 실제 ID로 React 상태에서 교체. `messages` 배열의 동일 인덱스를 in-place 교체해 리렌더 비용 최소화.

**결과**
중복 메시지 없이 매끄러운 스트리밍 UX.

### 4-4. RLS와 서비스 롤 분리

**문제**
일반 사용자 요청은 RLS로 보호되어야 하지만, Webhook은 "사용자 컨텍스트"가 없는 시스템 호출이라 RLS에 막혀 DB를 갱신하지 못합니다.

**해결**
Supabase 클라이언트를 두 종류로 분리:

```
- anon client (RLS 적용)    : 사용자 요청용
- service role client       : Webhook·관리 작업 전용, 서버에서만 사용
```

서비스 롤 키는 환경변수로만 주입하고 클라이언트 번들에 포함되지 않도록 격리.

**결과**
사용자 데이터는 RLS로 보호, 시스템 작업은 RLS 우회. 보안과 운영 양립.

---

## 5. 프로젝트 구조

```
app/
├── page.tsx                    # 랜딩
├── login/page.tsx              # Google 로그인
├── pricing/page.tsx            # 요금제
├── payment/success/page.tsx    # 결제 완료
├── dashboard/
│   ├── page.tsx                # AI 채팅
│   └── billing/page.tsx        # 구독·청구 관리
├── api/
│   ├── chat/route.ts           # Gemini 스트리밍
│   ├── checkout/route.ts       # Polar 결제 세션 생성
│   ├── webhooks/polar/route.ts # Polar Webhook 수신 + 서명 검증
│   └── billing/
│       ├── portal/route.ts     # Polar Customer Portal
│       └── cancel/route.ts     # 구독 취소
├── auth/callback/route.ts      # OAuth 콜백
└── components/
    ├── hero-section.tsx
    ├── chat-input.tsx
    └── pricing-card.tsx

lib/
├── supabase/
│   ├── client.ts               # anon (RLS)
│   └── service.ts              # service role
├── usage.ts                    # check / call / record 분리
└── crypto.ts                   # AES-256-GCM
```

---

## 6. 실행 방법

### 환경 변수

`.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=

# Google Gemini
GOOGLE_API_KEY=

# Polar 결제
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_PRODUCT_ID_PRO=
POLAR_PRODUCT_ID_UNLIMITED=
POLAR_SERVER=sandbox       # 미설정 시 production 모드

# 암호화 키 (AES-256-GCM, 32바이트)
ENCRYPTION_KEY=
HASH_KEY=
```

### 설치·실행

```bash
npm install
npm run dev
```

`http://localhost:3000`

---

## 7. 회고

- **SaaS 흐름 전체를 직접 구현** — 가입 → 무료 → 한도 → 업그레이드 → 결제 → 기능 해제 → 취소 → 만료 → Free 복귀까지 한 바퀴를 책임지고 만들어보며 "기능 구현"과 "서비스 운영"의 차이를 체감했습니다.
- **Webhook 기반 결제 연동** — 클라이언트 신호가 아닌 서버 간 통신으로 결제 상태를 동기화하는 패턴, 서명 검증의 필요성, idempotency의 중요성을 직접 부딪히며 익혔습니다.
- **스트리밍 UX** — 전체 응답을 기다리지 않고 청크 단위로 점진적으로 UI를 채우는 방식이 사용자 체감 속도에 얼마나 큰 영향을 주는지 확인했습니다.
- **권한 모델 설계** — RLS와 서비스 롤을 적절히 분리하지 않으면 보안 또는 운영 중 하나가 깨진다는 것을 실제 경험으로 학습했습니다.
