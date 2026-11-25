import { describe, expect, it } from 'vitest';
import { isInTaiwan } from './geo';

describe('isInTaiwan', () => {
  it('台中南區在範圍內', () => {
    expect(isInTaiwan(24.12, 120.66)).toBe(true);
  });
  it('金門、馬祖、澎湖在範圍內', () => {
    expect(isInTaiwan(24.44, 118.32)).toBe(true);
    expect(isInTaiwan(26.16, 119.95)).toBe(true);
    expect(isInTaiwan(23.57, 119.58)).toBe(true);
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
