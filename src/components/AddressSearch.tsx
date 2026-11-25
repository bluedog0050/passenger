import { useEffect, useId, useRef, useState } from 'react';
import { GeocodeError, MAX_QUERY, searchAddress, type GeocodeResult } from '../lib/geocode';

interface Props {
  /** 選了某個搜尋結果 */
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * 手動輸入地址。按「搜尋」才查詢（不會邊打字邊查詢）。
 * 失敗時只顯示訊息，拖曳地圖選點的功能不受影響。
 */
export default function AddressSearch({
  onSelect,
  placeholder = '輸入地址或地標，例如：中興大學',
}: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputId = useId();
  const messageId = useId();

  useEffect(() => () => abortRef.current?.abort(), []);

  const onSubmit = async (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    // 這個元件可能放在另一個表單裡，不讓送出事件往外傳
    e.preventDefault();
    e.stopPropagation();
    if (status === 'loading') return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setMessage(null);
    setResults([]);
    try {
      const found = await searchAddress(query, { signal: controller.signal });
      setResults(found);
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) return;
      setMessage(err instanceof GeocodeError ? err.message : '地址查詢失敗，請改用拖曳地圖選擇');
      setStatus('error');
    }
  };

  const choose = (r: GeocodeResult) => {
    onSelect(r);
    setResults([]);
    setStatus('idle');
    setMessage(null);
  };

  // 用 div + 按鈕而非 <form>，避免在回報表單中出現巢狀表單
  return (
    <div role="search" className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        搜尋地址
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="search"
          enterKeyHint="search"
          value={query}
          maxLength={MAX_QUERY}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onSubmit(e);
          }}
          placeholder={placeholder}
          aria-describedby={message ? messageId : undefined}
          className="h-11 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 text-base"
        />
        <button
          type="button"
          onClick={(e) => void onSubmit(e)}
          disabled={status === 'loading'}
          className="h-11 flex-none rounded-full bg-gray-800 px-4 text-sm font-bold text-white active:bg-gray-900 disabled:opacity-60"
        >
          {status === 'loading' ? '搜尋中…' : '搜尋'}
        </button>
      </div>

      {status === 'loading' && (
        <p role="status" className="text-sm text-gray-600">
          正在查詢地址…
        </p>
      )}
      {message && (
        <p id={messageId} role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
      {status === 'done' && results.length > 0 && (
        <ul
          aria-label="搜尋結果"
          className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white"
        >
          {results.map((r) => (
            <li key={`${r.lat},${r.lng},${r.label}`}>
              <button
                type="button"
                onClick={() => choose(r)}
                className="line-clamp-2 min-h-11 w-full px-3 py-2 text-left text-sm active:bg-gray-50"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-400">地址查詢：© OpenStreetMap contributors（Nominatim）</p>
    </div>
  );
}
