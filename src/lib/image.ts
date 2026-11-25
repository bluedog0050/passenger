/** 照片長邊最大像素 */
export const MAX_EDGE = 1280;
export const JPEG_QUALITY = 0.8;

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

/** 等比例縮小到長邊不超過 max（不放大） */
export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * 檢查 JPEG 內是否有 EXIF（APP1 "Exif"）區段。
 * EXIF 可能包含拍攝的 GPS 位置、手機型號等個人資訊。
 */
export function hasExifSegment(bytes: Uint8Array): boolean {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false; // 不是 JPEG
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return false;
    const marker = bytes[i + 1]!;
    if (marker === 0xda || marker === 0xd9) return false; // 影像資料開始 / 結束
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (
      marker === 0xe1 &&
      bytes[i + 4] === 0x45 && // E
      bytes[i + 5] === 0x78 && // x
      bytes[i + 6] === 0x69 && // i
      bytes[i + 7] === 0x66 // f
    ) {
      return true;
    }
    i += 2 + length;
  }
  return false;
}

async function decode(
  file: Blob,
): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  // createImageBitmap 會依照 EXIF 方向自動轉正
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // 某些瀏覽器不支援用 createImageBitmap 解碼 HEIC，改用 <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 處理使用者的照片：縮小、轉成 JPEG，並移除 EXIF（含 GPS 位置）。
 * 原理：把照片畫到 canvas 再重新輸出，新檔案只有像素，不會帶任何附加資訊。
 */
export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  let decoded;
  try {
    decoded = await decode(file);
  } catch {
    throw new Error('無法讀取這張照片，請改用 JPG 或 PNG 格式');
  }
  const { width, height } = fitWithin(decoded.width, decoded.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('照片處理失敗，請再試一次');
  ctx.fillStyle = '#FFFFFF'; // PNG 透明背景轉 JPEG 時用白色
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(decoded.source, 0, 0, width, height);
  decoded.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('照片處理失敗，請再試一次');

  // 再確認一次輸出檔沒有 EXIF，保護使用者隱私
  if (hasExifSegment(new Uint8Array(await blob.arrayBuffer()))) {
    throw new Error('照片處理失敗，請再試一次');
  }
  return { blob, width, height };
}
