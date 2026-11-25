import path from 'node:path';
import { chooseCategory, expect, readStored, test } from './helpers';

const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name);

test.describe('回報路況', () => {
  test('首次開啟：地圖在中興大學、沒有回報、不使用定位', async ({ page, externalRequests }) => {
    void externalRequests;
    await page.goto('./');
    await expect(page.getByText('目前沒有回報，成為第一個回報的人吧！')).toBeVisible();
    await expect(page.locator('.report-pin')).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls),
    ).toBe(0);
  });

  test('表單驗證：沒選路況問題時顯示錯誤，不支援的檔案格式會被拒絕', async ({
    page,
    externalRequests,
  }) => {
    void externalRequests;
    await page.goto('./#/report');
    await page.getByRole('button', { name: '送出回報' }).click();
    await expect(page.locator('#error-category')).toHaveText(/請選擇路況問題/);
    await page.locator('input[type=file]').setInputFiles(fixture('not-allowed.gif'));
    await expect(page.getByText(/格式不支援，只接受 JPG、PNG、HEIC/)).toBeVisible();

    await chooseCategory(page, '其他');
    await expect(page.locator('#error-description')).toHaveText(/請簡單說明/);
  });

  test('完整流程：上傳照片 → 送出 → 地圖顯示 → 重新整理仍在 → 刪除', async ({
    page,
    externalRequests,
  }) => {
    void externalRequests;
    await page.goto('./#/report');
    await page.locator('input[type=file]').setInputFiles(fixture('gps-photo.jpg'));
    await expect(page.getByAltText('已選照片 1')).toBeVisible();
    await chooseCategory(page, '障礙物阻擋');
    await page.locator('#field-description').fill('測試：電箱擋住人行道');
    await page.getByRole('button', { name: '送出回報' }).click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByText('回報成功！已顯示在地圖上')).toBeVisible();
    await expect(page.locator('.report-pin')).toHaveCount(1);
    await expect(page.locator('#sheet-title')).toContainText('障礙物阻擋');

    // 隱私：存下的照片已縮小，且不含 EXIF（GPS 位置、手機型號）
    const stored = await readStored(page);
    expect(stored.photos).toHaveLength(1);
    expect(stored.photos[0]).toMatchObject({
      type: 'image/jpeg',
      width: 1280,
      height: 960,
      hasExif: false,
      hasPhoneModel: false,
    });

    await page.reload();
    await expect(page.locator('.report-pin')).toHaveCount(1);

    await page.locator('.report-pin').first().click();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: '刪除這筆回報' }).click();
    await expect(page.getByText('已刪除回報')).toBeVisible();
    await expect(page.locator('.report-pin')).toHaveCount(0);
  });

  test('填寫中按返回會詢問是否放棄', async ({ page, externalRequests }) => {
    void externalRequests;
    await page.goto('./#/report');
    await chooseCategory(page, '施工');
    let message = '';
    page.once('dialog', (d) => {
      message = d.message();
      void d.dismiss();
    });
    await page.getByRole('button', { name: '返回地圖' }).click();
    expect(message).toContain('確定要放棄');
    await expect(page).toHaveURL(/#\/report$/);
  });
});
