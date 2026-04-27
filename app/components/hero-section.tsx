"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// 배경 원형 글로우 효과
function FloatingOrb({
  className,
  delay = 0,
  size = 300,
  color = "from-blue-500/20",
}: {
  className?: string;
  delay?: number;
  size?: number;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 2, delay, ease: "easeOut" }}
      className={cn("absolute rounded-full blur-3xl", className)}
      style={{ width: size, height: size }}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay }}
        className={cn(
          "w-full h-full rounded-full",
          `bg-gradient-to-br ${color} to-transparent`,
        )}
      />
    </motion.div>
  );
}

const EASE_CURVE = [0.25, 0.4, 0.25, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: 0.15 + i * 0.12,
      ease: EASE_CURVE,
    },
  }),
};

// 메인 히어로 섹션
export function HeroSection() {
  const router = useRouter();
  const { user } = useAuth();

  // 로그인 여부에 따라 대시보드 or 로그인 페이지로 이동
  function handleStart() {
    router.push(user ? "/dashboard" : "/login");
  }

  function handlePricing() {
    router.push("/pricing");
  }

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#080808]">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#080808] to-[#080808]" />

      {/* 배경 Orb */}
      <FloatingOrb
        size={700}
        color="from-blue-600/12"
        delay={0}
        className="top-[-15%] left-[-10%]"
      />
      <FloatingOrb
        size={600}
        color="from-violet-600/10"
        delay={0.4}
        className="bottom-[-20%] right-[-10%]"
      />
      <FloatingOrb
        size={350}
        color="from-cyan-500/8"
        delay={0.7}
        className="top-[25%] right-[15%]"
      />

      {/* 그리드 패턴 */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        {/* 상단 뱃지 */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5"
        >
          <Sparkles className="h-3 w-3 text-blue-400" />
          <span className="text-xs tracking-widest text-white/40 uppercase">
            Powered by Google Gemini
          </span>
        </motion.div>

        {/* 헤드라인 */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 text-3xl font-bold tracking-tight leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
        >
          <span className="text-white">Gemini와</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            대화를 시작하세요.
          </span>
        </motion.h1>

        {/* 서브 헤드라인 */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-12 mx-auto max-w-lg text-lg text-white/40 leading-relaxed"
        >
          Google Gemini AI를 더 쉽고 강력하게.
          <br />
          구독 플랜을 선택하고 지금 바로 시작하세요.
        </motion.p>

        {/* CTA 버튼 */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={handleStart}
            className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            Get Started
          </button>

          <button
            onClick={handlePricing}
            className="rounded-full border border-white/20 bg-transparent px-8 py-3.5 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white active:scale-[0.98]"
          >
            Pricing
          </button>
        </motion.div>
      </div>

      {/* 하단 페이드 */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none" />
    </section>
  );
}
