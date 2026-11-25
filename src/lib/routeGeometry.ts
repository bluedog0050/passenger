/** 路線計算用的幾何工具。座標一律為 [lat, lng]。 */
export type LatLngTuple = [number, number];

const EARTH_RADIUS = 6_371_000; // 公尺
const toRad = (d: number) => (d * Math.PI) / 180;

/** 兩點之間的距離（公尺） */
export function haversine(a: LatLngTuple, b: LatLngTuple): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 路線總長（公尺） */
export function lineLength(line: readonly LatLngTuple[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += haversine(line[i - 1]!, line[i]!);
  return total;
}

/**
 * 點到路線的最短距離，以及最近點距離起點多遠（沿著路線算）。
 * 在小範圍內把經緯度當成平面座標計算（誤差在幾公尺內，足夠示意用）。
 */
export function nearestOnLine(
  point: LatLngTuple,
  line: readonly LatLngTuple[],
): { distance: number; along: number } {
  if (line.length === 0) return { distance: Infinity, along: 0 };
  if (line.length === 1) return { distance: haversine(point, line[0]!), along: 0 };

  const mPerDegLat = (Math.PI * EARTH_RADIUS) / 180;
  const mPerDegLng = mPerDegLat * Math.cos(toRad(point[0]));
  const xy = (p: LatLngTuple) => [(p[1] - point[1]) * mPerDegLng, (p[0] - point[0]) * mPerDegLat];

  let best = { distance: Infinity, along: 0 };
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const [ax, ay] = xy(a) as [number, number];
    const [bx, by] = xy(b) as [number, number];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    // 點（原點）投影到線段上的位置，限制在 0~1 之間
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d = Math.hypot(px, py);
    const segLen = haversine(a, b);
    if (d < best.distance) best = { distance: d, along: walked + t * segLen };
    walked += segLen;
  }
  return best;
}

export interface AlongRouteItem<T> {
  item: T;
  /** 距起點的距離（公尺） */
  along: number;
  /** 離路線多遠（公尺） */
  offset: number;
}

/** 找出路線兩側 threshold 公尺內的點，依距起點的距離排序 */
export function findAlongRoute<T extends { lat: number; lng: number }>(
  items: readonly T[],
  line: readonly LatLngTuple[],
  threshold = 30,
): AlongRouteItem<T>[] {
  return items
    .map((item) => {
      const n = nearestOnLine([item.lat, item.lng], line);
      return { item, along: n.along, offset: n.distance };
    })
    .filter((x) => x.offset <= threshold)
    .sort((a, b) => a.along - b.along);
}

/** 預估步行時間（分鐘），以每分鐘 80 公尺計算，至少 1 分鐘 */
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

/** 顯示距離，例如 850 公尺、1.2 公里 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} 公尺`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}
