import { chooseCategory, expect, readStored, test } from './helpers';

test.describe('手動輸入地址', () => {
  test('搜尋地址後選擇結果，回報地點就是該地址（中國大陸結果被過濾）', async ({
    page,
    externalRequests,
  }) => {
    await page.goto('./#/report');
    await page.getByRole('searchbox').fill('台中車站');
    await page.getByRole('button', { name: '搜尋', exact: true }).click();
    const results = page.getByRole('list', { name: '搜尋結果' }).getByRole('button');
    await expect(results).toHaveCount(1);
    await results.first().click();

    await chooseCategory(page, '施工');
    await page.getByRole('button', { name: '送出回報' }).click();
    await expect(page.getByText('回報成功！已顯示在地圖上')).toBeVisible();

    const { reports } = await readStored(page);
    expect(reports[0]?.lat).toBeCloseTo(24.1371, 4);
    expect(reports[0]?.lng).toBeCloseTo(120.6869, 4);

    // 只傳送地址文字，限定台灣
    const geo = externalRequests.filter((u) => u.includes('nominatim'));
    expect(geo).toHaveLength(1);
    const url = new URL(geo[0]!);
    expect(url.searchParams.get('q')).toBe('台中車站');
    expect(url.searchParams.get('countrycodes')).toBe('tw');
  });

  test.describe('地址服務失效', () => {
    test.use({ geocoding: 'down' });
    test('顯示提示，仍可用預設地點送出回報', async ({ page, externalRequests }) => {
      void externalRequests;
      await page.goto('./#/report');
      await page.getByRole('searchbox').fill('台中車站');
      await page.getByRole('button', { name: '搜尋', exact: true }).click();
      await expect(page.getByText('地址查詢服務暫時無法使用，請改用拖曳地圖選擇')).toBeVisible();

      await chooseCategory(page, '施工');
      await page.getByRole('button', { name: '送出回報' }).click();
      await expect(page.getByText('回報成功！已顯示在地圖上')).toBeVisible();
    });
  });
});
