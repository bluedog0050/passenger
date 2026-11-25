import { devices } from '@playwright/test';
import { expect, test } from './helpers';

const phones = ['iPhone SE', 'iPhone 13', 'iPhone 15 Pro Max', 'Pixel 7'] as const;

for (const name of phones) {
  test.describe(`手機畫面：${name}`, () => {
    // 瀏覽器一律用 chromium（在設定檔指定），這裡只套用螢幕尺寸等設定
    const { defaultBrowserType: _ignored, ...device } = devices[name];
    void _ignored;
    test.use(device);

    for (const route of ['./', './#/report']) {
      test(`${route === './' ? '地圖' : '回報'}頁：沒有左右捲動、按鈕至少 44×44`, async ({
        page,
        externalRequests,
      }) => {
        void externalRequests;
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);

        // 檢查所有看得到的按鈕（不含 Leaflet 的來源標示連結）
        const small = await page.locator('button:visible').evaluateAll((els) =>
          els
            .map((el) => {
              const r = el.getBoundingClientRect();
              return {
                text: (el.textContent || el.getAttribute('aria-label') || '').trim(),
                w: r.width,
                h: r.height,
              };
            })
            .filter((b) => b.w < 44 - 0.5 || b.h < 44 - 0.5),
        );
        expect(small).toEqual([]);
      });
    }
  });
}
