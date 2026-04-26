import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Gemini 스트리밍 채팅 API (히스토리 + 날짜 시스템 프롬프트 포함)
export async function POST(request: NextRequest) {
  try {
    const { message, history } = (await request.json()) as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return new Response("메시지가 비어있습니다.", { status: 400 });
    }

    const today = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: `[컨텍스트] 오늘: ${today}. 날짜를 직접 질문받을 때만 언급하세요. 한국어로 답변하세요.`,
    });

    // assistant → model 로 역할 변환 후 Gemini 히스토리 형식 변환
    const geminiHistory = (history ?? []).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessageStream(message);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Gemini API 오류:", error);
    return new Response("AI 응답 생성 실패", { status: 500 });
  }
}
