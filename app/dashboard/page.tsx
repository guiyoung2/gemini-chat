'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback, memo, useMemo } from 'react'
import {
  Plus,
  Search,
  MessageSquare,
  Bot,
  ChevronDown,
  LogOut,
  Coins,
  Trash2,
  SquarePen,
} from 'lucide-react'
import ChatInput from '@/app/components/chat-input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ===== TYPES =====

interface Conversation {
  id: string
  title: string
  preview: string
  group: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface CreditInfo {
  used: number
  total: number
}

// DB row 타입
interface ConversationRow {
  id: string
  user_id: string
  title: string
  created_at: string
}

interface MessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface PreviewRow {
  conversation_id: string
  content: string
}

// ===== 유틸 =====

// 현재 시각을 한국어 형식으로 반환
function getNow(): string {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ISO 날짜 → 시간 표시
function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// created_at → 사이드바 그룹 레이블
function getGroup(isoStr: string): string {
  const now = new Date()
  const date = new Date(isoStr)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays <= 7) return '이번 주'
  return '지난 주'
}

// **bold** 마크다운을 <strong> 태그로 파싱
function parseBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

// ===== SUB COMPONENTS =====

// 개별 대화 항목
const ConversationItem = memo(({
  conv,
  isActive,
  onSelect,
  onDelete,
}: {
  conv: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) => (
  <li>
    <button
      onClick={onSelect}
      className={cn(
        'group w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-left transition-all relative pr-10',
        isActive
          ? 'bg-[#1A2535] border-l-2 border-indigo-500 pl-2.5'
          : 'hover:bg-white/4 border-l-2 border-transparent'
      )}
    >
      <MessageSquare className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', isActive ? 'text-white/90' : 'text-white/60')}>{conv.title}</p>
        <p className="text-xs text-white/30 truncate mt-0.5">{conv.preview}</p>
      </div>
      {/* 호버 시 삭제 버튼 표시 */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
        </span>
      </div>
    </button>
  </li>
))

ConversationItem.displayName = 'ConversationItem'

// 채팅 메시지 버블
const MessageBubble = memo(({ message }: { message: Message }) => {
  const isUser = message.role === 'user'
  const lines = message.content.split('\n')

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* 어시스턴트 아바타 */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
        </div>
      )}

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start', 'max-w-[75%]')}>
        <div
          className={cn(
            'px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
              : 'bg-[#1A2535] text-white/80 rounded-2xl rounded-bl-md border border-white/6'
          )}
        >
          {lines.map((line, i) => (
            <span key={i}>
              {parseBold(line)}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-white/25 px-1">{message.timestamp}</span>
      </div>
    </div>
  )
})

MessageBubble.displayName = 'MessageBubble'

// 타이핑 인디케이터
const TypingIndicator = memo(() => (
  <div className="flex gap-3">
    <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
      <Bot className="w-3.5 h-3.5 text-indigo-400" />
    </div>
    <div className="bg-[#1A2535] border border-white/6 px-4 py-3 rounded-2xl rounded-bl-md">
      <div className="flex gap-1 items-center h-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  </div>
))

TypingIndicator.displayName = 'TypingIndicator'

// ===== MAIN PAGE =====

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [credits] = useState<CreditInfo>({ used: 0, total: 10000 })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // 미로그인 시 리다이렉트
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // 메시지 추가 시 하단 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // 유저 메뉴 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 특정 대화의 메시지 불러오기
  const loadMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true)
    setMessages([])

    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    setIsLoadingMessages(false)
    if (error || !msgs) return

    setMessages(
      (msgs as MessageRow[]).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: formatTime(m.created_at),
      }))
    )
  }, [supabase])

  // 초기 로드: 대화 목록 + 각 대화의 마지막 AI 응답 fetch
  useEffect(() => {
    if (loading || !user) return
    const userId = user.id

    void (async () => {
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error || !convs || convs.length === 0) {
        setConversations([])
        return
      }

      const convIds = (convs as ConversationRow[]).map((c) => c.id)

      const { data: lastMsgs } = await supabase
        .from('messages')
        .select('conversation_id, content')
        .in('conversation_id', convIds)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(300)

      const previewMap: Record<string, string> = {}
      ;(lastMsgs as PreviewRow[] | null)?.forEach((msg) => {
        if (!previewMap[msg.conversation_id]) {
          previewMap[msg.conversation_id] = msg.content.replace(/\*\*/g, '').slice(0, 45)
        }
      })

      setConversations(
        (convs as ConversationRow[]).map((c) => ({
          id: c.id,
          title: c.title,
          preview: previewMap[c.id] ?? '',
          group: getGroup(c.created_at),
        }))
      )
    })()
  }, [user, loading, supabase])

  // Gemini API 스트리밍 + Supabase 저장
  const handleSend = useCallback(async (text: string) => {
    if (!user) return

    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    // 대화가 없으면 DB에 새 대화 생성
    let convId = activeConvId
    if (!convId) {
      const title = text.length > 28 ? text.slice(0, 28) + '...' : text
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single()

      if (error || !newConv) {
        console.error('대화 생성 실패:', error)
        return
      }

      convId = (newConv as ConversationRow).id
      setActiveConvId(convId)
      setConversations((prev) => [
        { id: convId, title, preview: '...', group: '오늘' },
        ...prev,
      ])
    }

    // 유저 메시지 DB 저장
    const { data: savedUserMsg } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, role: 'user', content: text })
      .select()
      .single()

    const userMsg: Message = {
      id: (savedUserMsg as MessageRow | null)?.id ?? `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: getNow(),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      if (!response.ok) throw new Error('API 요청 실패')

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      const streamingId = `streaming-${Date.now()}`
      let isFirstChunk = true
      let fullResponse = ''
      const botTimestamp = getNow()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue

        fullResponse += chunk

        if (isFirstChunk) {
          isFirstChunk = false
          setIsTyping(false)
          setMessages((prev) => [
            ...prev,
            { id: streamingId, role: 'assistant', content: chunk, timestamp: botTimestamp },
          ])
        } else {
          setMessages((prev) =>
            prev.map((msg) => msg.id === streamingId ? { ...msg, content: msg.content + chunk } : msg)
          )
        }
      }

      // 스트리밍 완료 후 AI 응답 DB 저장
      const { data: savedBotMsg } = await supabase
        .from('messages')
        .insert({ conversation_id: convId, role: 'assistant', content: fullResponse })
        .select()
        .single()

      // streaming 임시 id → 실제 DB id로 교체
      if (savedBotMsg) {
        setMessages((prev) =>
          prev.map((msg) => msg.id === streamingId ? { ...msg, id: (savedBotMsg as MessageRow).id } : msg)
        )
      }

      // 사이드바 preview를 AI 응답으로 업데이트
      const aiPreview = fullResponse.replace(/\*\*/g, '').slice(0, 45) + (fullResponse.length > 45 ? '...' : '')
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, preview: aiPreview } : c)
      )
    } catch (error) {
      console.error('채팅 오류:', error)
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '오류가 발생했습니다. 다시 시도해주세요.',
          timestamp: getNow(),
        },
      ])
    }
  }, [messages, activeConvId, user, supabase])

  // 새 대화 — DB 삽입 없이 상태만 초기화 (첫 메시지 전송 시 생성)
  const handleNewConversation = useCallback(() => {
    setActiveConvId('')
    setMessages([])
  }, [])

  // 대화 선택 → DB에서 메시지 로드
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConvId(id)
    loadMessages(id)
  }, [loadMessages])

  // 대화 삭제 (cascade로 messages도 자동 삭제)
  const handleDeleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase.from('conversations').delete().eq('id', id)
    if (error) {
      console.error('대화 삭제 실패:', error)
      return
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (id === activeConvId) {
      setActiveConvId('')
      setMessages([])
    }
  }, [activeConvId, supabase])

  // 검색 필터링된 대화 목록
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 그룹별 대화 목록 분류
  const groupedConversations = filteredConversations.reduce<Record<string, Conversation[]>>((acc, conv) => {
    if (!acc[conv.group]) acc[conv.group] = []
    acc[conv.group].push(conv)
    return acc
  }, {})

  const GROUP_ORDER = ['오늘', '어제', '이번 주', '지난 주']

  // 크레딧 퍼센트 및 색상
  const creditPct = Math.round((credits.used / credits.total) * 100)
  const creditColor = creditPct < 50 ? 'bg-indigo-500' : creditPct < 80 ? 'bg-yellow-500' : 'bg-red-500'

  // 사용자 이름/이니셜 추출
  const userName = user?.user_metadata?.full_name as string | undefined
  const userInitial = (userName ?? user?.email ?? 'U').charAt(0).toUpperCase()
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

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

  return (
    <div className="flex flex-col h-screen bg-[#0A1217] text-white overflow-hidden">

      {/* ===== TOP BAR ===== */}
      <header className="flex items-center justify-end h-14 px-5 bg-[#0F1923] border-b border-white/6 shrink-0 z-10">

        {/* 우측: 크레딧 + 사용자 */}
        <div className="flex items-center gap-5">

          {/* 크레딧 */}
          <div className="flex items-center gap-2.5">
            <Coins className="w-3.5 h-3.5 text-white/30" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">
                  {credits.used.toLocaleString()} / {credits.total.toLocaleString()}
                </span>
                <span className="text-[10px] text-white/25">크레딧</span>
              </div>
              <div className="w-24 h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', creditColor)}
                  style={{ width: `${creditPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div className="w-px h-6 bg-white/8" />

          {/* 사용자 메뉴 */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/4 transition-colors"
            >
              {/* 아바타 */}
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={userName ?? 'User'} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {userInitial}
                </div>
              )}
              <div className="hidden sm:flex flex-col items-start">
                {userName && <span className="text-xs font-medium text-white/80 leading-none">{userName}</span>}
                <span className="text-[11px] text-white/40 leading-none mt-0.5">{user.email}</span>
              </div>
              <ChevronDown className={cn('w-3.5 h-3.5 text-white/30 transition-transform', isUserMenuOpen && 'rotate-180')} />
            </button>

            {/* 드롭다운 */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#1A2535] border border-white/8 rounded-xl shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => { setIsUserMenuOpen(false); signOut() }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/6 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ===== SIDEBAR ===== */}
        <aside className="w-60 shrink-0 bg-[#0F1923] border-r border-white/6 flex flex-col overflow-hidden">

          {/* 새 대화 버튼 */}
          <div className="p-3 shrink-0">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 대화
            </button>
          </div>

          {/* 검색창 */}
          <div className="px-3 pb-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4 border border-white/6">
              <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="대화 검색..."
                className="bg-transparent text-sm text-white/70 placeholder:text-white/25 outline-none w-full"
              />
            </div>
          </div>

          {/* 대화 목록 */}
          <nav className="flex-1 overflow-y-auto px-2 pb-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {GROUP_ORDER.filter((g) => groupedConversations[g]?.length).map((group) => (
              <div key={group} className="mb-4">
                <p className="px-3 mb-1 text-[10px] font-medium text-white/25 uppercase tracking-wider">{group}</p>
                <ul className="space-y-0.5">
                  {groupedConversations[group].map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conv={conv}
                      isActive={conv.id === activeConvId}
                      onSelect={() => handleSelectConversation(conv.id)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {filteredConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-white/20">
                <Search className="w-8 h-8 mb-2" />
                <p className="text-xs">검색 결과가 없습니다</p>
              </div>
            )}
          </nav>
        </aside>

        {/* ===== CHAT AREA ===== */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/8 [&::-webkit-scrollbar-thumb]:rounded-full">
            {isLoadingMessages ? (
              /* 메시지 로딩 중 */
              <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-white/30">
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <span className="text-sm">불러오는 중...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              /* 빈 대화 상태 */
              <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20">
                <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center">
                  <Bot className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white/30">새로운 대화를 시작하세요</p>
                  <p className="text-xs text-white/20 mt-1">무엇이든 물어보세요</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* 입력창 */}
          <div className="shrink-0 px-6 pb-6 pt-2">
            <ChatInput
              onSend={handleSend}
              placeholder="메시지를 입력하세요..."
              showEffects={true}
              glowIntensity={0.5}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
