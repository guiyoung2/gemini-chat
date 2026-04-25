'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  // 미로그인 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">로딩 중...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            {/* 로그아웃 버튼 */}
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              로그아웃
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">이메일</span>
              <p className="font-medium text-gray-900 mt-1">{user.email}</p>
            </div>
            {user.user_metadata?.full_name && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">이름</span>
                <p className="font-medium text-gray-900 mt-1">
                  {user.user_metadata.full_name as string}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
