export const CATEGORY_IDS = [
  'discontinuous',
  'obstacle',
  'damaged',
  'occupied',
  'construction',
  'other',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/** 一筆路況回報（對應 docs/spec.md 第 6 節 REPORT） */
export interface Report {
  id: string;
  category: CategoryId;
  description: string;
  lat: number;
  lng: number;
  /** ISO 8601，事件發生時間 */
  reportedAt: string;
  /** ISO 8601，送出時間 */
  createdAt: string;
  schemaVersion: 1;
}

/** 地圖上顯示用的回報：加上照片網址與是否為範例 */
export interface ReportView extends Report {
  photoUrls: string[];
  isSample: boolean;
}
