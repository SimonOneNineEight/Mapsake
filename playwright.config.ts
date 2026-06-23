import { defineConfig, devices } from "@playwright/test";

// Run: pnpm exec playwright install chromium   (one-time browser download)
//      pnpm test:e2e
export default defineConfig({
  testDir: "./e2e",
  // Each browser test renders a MapLibre map via software WebGL (SwiftShader), which is
  // CPU-heavy; >2 concurrent maps starve each other and the shared dev server, causing
  // timeouts. Cap workers (CI already serializes). Pure tests are unaffected.
  workers: process.env.CI ? 1 : 2,
  // MapLibre needs a WebGL context; headless chromium only provides one via the
  // software (SwiftShader) path, which modern Chrome gates behind this flag.
  use: {
    baseURL: "http://localhost:3000",
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
