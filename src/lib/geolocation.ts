import { useCallback, useEffect, useRef, useState } from 'react';
import { isInTaiwan } from './geo';

export type GeoState =
  | { status: 'locating' }
  | { status: 'found'; lat: number; lng: number; accuracy: number; fixId: number }
  | { status: 'denied' | 'unavailable' | 'timeout' | 'outside' };

export type GeoFailure = Exclude<GeoState['status'], 'locating' | 'found'>;

/** 定位失敗時給使用者看的訊息 */
export const GEO_MESSAGES: Record<GeoFailure, string> = {
  denied: '定位權限未開啟，已顯示台灣全區。可到瀏覽器設定允許定位。',
  unavailable: '無法取得你的位置，已顯示台灣全區。',
  timeout: '定位逾時，已顯示台灣全區。可稍後按右下角按鈕再試一次。',
  outside: '你目前不在台灣範圍內，已顯示台灣全區。',
};

/** GeolocationPositionError 的 code：1 拒絕、2 無法取得、3 逾時 */
export function errorCodeToStatus(code: number): GeoFailure {
  if (code === 1) return 'denied';
  if (code === 3) return 'timeout';
  return 'unavailable';
}

const OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 };

/**
 * 取得使用者位置。位置只在瀏覽器裡使用，不會傳送到任何伺服器。
 * 開啟時自動定位一次；locate() 可再定位。
 */
export function useGeolocation(): { state: GeoState; locate: () => void } {
  const [state, setState] = useState<GeoState>({ status: 'locating' });
  const fixCount = useRef(0);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable' });
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!isInTaiwan(lat, lng)) {
          setState({ status: 'outside' });
          return;
        }
        fixCount.current += 1;
        setState({ status: 'found', lat, lng, accuracy, fixId: fixCount.current });
      },
      (err) => setState({ status: errorCodeToStatus(err.code) }),
      OPTIONS,
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { state, locate };
}
