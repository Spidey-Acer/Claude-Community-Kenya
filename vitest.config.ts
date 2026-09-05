import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `@/auth` calls `NextAuth(...)` at module load, which imports
      // `next/server` — unresolvable under Vitest's plain Node ESM resolver
      // outside Next's own bundler. No unit test in this repo calls `auth()`
      // itself; some (e.g. `results-input.test.ts`, via `./member`) import it
      // only in passing. See `src/__mocks__/auth.ts` for the full reasoning.
      "@/auth": fileURLToPath(new URL("./src/__mocks__/auth.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
})
