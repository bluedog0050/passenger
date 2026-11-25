import { describe, expect, it } from 'vitest';
import {
  findAlongRoute,
  formatDistance,
  haversine,
  lineLength,
  nearestOnLine,
  walkingMinutes,
  type LatLngTuple,
} from './routeGeometry';

// 緯度 0.001 度約 111 公尺
const line: LatLngTuple[] = [
  [24.12, 120.67],
  [24.122, 120.67],
  [24.122, 120.672],
];

describe('haversine / lineLength', () => {
  it('緯度差 0.001 度約 111 公尺', () => {
    expect(haversine([24.12, 120.67], [24.121, 120.67])).toBeCloseTo(111.2, 0);
  });
  it('路線總長為各段相加', () => {
    expect(lineLength(line)).toBeCloseTo(
      haversine(line[0]!, line[1]!) + haversine(line[1]!, line[2]!),
      6,
    );
  });
});

describe('nearestOnLine', () => {
  it('在路線上的點距離為 0，沿線距離正確', () => {
    const r = nearestOnLine([24.121, 120.67], line);
    expect(r.distance).toBeLessThan(0.5);
    expect(r.along).toBeCloseTo(111.2, 0);
  });
  it('路線旁 20 公尺的點', () => {
    const r = nearestOnLine([24.121, 120.6702], line); // 經度 0.0002 度約 20 公尺
    expect(r.distance).toBeGreaterThan(18);
    expect(r.distance).toBeLessThan(23);
  });
});

describe('findAlongRoute', () => {
  const items = [
    { id: 'far', lat: 24.121, lng: 120.675 },
    { id: 'second', lat: 24.1221, lng: 120.671 },
    { id: 'first', lat: 24.1205, lng: 120.67005 },
  ];
  it('只留 30 公尺內的點，並依距起點排序', () => {
    expect(findAlongRoute(items, line).map((x) => x.item.id)).toEqual(['first', 'second']);
  });
  it('兩點直線也能使用', () => {
    expect(findAlongRoute(items, [line[0]!, line[1]!]).map((x) => x.item.id)).toEqual(['first']);
  });
});

describe('walkingMinutes / formatDistance', () => {
  it('每分鐘 80 公尺，至少 1 分鐘', () => {
    expect(walkingMinutes(800)).toBe(10);
    expect(walkingMinutes(10)).toBe(1);
  });
  it('距離顯示', () => {
    expect(formatDistance(850.4)).toBe('850 公尺');
    expect(formatDistance(1234)).toBe('1.2 公里');
  });
});
