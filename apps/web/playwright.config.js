// Browser-Tests der Spielesammlung: gegen den Produktions-Build (vite build + vite preview).
// Start: npm run test:e2e (Repo-Wurzel). Browser: einmal `npx playwright install chromium`,
// oder einen installierten Browser nehmen: PW_CHANNEL=msedge bzw. PW_CHANNEL=chrome.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;   // eigener Port, damit ein laufendes `npm run preview` (4173) nicht stört

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    channel: process.env.PW_CHANNEL || undefined,
    serviceWorkers: 'block',             // Tests sollen immer den frischen Build sehen
    locale: 'de-DE',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 760 } }, grepInvert: /@handy/ },
    { name: 'handy', use: { ...devices['Pixel 7'] }, grep: /@handy/ },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
