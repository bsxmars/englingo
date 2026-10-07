import { defineConfig, devices } from '@playwright/test';

// End-to-end checks against the production build: `npm run build && npm run e2e`.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173/englingo/', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/englingo/',
    reuseExistingServer: true,
  },
});
