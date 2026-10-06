import { defineConfig } from "vitest/config"
export default defineConfig({ test: { include: ["core/test/**/*.test.ts", "server/test/**/*.test.ts", "desktop/test/**/*.test.ts"], setupFiles: ["./test-setup.ts"], testTimeout: 30000, pool: "forks" } })
