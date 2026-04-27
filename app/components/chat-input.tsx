'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, memo, useMemo } from 'react'
import { Plus } from 'lucide-react'

// ===== TYPES =====

type MenuOption = 'Auto' | 'Max' | 'Search' | 'Plan'

interface RippleEffect {
  x: number
  y: number
  id: number
}

interface Position {
  x: number
  y: number
}

interface ChatInputProps {
  placeholder?: string
  onSend?: (value: string) => void
  disabled?: boolean
  glowIntensity?: number
  expandOnFocus?: boolean
  animationDuration?: number
  textColor?: string
  backgroundOpacity?: number
  showEffects?: boolean
  menuOptions?: MenuOption[]
}

interface InputAreaProps {
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  placeholder: string
  handleKeyDown: (e: React.KeyboardEvent) => void
  disabled: boolean
  isSubmitDisabled: boolean
  textColor: string
}

interface GlowEffectsProps {
  glowIntensity: number
  mousePosition: Position
  animationDuration: number
  enabled: boolean
}

interface RippleEffectsProps {
  ripples: RippleEffect[]
  enabled: boolean
}

interface MenuButtonProps {
  toggleMenu: () => void
  menuRef: React.RefObject<HTMLDivElement | null>
  isMenuOpen: boolean
  onSelectOption: (option: MenuOption) => void
  textColor: string
  menuOptions: MenuOption[]
}

interface SelectedOptionsProps {
  options: MenuOption[]
  onRemove: (option: MenuOption) => void
  textColor: string
}

interface SendButtonProps {
  isDisabled: boolean
}

interface OptionsMenuProps {
  isOpen: boolean
  onSelect: (option: MenuOption) => void
  textColor: string
  menuOptions: MenuOption[]
}

interface OptionTagProps {
  option: MenuOption
  onRemove: (option: MenuOption) => void
  textColor: string
}

// ===== CONTEXT =====

interface ChatInputContextProps {
  mousePosition: Position
  ripples: RippleEffect[]
  addRipple: (x: number, y: number) => void
  animationDuration: number
  glowIntensity: number
  textColor: string
  showEffects: boolean
}

const ChatInputContext = createContext<ChatInputContextProps | undefined>(undefined)

function useChatInputContext() {
  const context = useContext(ChatInputContext)
  if (context === undefined) {
    throw new Error('useChatInputContext must be used within a ChatInputProvider')
  }
  return context
}

// ===== COMPONENTS =====

