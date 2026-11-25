import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../types';
import { CATEGORIES, getCategory } from './categories';

describe('categories', () => {
  it('6 種類別都有定義，且順序和規格一致', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([...CATEGORY_IDS]);
  });
  it('getCategory 回傳正確名稱', () => {
    expect(getCategory('construction').label).toBe('施工');
  });
});
