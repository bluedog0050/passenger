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

export function isInTaiwan(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= TAIWAN_BOUNDS.south &&
    lat <= TAIWAN_BOUNDS.north &&
    lng >= TAIWAN_BOUNDS.west &&
    lng <= TAIWAN_BOUNDS.east
  );
}
