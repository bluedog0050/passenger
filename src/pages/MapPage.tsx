import L from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import ChinaMask from '../components/ChinaMask';
import Legend from '../components/Legend';
import ReportSheet from '../components/ReportSheet';
import Toast from '../components/Toast';
import { getMarkerIcon } from '../components/markerIcon';
import { getSampleReports } from '../data/samples';
import { TAIWAN_BOUNDS, TAIWAN_CENTER, TAIWAN_ZOOM } from '../lib/geo';
import { GEO_MESSAGES, useGeolocation, type GeoState } from '../lib/geolocation';
import { navigate } from '../lib/router';
import type { ReportView } from '../types';

const maxBounds: [[number, number], [number, number]] = [
  [TAIWAN_BOUNDS.south, TAIWAN_BOUNDS.west],
  [TAIWAN_BOUNDS.north, TAIWAN_BOUNDS.east],
];

const USER_ZOOM = 16;

/** 定位成功時把地圖移過去；點地圖空白處關閉卡片 */
function MapController({ geo, onMapClick }: { geo: GeoState; onMapClick: () => void }) {
  const map = useMap();
  const fixId = geo.status === 'found' ? geo.fixId : 0;

  useEffect(() => {
    if (geo.status !== 'found') return;
    map.flyTo([geo.lat, geo.lng], Math.max(map.getZoom(), USER_ZOOM), { duration: 1 });
    // 只在新的定位結果時移動，避免使用者拖曳地圖後被拉回來
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixId, map]);

  useMapEvents({ click: onMapClick });
  return null;
}

/** 選取回報點時，把它移到卡片上方看得到的位置 */
function PanToSelected({ report }: { report: ReportView | null }) {
  const map = useMap();
  useEffect(() => {
    if (!report) return;
    const zoom = Math.max(map.getZoom(), 15);
    const point = map.project([report.lat, report.lng], zoom);
    const offsetY = map.getSize().y * 0.25;
    map.flyTo(map.unproject(point.add([0, offsetY]), zoom), zoom, { duration: 0.6 });
  }, [report, map]);
  return null;
}

export default function MapPage() {
  // 階段 3-1 只有範例資料；階段 3-2 會再加上使用者自己的回報
  const reports = useMemo(() => getSampleReports(), []);
  const { state: geo, locate } = useGeolocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);
  const tileRef = useRef<L.TileLayer>(null);

  const selected = reports.find((r) => r.id === selectedId) ?? null;

  // 定位失敗時提示一次
  useEffect(() => {
    if (geo.status !== 'locating' && geo.status !== 'found') setToast(GEO_MESSAGES[geo.status]);
  }, [geo.status]);

  const closeToast = useCallback(() => setToast(null), []);
  const closeSheet = useCallback(() => setSelectedId(null), []);

  const retryTiles = () => {
    setTileError(false);
    tileRef.current?.redraw();
  };

  return (
    <main className="relative h-full w-full overflow-hidden">
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
          ref={tileRef}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <ChinaMask />
        <MapController geo={geo} onMapClick={closeSheet} />
        <PanToSelected report={selected} />

        {geo.status === 'found' && (
          <>
            <Circle
              center={[geo.lat, geo.lng]}
              radius={Math.min(geo.accuracy, 500)}
              pathOptions={{ color: '#1A73E8', weight: 1, fillOpacity: 0.12 }}
              interactive={false}
            />
            <CircleMarker
              center={[geo.lat, geo.lng]}
              radius={8}
              pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#1A73E8', fillOpacity: 1 }}
              interactive={false}
            />
          </>
        )}

        {reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={getMarkerIcon(r.category, r.id === selectedId)}
            zIndexOffset={r.id === selectedId ? 1000 : 0}
            title={r.description}
            eventHandlers={{ click: () => setSelectedId(r.id) }}
          />
        ))}
      </MapContainer>

      {/* 頂部標題列 */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-2 px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex h-12 items-center gap-3 rounded-full bg-white px-4 shadow-md">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-7 w-7" />
          <h1 className="text-base font-bold">行人地獄</h1>
          <span className="truncate text-sm text-gray-500">即時人行道路況</span>
        </div>

        {/* 載入中：正在定位 */}
        {geo.status === 'locating' && (
          <div role="status" className="flex justify-center">
            <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-md">
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent"
              />
              正在取得位置…
            </p>
          </div>
        )}

        {/* 錯誤：地圖載入失敗 */}
        {tileError && (
          <div
            role="alert"
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-800 shadow-md"
          >
            <span>地圖載入失敗，請檢查網路</span>
            <button
              type="button"
              onClick={retryTiles}
              className="h-11 flex-none rounded-full bg-white px-4 font-medium text-red-700 shadow-sm active:bg-red-100"
            >
              重試
            </button>
          </div>
        )}

        {/* 沒有資料 */}
        {reports.length === 0 && (
          <div className="flex justify-center">
            <p className="rounded-full bg-white px-4 py-2 text-sm shadow-md">
              目前沒有回報，成為第一個回報的人吧！
            </p>
          </div>
        )}

        <Toast message={toast} onClose={closeToast} />
      </header>

      {/* 底部操作列：圖例、回報按鈕、回到我的位置 */}
      {!selected && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-end justify-between gap-2 px-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+16px))]">
          <Legend />
          <button
            type="button"
            onClick={() => navigate('report')}
            className="pointer-events-auto absolute bottom-[max(24px,calc(env(safe-area-inset-bottom)+12px))] left-1/2 flex h-14 -translate-x-1/2 items-center justify-center gap-1 rounded-full bg-brand px-6 text-lg font-bold text-white shadow-lg active:bg-brand-dark"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ＋
            </span>
            回報路況
          </button>
          <button
            type="button"
            onClick={locate}
            aria-label="回到我的位置"
            disabled={geo.status === 'locating'}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="#1A73E8" />
              <path
                d="M12 2v3M12 19v3M2 12h3M19 12h3"
                stroke="#1A73E8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="7" fill="none" stroke="#1A73E8" strokeWidth="2" />
            </svg>
          </button>
        </div>
      )}

      {selected && <ReportSheet report={selected} onClose={closeSheet} />}
    </main>
  );
}
