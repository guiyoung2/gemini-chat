import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: {
    default: "Gemini Chat",
    template: "%s | Gemini Chat",
  },
  description:
    "Google Gemini AI와 자유롭게 대화해보세요. 무료 플랜으로 시작하고, 더 많은 대화가 필요하다면 언제든지 업그레이드할 수 있습니다.",
  keywords: ["Gemini", "AI", "채팅", "Google AI", "인공지능", "SaaS"],
  authors: [{ name: "Gemini Chat" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    title: "Gemini Chat",
    description:
      "Google Gemini AI와 자유롭게 대화해보세요. 무료 플랜으로 시작하고, 더 많은 대화가 필요하다면 언제든지 업그레이드할 수 있습니다.",
    siteName: "Gemini Chat",
    images: [
      {
        url: "/gemini_thumbnail.png",
        width: 800,
        height: 400,
        alt: "Gemini Chat 미리보기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gemini Chat",
    description:
      "Google Gemini AI와 자유롭게 대화해보세요. 무료 플랜으로 시작하고, 더 많은 대화가 필요하다면 언제든지 업그레이드할 수 있습니다.",
    images: ["/gemini_thumbnail.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
