import { TAIWAN_BOUNDS } from './geo';

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [TAIWAN_BOUNDS.south, TAIWAN_BOUNDS.west],
  [TAIWAN_BOUNDS.north, TAIWAN_BOUNDS.east],
];
