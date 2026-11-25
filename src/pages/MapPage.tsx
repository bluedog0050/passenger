import L from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import ChinaMask from '../components/ChinaMask';
import Legend from '../components/Legend';
import NavigationPanel from '../components/NavigationPanel';
import ReportSheet from '../components/ReportSheet';
import Toast from '../components/Toast';
import { getEndpointIcon, getMarkerIcon } from '../components/markerIcon';
import { DEFAULT_CENTER, DEFAULT_PLACE_NAME, DEFAULT_ZOOM } from '../lib/geo';
import { MAX_BOUNDS, TILE_ATTRIBUTION, TILE_URL } from '../lib/mapConfig';
import { clearCreatedFlash, peekCreatedFlash } from '../lib/flash';
import { findAlongRoute } from '../lib/routeGeometry';
import type { RouteResult } from '../lib/routing';
import { navigate } from '../lib/router';
import { useNavigation } from '../lib/useNavigation';
import { useReports } from '../lib/useReports';
import type { ReportView } from '../types';

/** 點地圖時通知外層；收到「回到預設地點」請求時移動地圖 */
function MapController({
  onMapClick,
  homeRequest,
}: {
  onMapClick: () => void;
  homeRequest: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (homeRequest > 0) map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
  }, [homeRequest, map]);
  useMapEvents({ click: onMapClick });
  return null;
}

