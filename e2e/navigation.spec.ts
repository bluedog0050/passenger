import { dragMap, expect, seedReports, test } from './helpers';

// 拖曳地圖用滑鼠操作
test.use({ hasTouch: false });

const reportsNearRoute = [
  { id: 'a', category: 'obstacle', description: '路線旁的電箱', lat: 24.124, lng: 120.67605 },
  { id: 'b', category: 'construction', description: '路線旁施工', lat: 24.1258, lng: 120.6779 },
  { id: 'far', category: 'damaged', description: '很遠的破損', lat: 24.115, lng: 120.665 },
];

async function planFromNchu(page: import('@playwright/test').Page) {
  await page.goto('./');
  await seedReports(page, reportsNearRoute);
  await page.reload();
  await expect(page.locator('.report-pin')).toHaveCount(3);
  await page.getByRole('button', { name: '導航', exact: true }).click();
  await page.getByRole('button', { name: '以國立中興大學為起點' }).click();
  await dragMap(page, -150, 80);
  await page.getByRole('button', { name: '確定終點' }).click();
  await expect(page.getByText(/步行約/)).toBeVisible();
}

test.describe('導航', () => {
  test('實際路線：標出路線 30 公尺內的問題並依距離排序', async ({ page, externalRequests }) => {
    await planFromNchu(page);
    const panel = page.getByRole('region', { name: '導航' });
    await expect(panel).toContainText('步行約 10 分鐘');
    await expect(panel).toContainText('路上有 2 個人行道問題');
    const items = panel.getByRole('listitem');
    await expect(items.nth(0)).toContainText('障礙物阻擋');
    await expect(items.nth(1)).toContainText('施工');
    await expect(panel).not.toContainText('示意直線');

    // 只傳送起點與終點座標
    const routing = externalRequests.filter((u) => u.includes('routing.openstreetmap.de'));
    expect(routing).toHaveLength(1);
    expect(routing[0]).toMatch(/\/foot\/120\.675000,24\.122600;[\d.]+,[\d.]+\?/);

    await items.nth(0).getByRole('button').click();
    await expect(page.locator('#sheet-title')).toContainText('障礙物阻擋');
    await page.keyboard.press('Escape');
    await panel.getByRole('button', { name: '結束導航' }).click();
    await expect(page.getByRole('button', { name: '回報路況' })).toBeVisible();
  });

  test.describe('路線服務失效', () => {
    test.use({ routing: 'down' });
    test('改用示意直線並說明原因', async ({ page, externalRequests }) => {
      void externalRequests;
      await planFromNchu(page);
      const panel = page.getByRole('region', { name: '導航' });
      await expect(panel).toContainText('示意直線');
      await expect(panel).toContainText('路線服務暫時無法使用');
    });
  });

  test('起點可用地址搜尋', async ({ page, externalRequests }) => {
    void externalRequests;
    await page.goto('./');
    await page.getByRole('button', { name: '導航', exact: true }).click();
    await page.getByRole('searchbox').fill('台中車站');
    await page.getByRole('button', { name: '搜尋', exact: true }).click();
    await page.getByRole('list', { name: '搜尋結果' }).getByRole('button').first().click();
    await page.getByRole('button', { name: '確定起點' }).click();
    await expect(page.getByText('拖曳地圖把紅色圖釘對準終點', { exact: false })).toBeVisible();
  });
});
