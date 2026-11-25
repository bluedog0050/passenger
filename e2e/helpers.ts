import { test as base, expect, type Page } from '@playwright/test';

// 1×1 灰色 PNG，用來代替地圖圖磚
const TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN4+OzZfwAI5AOxjdSpAAAAAElFTkSuQmCC',
  'base64',
);

export const OSRM_OK = {
  code: 'Ok',
  routes: [
    {
      distance: 812.3,
      geometry: {
        type: 'LineString',
        coordinates: [
          [120.675, 24.1226],
          [120.676, 24.1226],
          [120.676, 24.1245],
          [120.678, 24.1245],
          [120.678, 24.1262],
          [120.6795, 24.1262],
        ],
      },
    },
  ],
};

export const NOMINATIM_OK = [
  { lat: '24.1371', lon: '120.6869', display_name: '臺中車站, 臺灣大道一段, 中區, 臺中市, 臺灣' },
  { lat: '24.47', lon: '118.13', display_name: '廈門（應被過濾）' },
];

export type ServiceMode = 'ok' | 'down';

interface Fixtures {
  routing: ServiceMode;
  geocoding: ServiceMode;
  /** 記錄網站對外送出的請求網址 */
  externalRequests: string[];
}

/** 所有測試共用：攔截外部服務，改用模擬資料 */
export const test = base.extend<Fixtures>({
  routing: ['ok', { option: true }],
  geocoding: ['ok', { option: true }],
  externalRequests: async ({ page, routing, geocoding }, use) => {
    const requests: string[] = [];
    await page.route('https://tile.openstreetmap.org/**', (r) =>
      r.fulfill({ body: TILE, contentType: 'image/png' }),
    );
    await page.route('https://routing.openstreetmap.de/**', (r) => {
      requests.push(r.request().url());
      return routing === 'ok'
        ? r.fulfill({ json: OSRM_OK })
        : r.fulfill({ status: 503, body: 'unavailable' });
    });
    await page.route('https://nominatim.openstreetmap.org/**', (r) => {
      requests.push(r.request().url());
      return geocoding === 'ok' ? r.fulfill({ json: NOMINATIM_OK }) : r.abort();
    });
    await use(requests);
  },
  page: async ({ page }, use) => {
    // 記錄是否有程式呼叫定位功能（本 App 不應使用定位）
    await page.addInitScript(() => {
      const w = window as unknown as { __geoCalls: number };
      w.__geoCalls = 0;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = () => {
          w.__geoCalls++;
        };
        navigator.geolocation.watchPosition = () => {
          w.__geoCalls++;
          return 0;
        };
      }
    });
    await use(page);
  },
});

export { expect };

export interface SeedReport {
  id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  [key: string]: unknown;
}

/** 直接寫入 IndexedDB，模擬這台裝置上已有的回報（也可寫入格式錯誤的資料） */
export async function seedReports(page: Page, reports: SeedReport[]): Promise<void> {
  await page.evaluate(async (items) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('passenger-db', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('reports', { keyPath: 'id' });
        req.result
          .createObjectStore('photos', { keyPath: 'id' })
          .createIndex('byReport', 'reportId');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('reports', 'readwrite');
    const now = new Date().toISOString();
    for (const r of items) {
      tx.objectStore('reports').put({ reportedAt: now, createdAt: now, schemaVersion: 1, ...r });
    }
    await new Promise((resolve) => (tx.oncomplete = resolve));
    db.close();
  }, reports);
}

/** 讀出 IndexedDB 中的回報座標與照片資訊 */
export async function readStored(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open('passenger-db');
      req.onsuccess = () => resolve(req.result);
    });
    const getAll = <T>(store: string) =>
      new Promise<T[]>((resolve) => {
        const req = db.transaction(store).objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
      });
    const reports = await getAll<{ lat: number; lng: number; description: string }>('reports');
    const photos = await getAll<{ data: Blob; width: number; height: number }>('photos');
    const photoInfo = await Promise.all(
      photos.map(async (p) => {
        const text = new TextDecoder('latin1').decode(await p.data.arrayBuffer());
        return {
          type: p.data.type,
          width: p.width,
          height: p.height,
          hasExif: text.includes('Exif'),
          hasPhoneModel: text.includes('TestPhone'),
        };
      }),
    );
    db.close();
    return { reports, photos: photoInfo };
  });
}

/** 拖曳地圖 */
export async function dragMap(page: Page, dx: number, dy: number): Promise<void> {
  const box = await page.locator('.leaflet-container').first().boundingBox();
  if (!box) throw new Error('找不到地圖');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 3;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10);
  await page.mouse.up();
}

/** 點選路況問題（先捲到畫面中央，避免被固定在底部的「送出回報」列擋住） */
export async function chooseCategory(page: Page, label: string): Promise<void> {
  const option = page.locator('label', { hasText: label }).first();
  await option.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await option.click();
}