/** 規劃出路線後，讓整條路線顯示在導航面板上方 */
function FitRoute({ result }: { result: RouteResult | null }) {
  const map = useMap();
  useEffect(() => {
    if (!result) return;
    const size = map.getSize();
    map.fitBounds(L.latLngBounds(result.line), {
      paddingTopLeft: [32, 100],
      paddingBottomRight: [32, size.y * 0.5 + 24],
      maxZoom: 17,
    });
  }, [result, map]);
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
  const { reports, status: loadStatus, remove } = useReports();
  // 剛從回報頁送出成功：選取新回報並顯示成功訊息
  const [createdId] = useState(peekCreatedFlash);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [homeRequest, setHomeRequest] = useState(0);
  const nav = useNavigation();
  const navActive = nav.state.phase !== 'off';
  const picking = nav.state.phase === 'pickStart' || nav.state.phase === 'pickEnd';
  const routeResult = nav.state.phase === 'done' ? nav.state.result : null;

  // 路線兩側 30 公尺內的回報
  const problems = useMemo(
    () => (routeResult ? findAlongRoute(reports, routeResult.line, 30) : []),
    [reports, routeResult],
  );

  useEffect(() => {
    clearCreatedFlash();
  }, []);

  useEffect(() => {
    if (!createdId || loadStatus !== 'ready') return;
    if (reports.some((r) => r.id === createdId)) {
      setSelectedId(createdId);
      setToast('回報成功！已顯示在地圖上');
    }
    // 只在載入完成時執行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdId, loadStatus]);

  useEffect(() => {
    if (loadStatus === 'error') setToast('無法讀取你先前的回報，請重新整理頁面');
  }, [loadStatus]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除這筆回報嗎？刪除後無法復原。')) return;
    setDeleting(true);
    try {
      await remove(id);
      setSelectedId(null);
      setToast('已刪除回報');
    } catch {
      setToast('刪除失敗，請稍後再試');
    } finally {
      setDeleting(false);
    }
  };
  const [tileError, setTileError] = useState(false);
  const tileRef = useRef<L.TileLayer>(null);

  const selected = reports.find((r) => r.id === selectedId) ?? null;

  const closeToast = useCallback(() => setToast(null), []);
  const closeSheet = useCallback(() => setSelectedId(null), []);

  // 點地圖空白處關閉卡片
  const onMapClick = () => setSelectedId(null);

  // 導航：以畫面中央圖釘（地圖中心）的位置確定起點或終點
  const mapRef = useRef<L.Map>(null);
  const moveToAddress = (r: { lat: number; lng: number }) => {
    mapRef.current?.setView([r.lat, r.lng], 17);
    setToast('已移到搜尋結果，確認圖釘位置後按「確定」');
  };
  const confirmCenter = () => {
    const c = mapRef.current?.getCenter();
    if (c) nav.confirmPoint([c.lat, c.lng]);
  };

  const openNavigation = () => {
    setSelectedId(null);
    nav.open();
  };

  const retryTiles = () => {
    setTileError(false);
    tileRef.current?.redraw();
  };

  return (
    <main className="relative h-full w-full overflow-hidden">
      <MapContainer
        ref={mapRef}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={7}
        maxZoom={19}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          ref={tileRef}
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <ChinaMask />
        <MapController onMapClick={onMapClick} homeRequest={homeRequest} />
        <FitRoute result={routeResult} />

        {routeResult && (
          <Polyline
            positions={routeResult.line}
            interactive={false}
            pathOptions={{
              color: '#1A73E8',
              weight: 6,
              opacity: 0.85,
              dashArray: routeResult.source === 'straight' ? '10 10' : undefined,
            }}
          />
        )}
        {navActive && nav.state.start && (
          <Marker position={nav.state.start} icon={getEndpointIcon('start')} interactive={false} />
        )}
        {navActive && nav.state.end && (
          <Marker position={nav.state.end} icon={getEndpointIcon('end')} interactive={false} />
        )}
        <PanToSelected report={selected} />

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

        {/* 載入中：讀取這台裝置上的回報 */}
        {loadStatus === 'loading' && (
          <div role="status" className="flex justify-center">
            <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-md">
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent"
              />
              載入回報中…
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
        {loadStatus === 'ready' && reports.length === 0 && (
          <div className="flex justify-center">
            <p className="rounded-full bg-white px-4 py-2 text-sm shadow-md">
              目前沒有回報，成為第一個回報的人吧！
            </p>
          </div>
        )}

        <Toast message={toast} onClose={closeToast} />
      </header>

      {/* 底部操作區（導航中隱藏）：上排圖例、回到預設地點；下排回報路況、導航 */}
      {!selected && !navActive && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] space-y-3 px-4 pb-[max(24px,calc(env(safe-area-inset-bottom)+12px))]">
          <div className="flex items-end justify-between">
            <Legend />
            <button
              type="button"
              onClick={() => setHomeRequest((n) => n + 1)}
              aria-label={`回到${DEFAULT_PLACE_NAME}`}
              title={`回到${DEFAULT_PLACE_NAME}`}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:bg-gray-100"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <path
                  d="M4 11l8-7 8 7M6 9.5V20h4.5v-5h3v5H18V9.5"
                  fill="none"
                  stroke="#1A73E8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('report')}
              className="pointer-events-auto flex h-14 items-center justify-center gap-1 rounded-full bg-brand text-lg font-bold text-white shadow-lg active:bg-brand-dark"
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                ＋
              </span>
              回報路況
            </button>
            <button
              type="button"
              onClick={openNavigation}
              className="pointer-events-auto flex h-14 items-center justify-center gap-1.5 rounded-full border-2 border-brand bg-white text-lg font-bold text-brand shadow-lg active:bg-orange-50"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M12 2l7 19-7-4-7 4z" fill="currentColor" />
              </svg>
              導航
            </button>
          </div>
        </div>
      )}

      {/* 導航選點：固定在畫面中央的圖釘，針尖對準地圖中心 */}
      {picking && (
        <svg
          viewBox="0 0 38 38"
          width="48"
          height="48"
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-[900] -translate-x-1/2 -translate-y-full drop-shadow-md"
        >
          <path
            d="M19 37C19 37 4 23.5 4 14.5a15 15 0 0 1 30 0C34 23.5 19 37 19 37z"
            fill={nav.state.phase === 'pickStart' ? '#2E7D32' : '#C62828'}
            stroke="#fff"
            strokeWidth="2.5"
          />
          <text
            x="19"
            y="15"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="13"
            fontWeight="700"
            fill="#fff"
          >
            {nav.state.phase === 'pickStart' ? '起' : '終'}
          </text>
        </svg>
      )}

      {navActive && (
        <NavigationPanel
          state={nav.state}
          problems={problems}
          onSetDefaultStart={nav.setDefaultStart}
          onConfirm={confirmCenter}
          onAddressSelect={moveToAddress}
          onRestart={nav.restart}
          onExit={nav.exit}
          onSelectProblem={setSelectedId}
        />
      )}

      {selected && (
        <ReportSheet
          key={selected.id}
          report={selected}
          onClose={closeSheet}
          onDelete={() => void handleDelete(selected.id)}
          deleting={deleting}
        />
      )}
    </main>
  );
}
