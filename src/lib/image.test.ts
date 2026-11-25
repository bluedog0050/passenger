import { describe, expect, it } from 'vitest';
import { fitWithin, hasExifSegment } from './image';

describe('fitWithin', () => {
  it('大照片等比例縮小到長邊 1280', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 960, height: 1280 });
  });
  it('小照片不放大', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

/** 組出一個最小的 JPEG 檔頭，可選擇是否含 EXIF */
function jpeg(withExif: boolean): Uint8Array {
  const soi = [0xff, 0xd8];
  const app0 = [0xff, 0xe0, 0x00, 0x07, 0x4a, 0x46, 0x49, 0x46, 0x00]; // JFIF
  const app1 = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // Exif\0\0
  const sos = [0xff, 0xda, 0x00, 0x02];
  return new Uint8Array([...soi, ...app0, ...(withExif ? app1 : []), ...sos, 0x00, 0xff, 0xd9]);
}

describe('hasExifSegment', () => {
  it('偵測到 EXIF', () => {
    expect(hasExifSegment(jpeg(true))).toBe(true);
  });
  it('沒有 EXIF', () => {
    expect(hasExifSegment(jpeg(false))).toBe(false);
  });
  it('不是 JPEG', () => {
    expect(hasExifSegment(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });
});
