/**
 * 網站會連到的外部主機，只在這裡定義。
 * vite.config.ts 用它產生內容安全政策（CSP），程式也從這裡取用，確保兩邊一致。
 */
export const TILE_HOST = 'https://tile.openstreetmap.org';
/** OSRM 公益步行路線服務（不需金鑰、不需註冊） */
export const ROUTING_HOST = 'https://routing.openstreetmap.de';

export function buildCsp(): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    // Leaflet 會用 inline style 定位地圖圖塊
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${TILE_HOST}`,
    `connect-src 'self' ${ROUTING_HOST}`,
    "font-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
