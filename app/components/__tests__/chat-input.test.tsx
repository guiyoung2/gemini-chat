import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatInput from "../chat-input";

describe("ChatInput", () => {
  // 빈 입력 상태
  it("빈 입력 상태에서 전송 버튼이 비활성화된다", () => {
    render(<ChatInput />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  // 텍스트 입력 후 활성화
  it("텍스트 입력 후 전송 버튼이 활성화된다", async () => {
    const user = userEvent.setup();
    render(<ChatInput />);
    await user.type(screen.getByLabelText("Message Input"), "hello");
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  // Enter 키로 전송
  it("Enter 키 전송 시 onSend가 입력값으로 호출된다", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);
    await user.type(screen.getByLabelText("Message Input"), "hello world");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello world");
  });

  // 전송 후 입력창 초기화
  it("전송 후 입력창이 비워진다", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={vi.fn()} />);
    const textarea = screen.getByLabelText("Message Input");
    await user.type(textarea, "test message");
    await user.keyboard("{Enter}");
    expect(textarea).toHaveValue("");
  });

  // 빈 입력으로는 전송하지 않음
  it("빈 입력으로 Enter 시 onSend가 호출되지 않는다", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  // disabled prop
  it("disabled prop이 있으면 전송 버튼이 비활성화된다", () => {
    render(<ChatInput disabled />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  // Shift+Enter는 줄바꿈
  it("Shift+Enter는 onSend를 호출하지 않는다", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);
    await user.type(screen.getByLabelText("Message Input"), "hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSend).not.toHaveBeenCalled();
  });
});
