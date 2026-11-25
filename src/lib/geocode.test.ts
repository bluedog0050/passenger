import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GEOCODE_MESSAGES,
  geocodeUrl,
  parseGeocodeResponse,
  resetGeocodeState,
  searchAddress,
} from './geocode';

const okBody = [
  { lat: '24.1226', lon: '120.6750', display_name: '國立中興大學, 興大路, 南區, 臺中市, 臺灣' },
  { lat: '24.47', lon: '118.13', display_name: '廈門（中國大陸，應被排除）' },
  { lat: 'abc', lon: '120', display_name: '格式錯誤' },
];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => resetGeocodeState());

describe('geocodeUrl', () => {
  it('限定台灣、繁體中文、最多 5 筆，並正確編碼', () => {
    const u = new URL(geocodeUrl('興大路 145號'));
    expect(u.origin).toBe('https://nominatim.openstreetmap.org');
    expect(u.searchParams.get('q')).toBe('興大路 145號');
    expect(u.searchParams.get('countrycodes')).toBe('tw');
    expect(u.searchParams.get('accept-language')).toBe('zh-TW');
    expect(u.searchParams.get('limit')).toBe('5');
  });
});

describe('parseGeocodeResponse', () => {
  it('只保留台灣範圍內、格式正確的結果', () => {
    const r = parseGeocodeResponse(okBody);
    expect(r).toHaveLength(1);
    expect(r?.[0]).toMatchObject({ lat: 24.1226, lng: 120.675 });
  });
  it('不是陣列回傳 null', () => {
    expect(parseGeocodeResponse({ error: 'x' })).toBeNull();
  });
});

describe('searchAddress', () => {
  it('成功', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(okBody));
    const r = await searchAddress('  中興大學 ', { fetchFn });
    expect(r[0]?.label).toContain('中興大學');
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ credentials: 'omit' });
  });
  it('同一個查詢使用快取，不重複送出', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(okBody));
    await searchAddress('中興大學', { fetchFn });
    await searchAddress('中興大學', { fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it('太短或太長不送出', async () => {
    const fetchFn = vi.fn();
    await expect(searchAddress('a', { fetchFn })).rejects.toThrow(GEOCODE_MESSAGES.tooShort);
    await expect(searchAddress('a'.repeat(101), { fetchFn })).rejects.toThrow(
      GEOCODE_MESSAGES.tooLong,
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('找不到結果', async () => {
    await expect(
      searchAddress('不存在的地方', { fetchFn: vi.fn().mockResolvedValue(json([])) }),
    ).rejects.toThrow(GEOCODE_MESSAGES.notFound);
  });
  it('服務錯誤、連線失敗、逾時都顯示「改用拖曳地圖」', async () => {
    await expect(
      searchAddress('台中火車站', { fetchFn: vi.fn().mockResolvedValue(json({}, 503)) }),
    ).rejects.toThrow(GEOCODE_MESSAGES.unavailable);
    resetGeocodeState();
    await expect(
      searchAddress('台中火車站', { fetchFn: vi.fn().mockRejectedValue(new TypeError('x')) }),
    ).rejects.toThrow(GEOCODE_MESSAGES.unavailable);
    resetGeocodeState();
    const hang = (_: unknown, init?: RequestInit) =>
      new Promise<Response>((_r, rej) =>
        init?.signal?.addEventListener('abort', () => rej(new DOMException('a', 'AbortError'))),
      );
    await expect(
      searchAddress('台中火車站', { fetchFn: hang as typeof fetch, timeoutMs: 20 }),
    ).rejects.toThrow(GEOCODE_MESSAGES.unavailable);
  });
  it('連續查詢至少間隔 1 秒（遵守使用規範）', async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(json(okBody)));
      await searchAddress('第一個', { fetchFn });
      const second = searchAddress('第二個', { fetchFn });
      await vi.advanceTimersByTimeAsync(500);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(700);
      await second;
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
