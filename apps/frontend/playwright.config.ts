import { defineConfig, devices } from "@playwright/test"

// Runs against the already running dev servers (`pnpm dev`) and the seeded users.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3050" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
