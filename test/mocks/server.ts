import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// MSW Node 서버 (Vitest 환경에서 사용)
export const server = setupServer(...handlers);
