import { getCategory } from '../data/categories';
import { DEFAULT_PLACE_NAME } from '../lib/geo';
import { formatDistance, walkingMinutes, type AlongRouteItem } from '../lib/routeGeometry';
import type { NavState } from '../lib/useNavigation';
import type { ReportView } from '../types';

interface Props {
  state: NavState;
  problems: AlongRouteItem<ReportView>[];
  onSetDefaultStart: () => void;
  onRestart: () => void;
  onExit: () => void;
  onSelectProblem: (id: string) => void;
}

const secondaryBtn =
  'h-11 flex-1 rounded-full border border-gray-300 px-3 text-sm font-medium active:bg-gray-100';

function Step({ n, text, done }: { n: string; text: string; done?: boolean }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white ${n === '起' ? 'bg-green-600' : 'bg-red-600'}`}
      >
        {n}
      </span>
      <span className={done ? 'text-gray-500' : 'font-medium'}>{text}</span>
    </p>
  );
}

/** 導航模式的底部面板 */
export default function NavigationPanel({
  state,
  problems,
  onSetDefaultStart,
  onRestart,
  onExit,
  onSelectProblem,
}: Props) {
  const { phase, result, error } = state;

  return (
    <section
      aria-label="導航"
      className="absolute inset-x-0 bottom-0 z-[1020] max-h-[50%] animate-slide-up overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">導航</h2>
        <button
          type="button"
          onClick={onExit}
          className="h-11 rounded-full px-3 text-sm font-medium text-gray-600 active:bg-gray-100"
        >
          結束導航
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {phase === 'pickStart' && (
        <div className="space-y-3">
          <Step n="起" text="點地圖選擇起點" />
          <button
            type="button"
            onClick={onSetDefaultStart}
            className="h-12 w-full rounded-full bg-brand text-base font-bold text-white active:bg-brand-dark"
          >
            以{DEFAULT_PLACE_NAME}為起點
          </button>
        </div>
      )}

      {phase === 'pickEnd' && (
        <div className="space-y-3">
          <Step n="起" text="已選擇起點" done />
          <Step n="終" text="點地圖選擇目的地" />
          <button type="button" onClick={onRestart} className={`${secondaryBtn} w-full`}>
            重新選擇起點
          </button>
        </div>
      )}

      {phase === 'routing' && (
        <p role="status" className="flex items-center gap-2 py-3 text-sm">
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent"
          />
          路線計算中…
        </p>
      )}

      {phase === 'done' && result && (
        <div className="space-y-3">
          <p className="text-base">
            步行約 <strong className="text-xl">{walkingMinutes(result.distance)} 分鐘</strong>
            <span className="text-gray-500">・{formatDistance(result.distance)}</span>
            {result.source === 'straight' && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                示意直線
              </span>
            )}
          </p>
          {result.fallbackReason && (
            <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {result.fallbackReason}
            </p>
          )}

          {problems.length === 0 ? (
            <p className="rounded-xl bg-green-50 px-3 py-3 text-sm text-green-800">
              這條路線上沒有已回報的人行道問題
            </p>
          ) : (
            <div>
              <p className="mb-2 text-sm font-bold text-red-700">
                路上有 {problems.length} 個人行道問題
              </p>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {problems.map(({ item, along }) => {
                  const c = getCategory(item.category);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelectProblem(item.id)}
                        className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left active:bg-gray-50"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
                          style={{ backgroundColor: c.color }}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm">
                            {c.emoji}
                          </span>
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">{c.label}</span>
                          <span className="block text-xs text-gray-500">
                            距起點約 {formatDistance(along)}
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-gray-400">
                          ›
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="text-xs text-gray-500">
            只標示路線兩側 30 公尺內、這台裝置上的回報；不會自動繞路。
          </p>
          <button type="button" onClick={onRestart} className={`${secondaryBtn} w-full`}>
            重新規劃
          </button>
        </div>
      )}
    </section>
  );
}
