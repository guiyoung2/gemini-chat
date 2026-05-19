import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["app/**", "lib/**", "components/**"],
      exclude: ["**/*.d.ts", "**/*.config.*"],
    },
  },
});
