import { useState } from 'react';
import { CATEGORIES } from '../data/categories';

/** 左下角可收合的圖例 */
export default function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-auto">
      {open && (
        <ul
          id="map-legend"
          className="mb-2 animate-fade-in space-y-1.5 rounded-2xl bg-white p-3 text-sm shadow-lg"
        >
          {CATEGORIES.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                style={{ backgroundColor: c.color }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px]">
                  {c.emoji}
                </span>
              </span>
              {c.label}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="map-legend"
        className="flex h-12 items-center gap-1 rounded-full bg-white px-4 text-sm font-medium shadow-md active:bg-gray-100"
      >
        圖例 <span aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>
    </div>
  );
}
