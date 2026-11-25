import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CategoryId, Report } from '../types';
import type { ProcessedPhoto } from './image';
import { MAX_PHOTOS, parseStoredReport, validateDraft } from './validation';

/**
 * 回報資料存在使用者自己瀏覽器的 IndexedDB，不會傳到任何伺服器。
 * 日後改成雲端版（方案 B）時，只需要替換這個檔案的 4 個函式。
 */

export interface StoredPhoto {
  id: string;
  reportId: string;
  order: number;
  data: Blob;
  width: number;
  height: number;
}

interface PassengerDB extends DBSchema {
  reports: { key: string; value: Report };
  photos: { key: string; value: StoredPhoto; indexes: { byReport: string } };
}

const DB_NAME = 'passenger-db';
let dbPromise: Promise<IDBPDatabase<PassengerDB>> | null = null;

function db(): Promise<IDBPDatabase<PassengerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PassengerDB>(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore('reports', { keyPath: 'id' });
        const photos = database.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('byReport', 'reportId');
      },
    });
    // 開啟失敗時，下次呼叫可以重試
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

export class ReportValidationError extends Error {}

/** 讀取全部回報（新的在前），格式不正確的資料會被略過 */
export async function listReports(): Promise<Report[]> {
  const all = await (await db()).getAll('reports');
  return all
    .map(parseStoredReport)
    .filter((r): r is Report => r !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReportPhotos(reportId: string): Promise<StoredPhoto[]> {
  const photos = await (await db()).getAllFromIndex('photos', 'byReport', reportId);
  return photos.filter((p) => p.data instanceof Blob).sort((a, b) => a.order - b.order);
}

export interface NewReportInput {
  category: CategoryId;
  description: string;
  lat: number;
  lng: number;
  reportedAt: string;
}

/** 驗證後儲存一筆回報與照片（同一個交易，要嘛全部成功、要嘛全部不存） */
export async function createReport(
  input: NewReportInput,
  photos: ProcessedPhoto[],
  now: Date = new Date(),
): Promise<Report> {
  const errors = validateDraft(
    {
      category: input.category,
      description: input.description,
      location: { lat: input.lat, lng: input.lng },
      reportedAt: input.reportedAt,
      photoCount: photos.length,
    },
    now,
  );
  if (Object.keys(errors).length > 0) {
    throw new ReportValidationError(Object.values(errors)[0]);
  }
  if (photos.length > MAX_PHOTOS || photos.some((p) => p.blob.type !== 'image/jpeg')) {
    throw new ReportValidationError('照片格式不正確');
  }

  const report: Report = {
    id: crypto.randomUUID(),
    category: input.category,
    description: input.description.trim(),
    lat: input.lat,
    lng: input.lng,
    reportedAt: new Date(input.reportedAt).toISOString(),
    createdAt: now.toISOString(),
    schemaVersion: 1,
  };

  const tx = (await db()).transaction(['reports', 'photos'], 'readwrite');
  await Promise.all([
    tx.objectStore('reports').add(report),
    ...photos.map((p, order) =>
      tx.objectStore('photos').add({
        id: crypto.randomUUID(),
        reportId: report.id,
        order,
        data: p.blob,
        width: p.width,
        height: p.height,
      }),
    ),
    tx.done,
  ]);
  return report;
}

/** 刪除回報與它的照片 */
export async function deleteReport(reportId: string): Promise<void> {
  const tx = (await db()).transaction(['reports', 'photos'], 'readwrite');
  const photoKeys = await tx.objectStore('photos').index('byReport').getAllKeys(reportId);
  await Promise.all([
    tx.objectStore('reports').delete(reportId),
    ...photoKeys.map((k) => tx.objectStore('photos').delete(k)),
    tx.done,
  ]);
}
