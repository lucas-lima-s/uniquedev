import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/projection/**", "src/money.ts"],
      thresholds: {
        statements: 90,
        branches: 85,
      },
    },
  },
});
