// 由 Natural Earth 1:10m 國界資料（world-atlas 套件，公有領域）產生「中國大陸遮罩」。
// 只保留台灣周邊範圍內的部分，輸出到 src/data/chinaMask.json。
// 用法：node scripts/gen-mask.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';

const CLIP = { south: 16, north: 32, west: 110, east: 126 };

const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-10m.json', 'utf8'));
const china = feature(topo, topo.objects.countries).features.find(
  (f) => f.properties.name === 'China',
);
if (!china) throw new Error('找不到 China');

/** Sutherland–Hodgman：把多邊形裁切到矩形範圍內。點的格式為 [lng, lat] */
function clipRing(ring) {
  const edges = [
    (p) => p[0] >= CLIP.west,
    (p) => p[0] <= CLIP.east,
    (p) => p[1] >= CLIP.south,
    (p) => p[1] <= CLIP.north,
  ];
  const cut = [
    (a, b) => intersect(a, b, 0, CLIP.west),
    (a, b) => intersect(a, b, 0, CLIP.east),
    (a, b) => intersect(a, b, 1, CLIP.south),
    (a, b) => intersect(a, b, 1, CLIP.north),
  ];
  let out = ring;
  for (let e = 0; e < 4; e++) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const curIn = edges[e](cur);
      const prevIn = edges[e](prev);
      if (curIn) {
        if (!prevIn) out.push(cut[e](prev, cur));
        out.push(cur);
      } else if (prevIn) {
        out.push(cut[e](prev, cur));
      }
    }
    if (out.length === 0) break;
  }
  return out;
}

function intersect(a, b, axis, value) {
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

const round = (n) => Math.round(n * 10000) / 10000;

// 輸出為 Leaflet 使用的 [lat, lng] 格式，只取外圈（中國在此範圍內沒有需要的內圈）
const polygons = [];
for (const poly of china.geometry.coordinates) {
  const clipped = clipRing(poly[0]);
  if (clipped.length < 3) continue;
  const ring = [];
  for (const [lng, lat] of clipped) {
    const p = [round(lat), round(lng)];
    const last = ring[ring.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) ring.push(p);
  }
  if (ring.length >= 3) polygons.push(ring);
}

writeFileSync('src/data/chinaMask.json', JSON.stringify(polygons));
console.log(`polygons: ${polygons.length}, points: ${polygons.reduce((s, r) => s + r.length, 0)}`);
