import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payment System",
  description: "결제 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
