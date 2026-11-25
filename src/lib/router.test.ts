import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('parseRoute', () => {
  it('#/report 是回報頁', () => {
    expect(parseRoute('#/report')).toBe('report');
  });
  it('其他網址都回到地圖', () => {
    expect(parseRoute('')).toBe('map');
    expect(parseRoute('#/')).toBe('map');
    expect(parseRoute('#/unknown')).toBe('map');
  });
});
