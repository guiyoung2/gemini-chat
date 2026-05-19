import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroSection } from "../hero-section";

// useAuth가 AuthProvider 없이도 동작하도록 모킹
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

describe("HeroSection (smoke)", () => {
  // 메인 헤드라인 렌더
  it("메인 헤드라인이 렌더된다", () => {
    render(<HeroSection />);
    // h1 안의 "Gemini와" span을 직접 매칭
    expect(screen.getByText("Gemini와")).toBeInTheDocument();
  });

  // CTA 버튼 렌더
  it("Get Started CTA 버튼이 렌더된다", () => {
    render(<HeroSection />);
    expect(
      screen.getByRole("button", { name: "Get Started" }),
    ).toBeInTheDocument();
  });

  it("Pricing 버튼이 렌더된다", () => {
    render(<HeroSection />);
    expect(
      screen.getByRole("button", { name: "Pricing" }),
    ).toBeInTheDocument();
  });
});
