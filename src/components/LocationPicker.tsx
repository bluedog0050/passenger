import { useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { DEFAULT_CENTER } from '../lib/geo';
import { MAX_BOUNDS, TILE_ATTRIBUTION, TILE_URL } from '../lib/mapConfig';
import ChinaMask from './ChinaMask';

export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  /** 地圖中心改變時回報；byUser 表示是使用者拖曳造成的 */
  onChange: (pos: LatLng, byUser: boolean) => void;
  invalid?: boolean;
  describedBy?: string;
}

const PICK_ZOOM = 17;

function Controller({ onChange }: Pick<Props, 'onChange'>) {
  const map = useMap();
  const userMoved = useRef(false);

  useMapEvents({
    dragstart: () => {
      userMoved.current = true;
    },
    // 拖曳或縮放結束時，地圖中心就是回報地點
    moveend: () => {
      const c = map.getCenter();
      onChange({ lat: c.lat, lng: c.lng }, userMoved.current);
    },
  });
  return null;
}

/** 選擇地點：預設在國立中興大學，中央固定一根大頭針，拖曳地圖來對準位置（不使用 GPS 定位） */
export default function LocationPicker({ onChange, invalid, describedBy }: Props) {
  return (
    <div
      className={`relative h-60 overflow-hidden rounded-2xl border-2 ${invalid ? 'border-red-600' : 'border-transparent'}`}
      aria-describedby={describedBy}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={PICK_ZOOM}
        minZoom={7}
        maxZoom={19}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        scrollWheelZoom="center"
        touchZoom="center"
        doubleClickZoom="center"
        className="h-full w-full"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
        <ChinaMask />
        <Controller onChange={onChange} />
      </MapContainer>

      {/* 固定在中央的大頭針，針尖對準地圖中心 */}
      <svg
        viewBox="0 0 38 38"
        width="44"
        height="44"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full drop-shadow-md"
      >
        <path
          d="M19 37C19 37 4 23.5 4 14.5a15 15 0 0 1 30 0C34 23.5 19 37 19 37z"
          fill="#F57C00"
          stroke="#fff"
          strokeWidth="2.5"
        />
        <circle cx="19" cy="14.5" r="5" fill="#fff" />
      </svg>
    </div>
  );
}
