import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../types';
import { CATEGORIES, getCategory } from './categories';
import { getSampleReports } from './samples';

/** 台中市南區的大致範圍 */
const SOUTH_DISTRICT = { south: 24.1, north: 24.14, west: 120.645, east: 120.695 };

describe('categories', () => {
  it('6 種類別都有定義，且順序和規格一致', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([...CATEGORY_IDS]);
  });
  it('getCategory 回傳正確名稱', () => {
    expect(getCategory('construction').label).toBe('施工');
  });
});

describe('sample reports', () => {
  const now = new Date('2026-11-25T06:00:00Z');
  const samples = getSampleReports(now);

  it('共 15 筆，id 不重複', () => {
    expect(samples).toHaveLength(15);
    expect(new Set(samples.map((s) => s.id)).size).toBe(15);
  });
  it('全部位於台中市南區', () => {
    for (const s of samples) {
      expect(s.lat).toBeGreaterThanOrEqual(SOUTH_DISTRICT.south);
      expect(s.lat).toBeLessThanOrEqual(SOUTH_DISTRICT.north);
      expect(s.lng).toBeGreaterThanOrEqual(SOUTH_DISTRICT.west);
      expect(s.lng).toBeLessThanOrEqual(SOUTH_DISTRICT.east);
    }
  });
  it('時間都在過去 30 天內，且全部標記為範例', () => {
    for (const s of samples) {
      const t = new Date(s.reportedAt).getTime();
      expect(t).toBeLessThanOrEqual(now.getTime());
      expect(now.getTime() - t).toBeLessThan(30 * 24 * 3_600_000);
      expect(s.isSample).toBe(true);
    }
  });
  it('說明都在 200 字以內', () => {
    for (const s of samples) expect(s.description.length).toBeLessThanOrEqual(200);
  });
});
