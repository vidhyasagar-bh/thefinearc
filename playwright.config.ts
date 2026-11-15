import { existsSync } from 'node:fs';
import { chromium, defineConfig } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (!existsSync(chromium.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

const preview = process.env.E2E_PREVIEW_URL;
if (preview && !/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(preview)) {
  throw new Error('E2E_PREVIEW_URL must be a Vercel preview origin, never the production domain.');
}
export default defineConfig({
  testDir: './tests/e2e', testMatch: '**/*.spec.ts',
  outputDir: '/tmp/finearc-e2e-results',
  reporter: [['list'], ['json', { outputFile: '/tmp/finearc-e2e-results.json' }]],
  workers: 2, retries: 0, timeout: 30000,
  use: {
    baseURL: preview || 'http://127.0.0.1:4175', serviceWorkers: 'block',
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: preview ? undefined : {
    command: 'npx vite --config tests/e2e/vite.config.ts --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175', reuseExistingServer: false,
  },
});
