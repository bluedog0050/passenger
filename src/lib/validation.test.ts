import { describe, expect, it } from 'vitest';
import {
  parseStoredReport,
  validateDraft,
  validatePhotoFile,
  validateReportedAt,
  type ReportDraft,
} from './validation';

const now = new Date('2026-11-25T06:00:00Z');
const valid: ReportDraft = {
  category: 'obstacle',
  description: '電箱擋路',
  location: { lat: 24.12, lng: 120.67 },
  reportedAt: '2026-11-25T05:00:00Z',
  photoCount: 1,
};

describe('validateDraft', () => {
  it('正確資料沒有錯誤', () => {
    expect(validateDraft(valid, now)).toEqual({});
  });
  it('沒選類別、沒有地點', () => {
    const e = validateDraft({ ...valid, category: null, location: null }, now);
    expect(e.category).toBe('請選擇路況問題');
    expect(e.location).toContain('大頭針');
  });
  it('地點在中國大陸或日本都不行', () => {
    expect(
      validateDraft({ ...valid, location: { lat: 24.47, lng: 118.13 } }, now).location,
    ).toContain('台灣');
    expect(
      validateDraft({ ...valid, location: { lat: 35.6, lng: 139.7 } }, now).location,
    ).toContain('台灣');
  });
  it('選「其他」時說明必填（只有空白也不行）', () => {
    expect(
      validateDraft({ ...valid, category: 'other', description: '   ' }, now).description,
    ).toContain('其他');
    expect(validateDraft({ ...valid, category: 'other', description: '積水' }, now)).toEqual({});
  });
  it('說明超過 200 字', () => {
    const e = validateDraft({ ...valid, description: 'a'.repeat(201) }, now);
    expect(e.description).toContain('200');
  });
  it('照片超過 3 張', () => {
    expect(validateDraft({ ...valid, photoCount: 4 }, now).photos).toContain('3');
  });
});

describe('validateReportedAt', () => {
  it('未來時間不行（容許 2 分鐘誤差）', () => {
    expect(validateReportedAt('2026-11-25T06:01:00Z', now)).toBeNull();
    expect(validateReportedAt('2026-11-25T07:00:00Z', now)).toContain('未來');
  });
  it('超過 30 天不行', () => {
    expect(validateReportedAt('2026-10-20T00:00:00Z', now)).toContain('30');
  });
  it('空白或亂碼', () => {
    expect(validateReportedAt('', now)).toBe('請選擇發生時間');
    expect(validateReportedAt('abc', now)).toContain('格式');
  });
});

describe('validatePhotoFile', () => {
  it('接受 JPG、PNG、HEIC', () => {
    expect(validatePhotoFile({ name: 'a.jpg', type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validatePhotoFile({ name: 'a.png', type: 'image/png', size: 1000 })).toBeNull();
    expect(validatePhotoFile({ name: 'a.HEIC', type: '', size: 1000 })).toBeNull();
  });
  it('拒絕其他格式、過大、空檔', () => {
    expect(validatePhotoFile({ name: 'a.gif', type: 'image/gif', size: 1000 })).toContain('格式');
    expect(validatePhotoFile({ name: 'a.svg', type: 'image/svg+xml', size: 1000 })).toContain(
      '格式',
    );
    expect(
      validatePhotoFile({ name: 'a.jpg', type: 'image/jpeg', size: 11 * 1024 * 1024 }),
    ).toContain('10MB');
    expect(validatePhotoFile({ name: 'a.jpg', type: 'image/jpeg', size: 0 })).toContain('空檔案');
  });
});

describe('parseStoredReport', () => {
  const stored = {
    id: 'x',
    category: 'damaged',
    description: '破損',
    lat: 24.12,
    lng: 120.67,
    reportedAt: '2026-11-25T05:00:00Z',
    createdAt: '2026-11-25T05:01:00Z',
    schemaVersion: 1,
    extra: '多餘欄位會被移除',
  };
  it('正確資料只保留必要欄位', () => {
    const r = parseStoredReport(stored);
    expect(r).not.toBeNull();
    expect(r).not.toHaveProperty('extra');
  });
  it('格式錯誤回傳 null', () => {
    expect(parseStoredReport(null)).toBeNull();
    expect(parseStoredReport({ ...stored, category: 'hack' })).toBeNull();
    expect(parseStoredReport({ ...stored, lat: '24' })).toBeNull();
    expect(parseStoredReport({ ...stored, schemaVersion: 2 })).toBeNull();
  });
});
