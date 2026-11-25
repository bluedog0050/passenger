import type { CategoryId } from '../types';

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
  emoji: string;
}

/** 類別的名稱、顏色、圖示只定義在這裡（見 CLAUDE.md） */
export const CATEGORIES: readonly Category[] = [
  { id: 'discontinuous', label: '不連續人行道', color: '#D32F2F', emoji: '🚶' },
  { id: 'obstacle', label: '障礙物阻擋', color: '#F57C00', emoji: '📦' },
  { id: 'damaged', label: '人行道破損', color: '#795548', emoji: '🕳️' },
  { id: 'occupied', label: '違規佔用', color: '#7B1FA2', emoji: '🛵' },
  { id: 'construction', label: '施工', color: '#F9A825', emoji: '🏗️' },
  { id: 'other', label: '其他', color: '#616161', emoji: '❓' },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  const c = byId.get(id);
  if (!c) throw new Error(`未知的類別：${id}`);
  return c;
}
