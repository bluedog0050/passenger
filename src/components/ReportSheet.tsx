import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { getCategory } from '../data/categories';
import { formatTaipeiTime } from '../lib/format';
import type { ReportView } from '../types';

interface Props {
  report: ReportView;
  onClose: () => void;
  /** 只有使用者自己的回報才有刪除功能 */
  onDelete?: () => void;
  deleting?: boolean;
}

/** 往下拉超過這個距離（px）就關閉 */
const CLOSE_DISTANCE = 100;
/** 或是快速往下滑（px/ms）且超過 40px 也關閉 */
const CLOSE_VELOCITY = 0.5;

/** 往下滑就關閉卡片的手勢 */
function useSwipeToClose(onClose: () => void) {
  const ref = useRef<HTMLElement>(null);
  const start = useRef<{ x: number; y: number; t: number; axis: 'x' | 'y' | null } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    // 卡片內容已往下捲動時，讓使用者先捲回頂端，不啟動關閉手勢
    if (!t || (ref.current && ref.current.scrollTop > 0)) {
      start.current = null;
      return;
    }
    start.current = { x: t.clientX, y: t.clientY, t: Date.now(), axis: null };
  };

  const onTouchMove = (e: TouchEvent) => {
    const s = start.current;
    const t = e.touches[0];
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // 先判斷是左右滑（看照片）還是上下滑
    if (!s.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      s.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    }
    if (s.axis === 'y') setDragY(Math.max(0, dy));
  };

  const onTouchEnd = () => {
    const s = start.current;
    start.current = null;
    if (!s || s.axis !== 'y') return;
    const velocity = dragY / Math.max(1, Date.now() - s.t);
    if (dragY > CLOSE_DISTANCE || (dragY > 40 && velocity > CLOSE_VELOCITY)) {
      setClosing(true);
      window.setTimeout(onClose, 200);
    } else {
      setDragY(0);
    }
  };

  const style = {
    transform: closing ? 'translateY(100%)' : dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: start.current?.axis === 'y' ? 'none' : 'transform 0.2s ease-out',
  };

  return {
    ref,
    style,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}

/** 點選回報點後，從下方滑出的詳細卡片；可往下滑關閉 */
export default function ReportSheet({ report, onClose, onDelete, deleting = false }: Props) {
  const category = getCategory(report.category);
  const swipe = useSwipeToClose(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <section
      ref={swipe.ref}
      style={swipe.style}
      {...swipe.handlers}
      role="dialog"
      aria-modal="false"
      aria-labelledby="sheet-title"
      className="absolute inset-x-0 bottom-0 z-[1050] max-h-[65%] animate-slide-up overflow-y-auto overscroll-contain rounded-t-3xl bg-white pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 pt-2">
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-gray-300"
        />
        <h2 id="sheet-title" className="mt-4 flex items-center gap-2 text-lg font-bold">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: category.color }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm">
              {category.emoji}
            </span>
          </span>
          {category.label}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="mt-3 flex h-11 w-11 items-center justify-center rounded-full text-xl text-gray-600 active:bg-gray-100"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 px-4 pt-2">
        <p className="text-sm text-gray-600">
          <span aria-hidden="true">🕒 </span>
          <time dateTime={report.reportedAt}>{formatTaipeiTime(report.reportedAt)}</time>
        </p>

        {report.photoUrls.length > 0 ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
            {report.photoUrls.map((url, i) => (
              <img
                key={url + i}
                src={url}
                alt={`${category.label}照片 ${i + 1}`}
                className="h-48 w-full flex-none snap-center rounded-xl bg-gray-100 object-cover"
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-surface p-3 text-center text-sm text-gray-500">沒有附照片</p>
        )}

        {report.description ? (
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
            {report.description}
          </p>
        ) : (
          <p className="text-sm text-gray-500">沒有詳細說明</p>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="h-12 w-full rounded-full border border-red-300 text-base font-medium text-red-700 active:bg-red-50 disabled:opacity-50"
          >
            {deleting ? '刪除中…' : '刪除這筆回報'}
          </button>
        )}
      </div>
    </section>
  );
}
