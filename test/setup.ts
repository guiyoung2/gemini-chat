import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { server } from "./mocks/server";

// MSW 서버 라이프사이클 연결
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// next/navigation mock — useRouter, usePathname 등을 쓰는 컴포넌트 테스트용
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
