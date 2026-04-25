"use client";

import { motion } from "framer-motion";
import { Zap, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
          "w-full h-full rounded-full bg-gradient-radial",
          `bg-gradient-to-br ${color} to-transparent`,
        )}
      />
    </motion.div>
  );
}

const EASE_CURVE = [0.25, 0.4, 0.25, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: 0.2 + i * 0.15,
      ease: EASE_CURVE,
    },
  }),
};

export function HeroSection() {
  const router = useRouter();
  const { user } = useAuth();

  // 로그인 여부에 따라 대시보드 or 로그인 페이지로 이동
  function handleStart() {
    router.push(user ? "/dashboard" : "/login");
  }

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#080808]">
      {/* 배경 노이즈 그라디언트 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d14] via-[#080808] to-[#080808]" />

      {/* 배경 Orb */}
      <FloatingOrb
        size={600}
        color="from-blue-600/15"
        delay={0}
        className="top-[-10%] left-[-5%]"
      />
      <FloatingOrb
        size={500}
        color="from-violet-600/12"
        delay={0.3}
        className="bottom-[-15%] right-[-5%]"
      />
      <FloatingOrb
        size={300}
        color="from-cyan-500/10"
        delay={0.6}
        className="top-[30%] right-[20%]"
      />

      {/* 그리드 패턴 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* 뱃지 */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/50"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Powered by Google Gemini</span>
        </motion.div>

        {/* 헤드라인 */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
        >
          <span className="text-white">Gemini, </span>
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            바로 쓸 수 있게.
          </span>
        </motion.h1>

        {/* 서브 헤드라인 */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-12 mx-auto max-w-xl text-lg text-white/40 leading-relaxed"
        >
          복잡한 API 설정 없이 Gemini의 강력한 AI 기능을 한 줄의 코드로.
          <br />
          스트리밍, 멀티모달, 함수 호출까지 모두 지원합니다.
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
            className="group flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98]"
          >
            <Zap className="h-4 w-4" />
            무료로 시작하기
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:scale-[0.98]">
            문서 보기
          </button>
        </motion.div>

        {/* 코드 스니펫 미리보기 */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-16 mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-px"
        >
          <div className="rounded-2xl bg-[#0d0d0d] px-6 py-5 text-left">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            </div>
            <pre className="overflow-x-auto text-sm leading-relaxed">
              <code>
                <span className="text-white/30">{"// "}</span>
                <span className="text-white/30">
                  {"딱 세 줄로 Gemini 연동 완료"}
                </span>
                {"\n"}
                <span className="text-violet-400">{"import"}</span>
                <span className="text-white/70">{" { gemini } "}</span>
                <span className="text-violet-400">{"from"}</span>
                <span className="text-green-400">{' "@/gemini-wrapper"'}</span>
                {"\n\n"}
                <span className="text-blue-400">{"const"}</span>
                <span className="text-white/70">{" reply = "}</span>
                <span className="text-violet-400">{"await"}</span>
                <span className="text-white/70">{" gemini."}</span>
                <span className="text-yellow-400">{"chat"}</span>
                <span className="text-white/70">{"("}</span>
                <span className="text-green-400">{'"안녕하세요!"'}</span>
                <span className="text-white/70">{")"}</span>
                {"\n"}
                <span className="text-white/30">{"// → "}</span>
                <span className="text-white/50">
                  {"안녕하세요! 무엇을 도와드릴까요?"}
                </span>
              </code>
            </pre>
          </div>
        </motion.div>
      </div>

      {/* 하단 페이드 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none" />
    </section>
  );
}
