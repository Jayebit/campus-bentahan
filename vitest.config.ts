import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: [],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
    },
  },
});