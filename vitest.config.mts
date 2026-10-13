import { configDefaults, defineConfig } from "vitest/config"
import dotenv from "dotenv"

// The live smoke test reads KEEPER_KSM_CONFIG from .env and skips when it is absent.
dotenv.config()

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    clearMocks: true,
    include: ["src/**/*.test.ts"],
    exclude: [...configDefaults.exclude],
  },
})
