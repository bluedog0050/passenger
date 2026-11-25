import { defineConfig, devices } from '@playwright/test';

/**
 * 端對端測試：在模擬的 iPhone 畫面上操作正式打包後的網站。
 * 外部服務（地圖圖磚、路線、地址查詢）一律用模擬資料，不連到真實服務。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: 'http://localhost:4173/passenger/',
    serviceWorkers: 'block',
    trace: 'off',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/passenger/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
