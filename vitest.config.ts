import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/{domain,state,io}/**/*.test.ts"] },
});
