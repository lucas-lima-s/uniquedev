import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./test/global-setup.ts",
    setupFiles: ["./test/setup.ts"],
    pool: "threads",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
