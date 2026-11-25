// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TILE_ATTRIBUTION, TILE_HOSTS, TILE_SUBDOMAINS, TILE_URL } from '../src/lib/mapConfig';

describe('mapConfig', () => {
  it('CSP 允許所有圖磚主機，且不再允許舊的 OSM 主機', () => {
    const config = readFileSync('vite.config.ts', 'utf8');
    for (const host of TILE_HOSTS) expect(config).toContain(host);
    expect(config).not.toContain('tile.openstreetmap.org');
  });
  it('圖磚網址使用設定的子網域', () => {
    expect(TILE_URL).toContain('{s}.basemaps.cartocdn.com');
    expect(TILE_SUBDOMAINS).toHaveLength(TILE_HOSTS.length);
  });
  it('標示 OpenStreetMap 與 CARTO 來源', () => {
    expect(TILE_ATTRIBUTION).toContain('OpenStreetMap');
    expect(TILE_ATTRIBUTION).toContain('CARTO');
  });
});
