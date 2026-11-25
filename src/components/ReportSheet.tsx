import { useEffect } from 'react';
import { getCategory } from '../data/categories';
import { formatTaipeiTime } from '../lib/format';
import type { ReportView } from '../types';

interface Props {
  report: ReportView;
  onClose: () => void;
}

/** 點選回報點後，從下方滑出的詳細卡片 */
export default function ReportSheet({ report, onClose }: Props) {
  const category = getCategory(report.category);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="sheet-title"
      className="absolute inset-x-0 bottom-0 z-[1050] max-h-[65%] animate-slide-up overflow-y-auto rounded-t-3xl bg-white pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
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
      </div>
    </section>
  );
}
