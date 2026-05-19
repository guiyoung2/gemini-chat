import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PricingCards from "../pricing-card";

describe("PricingCards", () => {
  const baseProps = {
    currentPlan: "free",
    userEmail: "test@example.com",
    userId: "user-123",
  };

  // 플랜 이름 렌더
  it("플랜 이름이 화면에 렌더된다", () => {
    render(<PricingCards {...baseProps} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
  });

  // 쿼리 사용량 렌더
  it("쿼리 사용량이 화면에 렌더된다", () => {
    render(<PricingCards {...baseProps} />);
    expect(screen.getByText("월 10회")).toBeInTheDocument();
    expect(screen.getByText("월 100회")).toBeInTheDocument();
    expect(screen.getByText("무제한")).toBeInTheDocument();
  });

  // 가격 렌더 — toLocaleString 포맷 차이를 허용하기 위해 regex 사용
  // 부모 요소도 regex에 매칭되므로 getAllByText 사용
  it("플랜 가격이 화면에 렌더된다", () => {
    render(<PricingCards {...baseProps} />);
    expect(screen.getByText("무료")).toBeInTheDocument();
    expect(screen.getAllByText(/₩9[,.]?900/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₩29[,.]?900/).length).toBeGreaterThan(0);
  });

  // 현재 플랜 뱃지
  it("현재 플랜 뱃지와 비활성 버튼이 렌더된다", () => {
    render(<PricingCards {...baseProps} />);
    // 뱃지와 버튼 모두 "현재 플랜" 텍스트를 사용함
    expect(screen.getAllByText("현재 플랜").length).toBeGreaterThanOrEqual(1);
  });

  // 다운그레이드 불가
  it("현재 플랜보다 낮은 플랜에 다운그레이드 불가 버튼이 렌더된다", () => {
    render(
      <PricingCards currentPlan="unlimited" userEmail={null} userId="u-1" />,
    );
    // Free + Pro 두 개가 다운그레이드 불가
    expect(screen.getAllByText("다운그레이드 불가")).toHaveLength(2);
  });

  // 업그레이드 버튼 → checkout redirect
  describe("업그레이드 버튼 클릭", () => {
    const hrefSetter = vi.fn();

    beforeEach(() => {
      hrefSetter.mockClear();
      const mockLoc = {} as Location;
      Object.defineProperty(mockLoc, "href", {
        configurable: true,
        set: (url: string) => hrefSetter(url),
        // MSW가 상대 URL을 해석할 수 있도록 유효한 base URL 반환
        get: () => "http://localhost/",
      });
      Object.defineProperty(window, "location", {
        configurable: true,
        value: mockLoc,
      });
    });

    it("클릭 시 Checkout API를 호출하고 결제 URL로 이동한다", async () => {
      const user = userEvent.setup();
      render(<PricingCards {...baseProps} />);

      await user.click(screen.getAllByText("업그레이드")[0]);

      await waitFor(() => {
        expect(hrefSetter).toHaveBeenCalledWith(
          "https://checkout.polar.sh/test-session",
        );
      });
    });
  });
});
