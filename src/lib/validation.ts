import { CATEGORY_IDS, type CategoryId, type Report } from '../types';
import { isInTaiwan } from './geo';

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_DESCRIPTION = 200;
export const MAX_AGE_DAYS = 30;
/** 手機時鐘可能有些微誤差，容許 2 分鐘的「未來」 */
const FUTURE_TOLERANCE_MS = 2 * 60 * 1000;

export type FieldName = 'photos' | 'location' | 'reportedAt' | 'category' | 'description';
export type FieldErrors = Partial<Record<FieldName, string>>;

/** 表單欄位顯示順序，用來捲動到第一個錯誤 */
export const FIELD_ORDER: FieldName[] = [
  'photos',
  'location',
  'reportedAt',
  'category',
  'description',
];

export interface ReportDraft {
  category: CategoryId | null;
  description: string;
  location: { lat: number; lng: number } | null;
  /** 事件發生時間（任何 Date 可解析的字串） */
  reportedAt: string;
  photoCount: number;
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
}

/** 驗證時間；回傳錯誤訊息或 null */
export function validateReportedAt(value: string, now: Date): string | null {
  if (!value) return '請選擇發生時間';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '時間格式不正確，請重新選擇';
  if (t > now.getTime() + FUTURE_TOLERANCE_MS) return '發生時間不能是未來，請重新選擇';
  if (t < now.getTime() - MAX_AGE_DAYS * 24 * 3_600_000) {
    return `只能回報 ${MAX_AGE_DAYS} 天內發生的問題`;
  }
  return null;
}

export function validateDraft(d: ReportDraft, now: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {};

  if (d.photoCount > MAX_PHOTOS) errors.photos = `最多只能上傳 ${MAX_PHOTOS} 張照片`;

  if (!d.location) {
    errors.location = '請拖曳地圖，把大頭針對準問題發生的地點';
  } else if (!isInTaiwan(d.location.lat, d.location.lng)) {
    errors.location = '地點必須在台灣（含澎湖、金門、馬祖）範圍內，請重新選擇';
  }

  const timeError = validateReportedAt(d.reportedAt, now);
  if (timeError) errors.reportedAt = timeError;

  if (!d.category) errors.category = '請選擇路況問題';

  const desc = d.description.trim();
  if (desc.length > MAX_DESCRIPTION) {
    errors.description = `詳細說明最多 ${MAX_DESCRIPTION} 字，目前 ${desc.length} 字`;
  } else if (d.category === 'other' && desc.length === 0) {
    errors.description = '選擇「其他」時，請簡單說明是什麼問題';
  }

  return errors;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const ALLOWED_EXT = /\.(jpe?g|png|heic|heif)$/i;

/** 檢查使用者選的照片檔案；回傳錯誤訊息或 null */
export function validatePhotoFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const typeOk = file.type
    ? ALLOWED_TYPES.includes(file.type.toLowerCase())
    : ALLOWED_EXT.test(file.name);
  if (!typeOk) return `「${file.name}」格式不支援，只接受 JPG、PNG、HEIC`;
  if (file.size > MAX_PHOTO_BYTES) return `「${file.name}」超過 10MB，請換一張較小的照片`;
  if (file.size === 0) return `「${file.name}」是空檔案，請重新選擇`;
  return null;
}

/** 從瀏覽器儲存空間讀回的資料要先檢查格式，不正確就略過 */
export function parseStoredReport(value: unknown): Report | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== 'string' ||
    !isCategoryId(v.category) ||
    typeof v.description !== 'string' ||
    v.description.length > MAX_DESCRIPTION ||
    typeof v.lat !== 'number' ||
    typeof v.lng !== 'number' ||
    !isInTaiwan(v.lat, v.lng) ||
    typeof v.reportedAt !== 'string' ||
    Number.isNaN(new Date(v.reportedAt).getTime()) ||
    typeof v.createdAt !== 'string' ||
    v.schemaVersion !== 1
  ) {
    return null;
  }
  return {
    id: v.id,
    category: v.category,
    description: v.description,
    lat: v.lat,
    lng: v.lng,
    reportedAt: v.reportedAt,
    createdAt: v.createdAt,
    schemaVersion: 1,
  };
}
