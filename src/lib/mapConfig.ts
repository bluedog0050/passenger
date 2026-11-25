import { TAIWAN_BOUNDS } from './geo';

/**
 * 地圖底圖：CARTO Voyager（資料來自 OpenStreetMap，文字比 OSM 標準樣式少、不顯示門牌）。
 * 免費、不需帳號；限非商業使用，需標示 OpenStreetMap 與 CARTO。
 * {r} 在高解析度螢幕會自動換成 @2x 圖片。
 */
export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const TILE_SUBDOMAINS = ['a', 'b', 'c', 'd'];
export const TILE_MAX_ZOOM = 19;
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** 圖磚主機（給 CSP 使用） */
export const TILE_HOSTS = TILE_SUBDOMAINS.map((s) => `https://${s}.basemaps.cartocdn.com`);

export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [TAIWAN_BOUNDS.south, TAIWAN_BOUNDS.west],
  [TAIWAN_BOUNDS.north, TAIWAN_BOUNDS.east],
];
