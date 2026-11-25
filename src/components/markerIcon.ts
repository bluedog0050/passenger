import L from 'leaflet';
import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../types';

/**
 * 每個類別一個大頭針圖示。內容只來自 categories.ts 的固定常數，
 * 不含任何使用者輸入，所以可以安全地用 html 字串產生。
 */
function pinHtml(color: string, emoji: string, selected: boolean): string {
  const size = selected ? 48 : 38;
  return `<svg viewBox="0 0 38 38" width="${size}" height="${size}" style="display:block;overflow:visible;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">
  <path d="M19 37C19 37 4 23.5 4 14.5a15 15 0 0 1 30 0C34 23.5 19 37 19 37z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
  <circle cx="19" cy="14.5" r="10" fill="#fff"/>
  <text x="19" y="15" text-anchor="middle" dominant-baseline="central" font-size="12">${emoji}</text>
</svg>`;
}

function makeIcon(color: string, emoji: string, selected: boolean): L.DivIcon {
  const size = selected ? 48 : 38;
  return L.divIcon({
    className: 'report-pin',
    html: pinHtml(color, emoji, selected),
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 1],
  });
}

const cache = new Map<string, L.DivIcon>();

export function getMarkerIcon(category: CategoryId, selected = false): L.DivIcon {
  const key = `${category}:${selected}`;
  let icon = cache.get(key);
  if (!icon) {
    const c = CATEGORIES.find((x) => x.id === category) ?? CATEGORIES[CATEGORIES.length - 1]!;
    icon = makeIcon(c.color, c.emoji, selected);
    cache.set(key, icon);
  }
  return icon;
}
