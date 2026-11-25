import { MapContainer, TileLayer } from 'react-leaflet';
import { TAIWAN_BOUNDS, TAIWAN_CENTER, TAIWAN_ZOOM } from '../lib/geo';
import { navigate } from '../lib/router';

const maxBounds: [[number, number], [number, number]] = [
  [TAIWAN_BOUNDS.south, TAIWAN_BOUNDS.west],
  [TAIWAN_BOUNDS.north, TAIWAN_BOUNDS.east],
];

export default function MapPage() {
  return (
    <main className="relative h-full w-full">
      <MapContainer
        center={TAIWAN_CENTER}
        zoom={TAIWAN_ZOOM}
        minZoom={7}
        maxZoom={19}
        maxBounds={maxBounds}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
      </MapContainer>

      {/* 頂部標題列（類似 Google Maps 的浮動搜尋列） */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex h-12 items-center gap-3 rounded-full bg-white px-4 shadow-md">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-7 w-7" />
          <h1 className="text-base font-bold">行人地獄</h1>
          <span className="truncate text-sm text-gray-500">即時人行道路況</span>
        </div>
      </header>

      {/* 回報路況浮動按鈕 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center pb-[max(24px,calc(env(safe-area-inset-bottom)+12px))]">
        <button
          type="button"
          onClick={() => navigate('report')}
          className="pointer-events-auto flex h-14 min-w-44 items-center justify-center gap-2 rounded-full bg-brand px-6 text-lg font-bold text-white shadow-lg active:bg-brand-dark"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            ＋
          </span>
          回報路況
        </button>
      </div>
    </main>
  );
}
