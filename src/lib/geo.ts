import chinaMask from '../data/chinaMask.json';

/** 台灣範圍（含澎湖、金門、馬祖），見 docs/spec.md 4.1 */
export const TAIWAN_BOUNDS = {
  south: 21.5,
  west: 117.8,
  north: 26.6,
  east: 122.4,
} as const;

/** 無法定位時的預設畫面：台灣全島 */
export const TAIWAN_CENTER: [number, number] = [23.7, 120.9];
export const TAIWAN_ZOOM = 7;

/** 中國大陸陸地（台灣周邊範圍），每個多邊形為 [lat, lng] 點的陣列 */
export const CHINA_MASK = chinaMask as [number, number][][];

/** 射線法判斷點是否在多邊形內 */
export function pointInRing(lat: number, lng: number, ring: readonly [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i]!;
    const [yj, xj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function isInMainlandChina(lat: number, lng: number): boolean {
  return CHINA_MASK.some((ring) => pointInRing(lat, lng, ring));
}

/** 在台灣範圍內（含澎湖、金門、馬祖），且不在中國大陸陸地上 */
export function isInTaiwan(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const inBox =
    lat >= TAIWAN_BOUNDS.south &&
    lat <= TAIWAN_BOUNDS.north &&
    lng >= TAIWAN_BOUNDS.west &&
    lng <= TAIWAN_BOUNDS.east;
  return inBox && !isInMainlandChina(lat, lng);
}
