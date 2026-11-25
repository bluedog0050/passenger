import { useEffect } from 'react';

interface Props {
  message: string | null;
  onClose: () => void;
  /** 幾毫秒後自動消失 */
  duration?: number;
}

/** 短暫提示，放在標題列下方的提示區 */
export default function Toast({ message, onClose, duration = 4000 }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="flex justify-center">
      <p className="pointer-events-auto animate-fade-in rounded-2xl bg-gray-900/90 px-4 py-3 text-center text-sm text-white shadow-lg">
        {message}
      </p>
    </div>
  );
}
