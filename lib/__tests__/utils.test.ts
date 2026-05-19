import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn (클래스 병합)", () => {
  it("여러 클래스를 공백으로 이어 붙인다", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("falsy 값은 무시된다", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("조건부 객체 문법을 지원한다", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("배열 형태도 처리한다", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("Tailwind padding 충돌 클래스는 마지막 값이 남는다 (px-2 px-4 → px-4)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("Tailwind margin 충돌 클래스도 마지막 값이 남는다 (m-2 m-8 → m-8)", () => {
    expect(cn("m-2", "m-8")).toBe("m-8");
  });

  it("충돌하지 않는 Tailwind 클래스는 모두 유지된다", () => {
    const result = cn("px-4", "py-2", "text-sm");
    expect(result).toBe("px-4 py-2 text-sm");
  });

  it("빈 문자열을 전달하면 빈 문자열을 반환한다", () => {
    expect(cn()).toBe("");
    expect(cn("", "")).toBe("");
  });
});
