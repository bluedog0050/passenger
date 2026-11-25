import { expect, seedReports, test } from './helpers';

test.describe('安全與隱私', () => {
  test('說明中的 HTML／程式碼只會當成文字顯示（防 XSS）', async ({ page, externalRequests }) => {
    void externalRequests;
    let dialogShown = false;
    page.on('dialog', (d) => {
      dialogShown = true;
      void d.dismiss();
    });
    await page.goto('./');
    const payload = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    await seedReports(page, [
      { id: 'xss', category: 'other', description: payload, lat: 24.1226, lng: 120.675 },
    ]);
    await page.reload();
    await page.locator('.report-pin').first().click();
    await expect(page.getByRole('dialog')).toContainText(payload);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    expect(dialogShown).toBe(false);
  });

  test('格式錯誤或位置不合法的儲存資料會被略過', async ({ page, externalRequests }) => {
    void externalRequests;
    await page.goto('./');
    await seedReports(page, [
      { id: 'ok', category: 'obstacle', description: '正常', lat: 24.1226, lng: 120.675 },
      { id: 'bad-category', category: 'hack', description: 'x', lat: 24.1226, lng: 120.675 },
      { id: 'in-china', category: 'obstacle', description: '廈門', lat: 24.47, lng: 118.13 },
      {
        id: 'bad-version',
        category: 'obstacle',
        description: 'x',
        lat: 24.12,
        lng: 120.67,
        schemaVersion: 99,
      },
    ]);
    await page.reload();
    await expect(page.locator('.report-pin')).toHaveCount(1);
  });

  test('另一位使用者（另一個瀏覽器）看不到這台裝置的回報', async ({
    page,
    browser,
    externalRequests,
  }) => {
    void externalRequests;
    await page.goto('./');
    await seedReports(page, [
      { id: 'mine', category: 'obstacle', description: '我的回報', lat: 24.1226, lng: 120.675 },
    ]);
    await page.reload();
    await expect(page.locator('.report-pin')).toHaveCount(1);

    const other = await browser.newContext({ baseURL: 'http://localhost:4173/passenger/' });
    const otherPage = await other.newPage();
    await otherPage.route('https://tile.openstreetmap.org/**', (r) => r.abort());
    await otherPage.goto('./');
    await expect(otherPage.getByText('目前沒有回報')).toBeVisible();
    await expect(otherPage.locator('.report-pin')).toHaveCount(0);
    await other.close();
  });

  test('內容安全政策（CSP）擋下未允許的外部連線', async ({ page, externalRequests }) => {
    void externalRequests;
    await page.goto('./');
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    const blocked = await page.evaluate(async () => {
      try {
        await fetch('https://example.com/collect', { method: 'POST', body: 'x' });
        return false;
      } catch {
        return true;
      }
    });
    expect(blocked).toBe(true);
  });
});
