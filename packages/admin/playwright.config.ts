import { defineConfig, devices } from '@playwright/test'

const PORT = 41800
const BASE_URL = `http://127.0.0.1:${PORT}`

// Work Item Browser smoke tests (VS-098.2). Requires the admin frontend and admin-server to be
// built first (`pnpm -r build`); the webServer bootstrap serves the built app over a disposable
// fixture project.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node e2e/server.mjs',
    url: `${BASE_URL}/api/v1/admin/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { PORT: String(PORT) },
  },
})
