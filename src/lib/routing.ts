import { ROUTING_HOST } from './csp';
import { isInTaiwan } from './geo';
import { haversine, lineLength, type LatLngTuple } from './routeGeometry';

/** 回應中的座標點數上限，避免異常資料拖慢手機 */
const MAX_POINTS = 20_000;
export const ROUTING_TIMEOUT_MS = 10_000;

export interface RouteResult {
  /** 路線座標 [lat, lng] */
  line: LatLngTuple[];
  /** 公尺 */
  distance: number;
  /** osrm：實際步行路線；straight：示意直線 */
  source: 'osrm' | 'straight';
  /** 改用示意直線的原因（給使用者看） */
  fallbackReason?: string;
}

/**
 * 驗證 OSRM 回應格式，只取出需要的欄位。格式不對回傳 null。
 * OSRM 座標是 [lng, lat]，這裡轉成 [lat, lng]。
 */
export function parseOsrmResponse(json: unknown): { line: LatLngTuple[]; distance: number } | null {
  if (typeof json !== 'object' || json === null) return null;
  const j = json as { code?: unknown; routes?: unknown };
  if (j.code !== 'Ok' || !Array.isArray(j.routes) || j.routes.length === 0) return null;
  const route = j.routes[0] as { geometry?: unknown; distance?: unknown };
  const geometry = route.geometry as { type?: unknown; coordinates?: unknown } | undefined;
  if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates))
    return null;
  const coords = geometry.coordinates;
  if (coords.length < 2 || coords.length > MAX_POINTS) return null;

  const line: LatLngTuple[] = [];
  for (const c of coords) {
    if (
      !Array.isArray(c) ||
      typeof c[0] !== 'number' ||
      typeof c[1] !== 'number' ||
      !Number.isFinite(c[0]) ||
      !Number.isFinite(c[1])
    ) {
      return null;
    }
    line.push([c[1], c[0]]);
  }
  const distance =
    typeof route.distance === 'number' && Number.isFinite(route.distance) && route.distance >= 0
      ? route.distance
      : lineLength(line);
  return { line, distance };
}

export function straightRoute(start: LatLngTuple, end: LatLngTuple, reason?: string): RouteResult {
  return {
    line: [start, end],
    distance: haversine(start, end),
    source: 'straight',
    fallbackReason: reason,
  };
}

export function osrmUrl(start: LatLngTuple, end: LatLngTuple): string {
  const fmt = (p: LatLngTuple) => `${p[1].toFixed(6)},${p[0].toFixed(6)}`;
  return `${ROUTING_HOST}/routed-foot/route/v1/foot/${fmt(start)};${fmt(end)}?overview=full&geometries=geojson`;
}

/**
 * 規劃步行路線：先向 OSRM 公益服務取得實際路線，失敗時改用示意直線。
 * 只傳送起點與目的地座標，不傳送其他資料。
 */
export async function planRoute(
  start: LatLngTuple,
  end: LatLngTuple,
  options: { signal?: AbortSignal; timeoutMs?: number; fetchFn?: typeof fetch } = {},
): Promise<RouteResult> {
  if (!isInTaiwan(start[0], start[1]) || !isInTaiwan(end[0], end[1])) {
    throw new Error('起點和目的地都必須在台灣範圍內');
  }
  const { signal, timeoutMs = ROUTING_TIMEOUT_MS, fetchFn = fetch } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetchFn(osrmUrl(start, end), {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'strict-origin',
    });
    if (!res.ok) {
      return straightRoute(start, end, '路線服務暫時無法使用，已顯示示意直線');
    }
    const parsed = parseOsrmResponse(await res.json());
    if (!parsed) return straightRoute(start, end, '找不到步行路線，已顯示示意直線');
    return { ...parsed, source: 'osrm' };
  } catch (err) {
    if (signal?.aborted) throw err; // 使用者取消，不需要結果
    const timedOut = controller.signal.aborted;
    return straightRoute(
      start,
      end,
      timedOut ? '路線服務回應太慢，已顯示示意直線' : '無法連線到路線服務，已顯示示意直線',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
