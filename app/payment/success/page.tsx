import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

// 결제 완료 후 리다이렉트되는 성공 페이지
export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl" />
            <CheckCircle className="relative w-20 h-20 text-green-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">결제 완료!</h1>

        <p className="text-white/60 text-base leading-relaxed mb-10">
          구독이 성공적으로 활성화되었습니다.
          <br />
          지금 바로 프리미엄 기능을 이용해보세요.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors duration-200"
          >
            대시보드로 이동
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white/80 font-medium rounded-xl transition-colors duration-200"
          >
            플랜 확인
          </Link>
        </div>
      </div>
    </main>
  )
}
