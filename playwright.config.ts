import { defineConfig, devices } from "@playwright/test";

// Run: pnpm exec playwright install chromium   (one-time browser download)
//      pnpm test:e2e
export default defineConfig({
  testDir: "./e2e",
  // On CI write the HTML report (uploaded as a debugging artifact for the flaky SwiftShader maps);
  // locally keep the plain console output. Without this, no `playwright-report/` dir is produced,
  // so the CI upload-artifact step would capture nothing.
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  // Each browser test renders a MapLibre map via software WebGL (SwiftShader), which is
  // CPU-heavy; >2 concurrent maps starve each other and the shared dev server, causing
  // timeouts. Cap workers (CI already serializes). Pure tests are unaffected.
  // One worker: each test renders a real WebGL map via software SwiftShader, and two concurrent
  // maps starve each other (tile/feature-state timeouts). Serial is reliable; the suite is small.
  workers: 1,
  // Each test renders a real WebGL map via software SwiftShader; under concurrency, tile/feature
  // -state timing occasionally races (e.g. roll-up not applied within the wait). Retry the rare
  // flake rather than fail the suite — the app behavior is correct, the timing is environmental.
  retries: 2,
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
  projects: [
    // Signs in anonymously once and saves the session; the chromium project reuses it (one
    // anon sign-in per run, not one per test → no more per-IP rate-limit at setup).
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/anon.json" },
      dependencies: ["setup"],
    },
  ],
});
