import { describe, expect, it } from 'vitest';
import { isInMainlandChina, isInTaiwan, pointInRing } from './geo';

describe('pointInRing', () => {
  const square: [number, number][] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ];
  it('內外判斷', () => {
    expect(pointInRing(5, 5, square)).toBe(true);
    expect(pointInRing(15, 5, square)).toBe(false);
  });
});

describe('isInTaiwan', () => {
  it('台中南區、台北、高雄、花蓮在範圍內', () => {
    expect(isInTaiwan(24.12, 120.66)).toBe(true);
    expect(isInTaiwan(25.033, 121.565)).toBe(true);
    expect(isInTaiwan(22.627, 120.301)).toBe(true);
    expect(isInTaiwan(23.976, 121.604)).toBe(true);
  });
  it('金門、馬祖、澎湖在範圍內', () => {
    expect(isInTaiwan(24.432, 118.318)).toBe(true); // 金門金城
    expect(isInTaiwan(26.16, 119.95)).toBe(true); // 馬祖南竿
    expect(isInTaiwan(23.57, 119.58)).toBe(true); // 澎湖馬公
  });
  it('中國大陸（廈門、福州、泉州）不在範圍內', () => {
    expect(isInTaiwan(24.47, 118.13)).toBe(false);
    expect(isInTaiwan(26.07, 119.3)).toBe(false);
    expect(isInTaiwan(24.91, 118.59)).toBe(false);
    expect(isInMainlandChina(24.47, 118.13)).toBe(true);
  });
  it('東京、香港不在範圍內', () => {
    expect(isInTaiwan(35.68, 139.69)).toBe(false);
    expect(isInTaiwan(22.32, 114.17)).toBe(false);
  });
  it('無效數字不在範圍內', () => {
    expect(isInTaiwan(Number.NaN, 120)).toBe(false);
    expect(isInTaiwan(24, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
