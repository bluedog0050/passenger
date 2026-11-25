import { describe, expect, it } from 'vitest';
import { errorCodeToStatus } from './geolocation';

describe('errorCodeToStatus', () => {
  it('對應瀏覽器的錯誤代碼', () => {
    expect(errorCodeToStatus(1)).toBe('denied');
    expect(errorCodeToStatus(2)).toBe('unavailable');
    expect(errorCodeToStatus(3)).toBe('timeout');
    expect(errorCodeToStatus(99)).toBe('unavailable');
  });
});
