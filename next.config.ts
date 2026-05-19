import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// ANALYZE=true 환경변수 설정 시 번들 분석 리포트 생성
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withBundleAnalyzer(nextConfig);
