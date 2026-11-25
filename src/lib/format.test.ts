import { describe, expect, it } from 'vitest';
import { formatTaipeiTime } from './format';

describe('formatTaipeiTime', () => {
  it('UTC 轉成台灣時間（+8）', () => {
    expect(formatTaipeiTime('2026-11-25T06:30:00Z')).toBe('2026/11/25 14:30');
  });
  it('跨日也正確', () => {
    expect(formatTaipeiTime('2026-12-31T20:05:00Z')).toBe('2027/01/01 04:05');
  });
  it('無效時間', () => {
    expect(formatTaipeiTime('not-a-date')).toBe('時間不明');
  });
});
