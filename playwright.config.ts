import { defineConfig, devices } from "@playwright/test";

// Run: pnpm exec playwright install chromium   (one-time browser download)
//      pnpm test:e2e
export default defineConfig({
  testDir: "./e2e",
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
