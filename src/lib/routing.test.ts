import { describe, expect, it, vi } from 'vitest';
import { osrmUrl, parseOsrmResponse, planRoute } from './routing';
import type { LatLngTuple } from './routeGeometry';

const start: LatLngTuple = [24.1226, 120.675];
const end: LatLngTuple = [24.13, 120.68];
const okBody = {
  code: 'Ok',
  routes: [
    {
      distance: 1234,
      geometry: {
        type: 'LineString',
        coordinates: [
          [120.675, 24.1226],
          [120.678, 24.125],
          [120.68, 24.13],
        ],
      },
    },
  ],
};
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('osrmUrl', () => {
  it('座標順序為 經度,緯度，使用步行服務', () => {
    expect(osrmUrl(start, end)).toBe(
      'https://routing.openstreetmap.de/routed-foot/route/v1/foot/120.675000,24.122600;120.680000,24.130000?overview=full&geometries=geojson',
    );
  });
});

describe('parseOsrmResponse', () => {
  it('正確回應：座標轉成 [lat, lng]', () => {
    const r = parseOsrmResponse(okBody);
    expect(r?.distance).toBe(1234);
    expect(r?.line[0]).toEqual([24.1226, 120.675]);
  });
  it('格式錯誤回傳 null', () => {
    expect(parseOsrmResponse(null)).toBeNull();
    expect(parseOsrmResponse({ code: 'NoRoute', routes: [] })).toBeNull();
    expect(
      parseOsrmResponse({
        code: 'Ok',
        routes: [
          {
            geometry: {
              type: 'LineString',
              coordinates: [
                [1, 'x'],
                [2, 3],
              ],
            },
          },
        ],
      }),
    ).toBeNull();
    expect(
      parseOsrmResponse({
        code: 'Ok',
        routes: [{ geometry: { type: 'Point', coordinates: [1, 2] } }],
      }),
    ).toBeNull();
  });
});

describe('planRoute', () => {
  it('成功時使用實際路線', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(okBody));
    const r = await planRoute(start, end, { fetchFn });
    expect(r.source).toBe('osrm');
    expect(r.line).toHaveLength(3);
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ credentials: 'omit' });
  });
  it('伺服器錯誤時改用示意直線', async () => {
    const r = await planRoute(start, end, {
      fetchFn: vi.fn().mockResolvedValue(jsonResponse({}, 503)),
    });
    expect(r.source).toBe('straight');
    expect(r.line).toEqual([start, end]);
    expect(r.fallbackReason).toContain('示意直線');
  });
  it('連線失敗時改用示意直線', async () => {
    const r = await planRoute(start, end, {
      fetchFn: vi.fn().mockRejectedValue(new TypeError('x')),
    });
    expect(r.source).toBe('straight');
    expect(r.fallbackReason).toContain('無法連線');
  });
  it('逾時改用示意直線', async () => {
    const hang = (_: unknown, init?: RequestInit) =>
      new Promise<Response>((_res, rej) =>
        init?.signal?.addEventListener('abort', () =>
          rej(new DOMException('aborted', 'AbortError')),
        ),
      );
    const r = await planRoute(start, end, { fetchFn: hang as typeof fetch, timeoutMs: 20 });
    expect(r.source).toBe('straight');
    expect(r.fallbackReason).toContain('太慢');
  });
  it('回應格式錯誤改用示意直線', async () => {
    const r = await planRoute(start, end, {
      fetchFn: vi.fn().mockResolvedValue(jsonResponse({ code: 'NoRoute' })),
    });
    expect(r.source).toBe('straight');
  });
  it('台灣以外的地點不送出請求', async () => {
    const fetchFn = vi.fn();
    await expect(planRoute(start, [24.47, 118.13], { fetchFn })).rejects.toThrow('台灣');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
