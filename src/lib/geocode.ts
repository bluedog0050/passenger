import { GEOCODE_HOST } from './csp';
import { isInTaiwan } from './geo';

/**
 * 地址查詢（Nominatim）。
 * 使用規範：每秒最多 1 次、不可邊打字邊查詢（只在使用者按「搜尋」時查詢）、需標示 OpenStreetMap。
 * 只傳送使用者輸入的地址文字，不傳送其他資料。
 */

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export const MIN_QUERY = 2;
export const MAX_QUERY = 100;
const MAX_RESULTS = 5;
const MIN_INTERVAL_MS = 1100;
export const GEOCODE_TIMEOUT_MS = 10_000;

export class GeocodeError extends Error {}

export const GEOCODE_MESSAGES = {
  tooShort: `請輸入至少 ${MIN_QUERY} 個字`,
  tooLong: `地址最多 ${MAX_QUERY} 個字`,
  notFound: '找不到這個地址，請換個寫法（例如只輸入路名或地標），或改用拖曳地圖選擇',
  unavailable: '地址查詢服務暫時無法使用，請改用拖曳地圖選擇',
} as const;

/** 驗證 Nominatim 回應，只保留台灣範圍內、格式正確的結果 */
export function parseGeocodeResponse(json: unknown): GeocodeResult[] | null {
  if (!Array.isArray(json)) return null;
  const results: GeocodeResult[] = [];
  for (const item of json.slice(0, 20)) {
    if (typeof item !== 'object' || item === null) continue;
    const v = item as { lat?: unknown; lon?: unknown; display_name?: unknown };
    const lat = typeof v.lat === 'string' ? Number(v.lat) : NaN;
    const lng = typeof v.lon === 'string' ? Number(v.lon) : NaN;
    if (typeof v.display_name !== 'string' || !isInTaiwan(lat, lng)) continue;
    results.push({ label: v.display_name.slice(0, 200), lat, lng });
    if (results.length >= MAX_RESULTS) break;
  }
  return results;
}

export function geocodeUrl(query: string): string {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    countrycodes: 'tw',
    limit: String(MAX_RESULTS),
    'accept-language': 'zh-TW',
  });
  return `${GEOCODE_HOST}/search?${params.toString()}`;
}

// 簡單的節流與快取：同一個查詢不重複送出，兩次查詢至少間隔 1.1 秒
let lastRequestAt = 0;
const cache = new Map<string, GeocodeResult[]>();

/** 測試用：重設節流與快取 */
export function resetGeocodeState(): void {
  lastRequestAt = 0;
  cache.clear();
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });

/** 搜尋地址；失敗時丟出 GeocodeError（訊息可直接顯示給使用者） */
export async function searchAddress(
  rawQuery: string,
  options: { signal?: AbortSignal; fetchFn?: typeof fetch; timeoutMs?: number } = {},
): Promise<GeocodeResult[]> {
  const query = rawQuery.trim().replace(/\s+/g, ' ');
  if (query.length < MIN_QUERY) throw new GeocodeError(GEOCODE_MESSAGES.tooShort);
  if (query.length > MAX_QUERY) throw new GeocodeError(GEOCODE_MESSAGES.tooLong);

  const cached = cache.get(query);
  if (cached) {
    if (cached.length === 0) throw new GeocodeError(GEOCODE_MESSAGES.notFound);
    return cached;
  }

  const { signal, fetchFn = fetch, timeoutMs = GEOCODE_TIMEOUT_MS } = options;
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait, signal);
  lastRequestAt = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetchFn(geocodeUrl(query), {
      signal: controller.signal,
      credentials: 'omit',
      // 依 Nominatim 規範，讓瀏覽器送出網站來源（Referer）以識別應用程式
      referrerPolicy: 'strict-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new GeocodeError(GEOCODE_MESSAGES.unavailable);
    const parsed = parseGeocodeResponse(await res.json());
    if (!parsed) throw new GeocodeError(GEOCODE_MESSAGES.unavailable);
    cache.set(query, parsed);
    if (parsed.length === 0) throw new GeocodeError(GEOCODE_MESSAGES.notFound);
    return parsed;
  } catch (err) {
    if (signal?.aborted) throw err;
    if (err instanceof GeocodeError) throw err;
    throw new GeocodeError(GEOCODE_MESSAGES.unavailable);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
