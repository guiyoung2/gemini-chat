# GeminiChat — AI 채팅 + 구독 결제 SaaS

Google Gemini API 기반의 AI 채팅 서비스입니다.  
Google OAuth 로그인, 실시간 스트리밍 응답, 플랜별 사용량 관리, Polar 구독 결제까지 **SaaS의 핵심 기능을 처음부터 끝까지 직접 구현**한 토이 프로젝트입니다.

<br/>

## 데모

> Vercel로 배포된 라이브 환경에서 확인하실 수 있습니다.

| 화면        | 설명                                 |
| ----------- | ------------------------------------ |
| 랜딩 페이지 | Framer Motion 애니메이션 히어로 섹션 |
| 대시보드    | 사이드바 + 스트리밍 AI 채팅          |
| 요금제      | Free / Pro / Unlimited 3단계 플랜    |
| Billing     | 사용량 프로그레스바 + 구독 취소      |

<br/>

## 기술 스택

### Frontend

| 기술                        | 사용 이유                                |
| --------------------------- | ---------------------------------------- |
| **Next.js 15** (App Router) | 서버 컴포넌트 + API Routes로 풀스택 구현 |
| **TypeScript**              | 타입 안정성으로 런타임 에러 사전 방지    |
| **Tailwind CSS 4**          | 빠른 스타일링, 다크 테마 일관성 유지     |
| **Framer Motion**           | 히어로 섹션 입장 애니메이션              |
| **Lucide React**            | 일관된 아이콘 시스템                     |

### Backend & Infra

| 기술                  | 사용 이유                                          |
| --------------------- | -------------------------------------------------- |
| **Supabase**          | PostgreSQL DB + Auth + RLS로 인증·데이터 통합 관리 |
| **Google Gemini API** | 실시간 스트리밍 AI 응답                            |
| **Polar**             | 구독 결제 및 Webhook 처리                          |
| **Vercel**            | CI/CD 없이 git push로 즉시 배포                    |

<br/>

## 주요 기능

### 인증

- **Google OAuth** — Supabase Auth 연동, `auth/callback` 라우트로 세션 처리
- 미로그인 접근 시 로그인 페이지로 자동 리다이렉트

### AI 채팅

- **실시간 스트리밍** — `ReadableStream`으로 Gemini 응답을 청크 단위로 UI에 반영
- **대화 히스토리** — Supabase `conversations` / `messages` 테이블에 영구 저장
- **Gemini 히스토리 컨텍스트** — 이전 대화를 `history`로 넘겨 문맥 유지
- 대화 검색, 삭제, 날짜별 그룹핑 (오늘 / 어제 / 이번 주 / 지난 주)

### 구독 & 결제

| 플랜      | 월 사용량 | 가격    |
| --------- | --------- | ------- |
| Free      | 10회      | 무료    |
| Pro       | 100회     | ₩9,900  |
| Unlimited | 무제한    | ₩29,900 |

- **Polar Checkout** — 결제 페이지 리다이렉트 방식
- **Webhook 처리** — `subscription.active` 이벤트로 DB 구독 상태 자동 갱신
- **Polar Customer Portal** — 결제 수단 변경 / 청구서 확인
- **구독 취소** — 취소 확인 UI + 기간 만료 후 Free 자동 전환

### 사용량 제어

- API 요청 시 **플랜 한도 선체크 → Gemini 성공 후 카운트 기록** (실패 시 미차감)
- 한도 초과 시 `429` 응답, UI에 플랜 업그레이드 안내 메시지 표시
- 사용량 프로그레스바 (70% 황색 경고, 90% 적색 경보)

### 보안

- **AES-256-GCM 앱 레벨 암호화** — 사용자 IP 주소를 암호화해 DB 저장
- Polar Webhook **서명 검증** (`WebhookVerificationError` 처리)
- Supabase **RLS** — 본인 데이터만 접근 가능

<br/>

## 프로젝트 구조

```
app/
├── page.tsx                    # 랜딩 페이지
├── login/page.tsx              # Google 로그인
├── pricing/page.tsx            # 요금제 페이지
├── payment/success/page.tsx    # 결제 완료 페이지
├── dashboard/
│   ├── page.tsx                # AI 채팅 대시보드
│   └── billing/page.tsx        # 구독 & 청구 관리
├── api/
│   ├── chat/route.ts           # Gemini 스트리밍 API
│   ├── checkout/route.ts       # Polar 결제 세션 생성
│   ├── webhooks/polar/route.ts # Polar Webhook 수신
│   └── billing/
│       ├── portal/route.ts     # Polar Customer Portal URL
│       └── cancel/route.ts     # 구독 취소
├── auth/callback/route.ts      # OAuth 콜백 처리
└── components/
    ├── hero-section.tsx        # 랜딩 히어로 섹션
    ├── chat-input.tsx          # 채팅 입력 컴포넌트
    └── pricing-card.tsx        # 요금제 카드
```

<br/>

## 시작하기

### 환경변수 설정

`.env.local` 파일을 생성하고 아래 값을 채웁니다.

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
POLAR_SERVER='sandbox' // 환경변수값을 안 넣을시 product 상태태

# 암호화 키 (AES-256-GCM)
ENCRYPTION_KEY=
HASH_KEY=
```

### 설치 및 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인합니다.

<br/>

## 구현 포인트

### Gemini 스트리밍 처리

서버에서 `ReadableStream`을 생성해 청크를 순서대로 보내고, 클라이언트에서 `getReader()`로 받아 메시지 상태를 점진적으로 업데이트합니다. 스트리밍 ID를 임시 키로 관리하다 DB 저장 완료 후 실제 ID로 교체합니다.

### 사용량 카운팅 순서

`checkUsage()` → 한도 체크 → Gemini 호출 → **성공 시에만 `record()` 호출** 순서로 처리합니다. Gemini 실패 시 카운트가 올라가지 않아 사용자가 억울하게 차감되지 않습니다.

### Webhook 보안

Polar SDK의 `validateEvent()`로 서명을 검증한 후 DB를 업데이트합니다. 검증 실패 시 `403`을 반환해 위조 요청을 차단합니다.

<br/>

## 개발 회고

이 프로젝트를 통해 배운 것들:

- **SaaS에 대한 이해** — 직접 프로젝트를 만들어보며 "가입 → 무료 플랜 시작 → 한도 도달 → 업그레이드 유도 → 결제 → 기능 해제"로 이어지는 SaaS 비즈니스 흐름 전체를 구현해봤습니다.
- **Webhook 기반 결제 연동** — 결제 완료 신호를 클라이언트가 아닌 서버 간 통신으로 신뢰성 있게 처리하는 패턴을 직접 구현했습니다.
- **스트리밍 UI 패턴** — 서버 → 클라이언트로 데이터를 점진적으로 흘려보내 UX를 개선하는 방식을 경험했습니다.
- **RLS + 서비스 롤 분리** — 일반 사용자는 RLS로 보호하고, Webhook처럼 시스템 레벨 작업은 서비스 롤 클라이언트로 우회하는 Supabase 권한 설계를 이해했습니다.
