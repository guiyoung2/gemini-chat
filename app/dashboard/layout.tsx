// 인증 필요 페이지 — 빌드 시 정적 사전렌더링 방지
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
