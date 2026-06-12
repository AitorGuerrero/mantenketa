import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// Las pruebas de auth (lado node) necesitan las mismas variables que la app
Object.assign(process.env, loadEnv('test', process.cwd(), ''))

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