// 전송 버튼
const SendButton = memo(({ isDisabled }: SendButtonProps) => (
  <button
    type="submit"
    aria-label="Send message"
    disabled={isDisabled}
    className={`ml-auto self-center h-8 w-8 flex items-center justify-center rounded-full border-0 p-0 transition-all z-20 ${
      isDisabled
        ? 'opacity-30 cursor-not-allowed bg-white/10 text-white/30'
        : 'opacity-90 bg-indigo-600 text-white hover:opacity-100 hover:bg-indigo-500 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20'
    }`}
  >
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block ${isDisabled ? 'opacity-50' : 'opacity-100'}`}
    >
      <path
        d="M16 22L16 10M16 10L11 15M16 10L21 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
))

SendButton.displayName = 'SendButton'

// 옵션 드롭다운 메뉴
const OptionsMenu = memo(({ isOpen, onSelect, menuOptions }: OptionsMenuProps) => {
  if (!isOpen) return null

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-[#1C1C1C] border border-white/8 rounded-xl shadow-xl overflow-hidden z-30 min-w-[120px]">
      <ul className="py-1">
        {menuOptions.map((option) => (
          <li
            key={option}
            className="px-4 py-2 hover:bg-white/6 cursor-pointer text-white/70 hover:text-white text-sm font-medium transition-colors"
            onClick={() => onSelect(option)}
            style={{ fontFamily: '"Inter", sans-serif' }}
          >
            {option}
          </li>
        ))}
      </ul>
    </div>
  )
})

OptionsMenu.displayName = 'OptionsMenu'

// 선택된 옵션 태그
const OptionTag = memo(({ option, onRemove }: OptionTagProps) => (
  <div
    className="flex items-center gap-1 bg-indigo-500/20 px-2 py-1 rounded-md text-xs text-indigo-300 border border-indigo-500/20"
    style={{ fontFamily: '"Inter", sans-serif' }}
  >
    <span>{option}</span>
    <button
      type="button"
      onClick={() => onRemove(option)}
      className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  </div>
))

OptionTag.displayName = 'OptionTag'

// 글로우 시각 효과
const GlowEffects = memo(({ glowIntensity, mousePosition, animationDuration, enabled }: GlowEffectsProps) => {
  if (!enabled) return null

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/4 to-white/[0.02] backdrop-blur-2xl rounded-3xl" />

      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none"
        style={{
          transition: `opacity ${animationDuration}ms`,
          boxShadow: `
            0 0 0 1px rgba(99, 102, 241, ${0.15 * glowIntensity}),
            0 0 8px rgba(99, 102, 241, ${0.25 * glowIntensity}),
            0 0 16px rgba(139, 92, 246, ${0.15 * glowIntensity}),
            0 0 24px rgba(59, 130, 246, ${0.1 * glowIntensity})
          `,
        }}
      />

      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          transition: `opacity ${animationDuration}ms`,
          boxShadow: `
            0 0 12px rgba(99, 102, 241, ${0.3 * glowIntensity}),
            0 0 20px rgba(139, 92, 246, ${0.2 * glowIntensity}),
            0 0 32px rgba(59, 130, 246, ${0.15 * glowIntensity})
          `,
        }}
      />

      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none blur-sm"
        style={{
          background: `radial-gradient(circle 120px at ${mousePosition.x}% ${mousePosition.y}%, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 30%, rgba(59,130,246,0.04) 60%, transparent 100%)`,
        }}
      />
    </>
  )
})

GlowEffects.displayName = 'GlowEffects'

// 리플 클릭 효과
const RippleEffects = memo(({ ripples, enabled }: RippleEffectsProps) => {
  if (!enabled || ripples.length === 0) return null

  return (
    <>
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute pointer-events-none blur-sm"
          style={{ left: ripple.x - 25, top: ripple.y - 25, width: 50, height: 50 }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-r from-indigo-400/15 via-violet-400/10 to-blue-400/15 animate-ping" />
        </div>
      ))}
    </>
  )
})

RippleEffects.displayName = 'RippleEffects'

// 텍스트 입력 영역
const InputArea = memo(({ value, setValue, placeholder, handleKeyDown, disabled, isSubmitDisabled, textColor }: InputAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // 텍스트에어리어 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const lineHeight = 22
      const maxHeight = lineHeight * 4 + 16
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    }
  }, [value])

  return (
    <div className="flex-1 relative h-full flex items-center">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Message Input"
        rows={1}
        className="w-full min-h-8 max-h-24 bg-transparent text-sm font-normal text-left self-center placeholder-white/25 border-0 outline-none px-3 pr-10 py-1 z-20 relative resize-none overflow-y-auto"
        style={{
          fontFamily: '"Inter", sans-serif',
          letterSpacing: '-0.14px',
          lineHeight: '22px',
          color: textColor,
        }}
        disabled={disabled}
      />
      <SendButton isDisabled={isSubmitDisabled} />
    </div>
  )
})

InputArea.displayName = 'InputArea'

// + 메뉴 버튼
const MenuButton = memo(({ toggleMenu, menuRef, isMenuOpen, onSelectOption, menuOptions }: MenuButtonProps) => (
  <div className="relative" ref={menuRef}>
    <button
      type="button"
      onClick={toggleMenu}
      aria-label="Menu options"
      className="h-8 w-8 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/[0.10] text-white/50 hover:text-white/80 transition-all ml-1 mr-1"
    >
      <Plus size={16} />
    </button>
    <OptionsMenu
      isOpen={isMenuOpen}
      onSelect={onSelectOption}
      textColor=""
      menuOptions={menuOptions}
    />
  </div>
))

MenuButton.displayName = 'MenuButton'

// 선택된 옵션 목록
const SelectedOptions = memo(({ options, onRemove, textColor }: SelectedOptionsProps) => {
  if (options.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-2 pl-3 pr-3 z-20 relative">
      {options.map((option) => (
        <OptionTag key={option} option={option} onRemove={onRemove} textColor={textColor} />
      ))}
    </div>
  )
})

SelectedOptions.displayName = 'SelectedOptions'

// 채팅 입력 메인 컴포넌트
export default function ChatInput({
  placeholder = 'Ask anything...',
  onSend,
  disabled = false,
  glowIntensity = 0.5,
  expandOnFocus = true,
  animationDuration = 500,
  textColor = '#E5E7EB',
  backgroundOpacity = 0.06,
  showEffects = true,
  menuOptions = ['Auto', 'Max', 'Search', 'Plan'] as MenuOption[],
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<MenuOption[]>([])
  const [ripples, setRipples] = useState<RippleEffect[]>([])
  const [mousePosition, setMousePosition] = useState<Position>({ x: 50, y: 50 })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const throttleRef = useRef<number | null>(null)

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 폼 제출 처리
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSend?.(value.trim())
        setValue('')
      }
    },
    [value, onSend, disabled]
  )

  // Enter 키 제출 (Shift+Enter는 줄바꿈)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e as unknown as React.FormEvent)
      }
    },
    [handleSubmit]
  )

  // 마우스 위치 추적 (글로우 효과용, 50ms throttle)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!showEffects) return
      if (containerRef.current && !throttleRef.current) {
        throttleRef.current = window.setTimeout(() => {
          const rect = containerRef.current?.getBoundingClientRect()
          if (rect) {
            const x = ((e.clientX - rect.left) / rect.width) * 100
            const y = ((e.clientY - rect.top) / rect.height) * 100
            setMousePosition({ x, y })
          }
          throttleRef.current = null
        }, 50)
      }
    },
    [showEffects]
  )

  // 리플 효과 추가
  const addRipple = useCallback(
    (x: number, y: number) => {
      if (!showEffects) return
      if (ripples.length < 5) {
        const newRipple: RippleEffect = { x, y, id: Date.now() }
        setRipples((prev) => [...prev, newRipple])
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
        }, 600)
      }
    },
    [ripples, showEffects]
  )

  // 클릭 시 리플 위치 계산
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        addRipple(e.clientX - rect.left, e.clientY - rect.top)
      }
    },
    [addRipple]
  )

  const toggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), [])

  const selectOption = useCallback((option: MenuOption) => {
    setSelectedOptions((prev) => (prev.includes(option) ? prev : [...prev, option]))
    setIsMenuOpen(false)
  }, [])

  const removeOption = useCallback((option: MenuOption) => {
    setSelectedOptions((prev) => prev.filter((opt) => opt !== option))
  }, [])

  const contextValue = useMemo(
    () => ({ mousePosition, ripples, addRipple, animationDuration, glowIntensity, textColor, showEffects }),
    [mousePosition, ripples, addRipple, animationDuration, glowIntensity, textColor, showEffects]
  )

  const isSubmitDisabled = disabled || !value.trim()
  const hasModeSelected = selectedOptions.length > 0
  const shouldExpandOnFocus = expandOnFocus && !hasModeSelected
  const baseWidthClass = hasModeSelected ? 'w-full' : 'w-full'
  const focusWidthClass = shouldExpandOnFocus ? '' : ''
  const bgOpacityValue = Math.round(backgroundOpacity * 100)

  return (
    <ChatInputContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        className={`w-full z-10 mx-auto min-h-12 ${baseWidthClass} ${focusWidthClass}`}
        style={{ transition: `width ${animationDuration}ms ease-out` }}
      >
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className={`relative flex flex-col w-full min-h-full backdrop-blur-xl shadow-lg rounded-2xl p-2 overflow-visible group transition-all`}
          style={{
            background: `rgba(20, 20, 20, ${bgOpacityValue / 100 + 0.7})`,
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
            transition: `all ${animationDuration}ms ease, box-shadow ${animationDuration}ms ease`,
          }}
        >
          <GlowEffects
            glowIntensity={glowIntensity}
            mousePosition={mousePosition}
            animationDuration={animationDuration}
            enabled={showEffects}
          />

          <RippleEffects ripples={ripples} enabled={showEffects} />

          <div className="flex items-center relative z-20">
            <MenuButton
              toggleMenu={toggleMenu}
              menuRef={menuRef}
              isMenuOpen={isMenuOpen}
              onSelectOption={selectOption}
              textColor={textColor}
              menuOptions={menuOptions}
            />

            <InputArea
              value={value}
              setValue={setValue}
              placeholder={placeholder}
              handleKeyDown={handleKeyDown}
              disabled={disabled}
              isSubmitDisabled={isSubmitDisabled}
              textColor={textColor}
            />
          </div>

          <SelectedOptions options={selectedOptions} onRemove={removeOption} textColor={textColor} />
        </div>
      </form>
    </ChatInputContext.Provider>
  )
}
