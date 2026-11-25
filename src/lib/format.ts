const formatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** 把 ISO 時間轉成台灣時間，例如 2026/11/25 14:30；無效時間回傳「時間不明」 */
export function formatTaipeiTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '時間不明';
  const parts = Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}
