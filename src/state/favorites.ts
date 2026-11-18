// 즐겨찾기 저장 (PRD F12, 6.4)
import { useCallback, useState } from 'react';
import { type StorageLike, getStorage } from './settings';

export const FAVORITES_KEY = 'ln.favorites';
export const FAVORITES_VERSION = 1;

export function readFavorites(storage: StorageLike | null): string[] {
  try {
    const raw = storage?.getItem(FAVORITES_KEY);
    const ids: unknown = raw ? (JSON.parse(raw) as { ids?: unknown }).ids : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavorites(storage: StorageLike | null, ids: readonly string[]): boolean {
  try {
    if (!storage) return false;
    storage.setItem(FAVORITES_KEY, JSON.stringify({ version: FAVORITES_VERSION, ids }));
    return true;
  } catch {
    return false;
  }
}

/** 추가한 순서를 지킵니다 (달력 색 점 순서에 씀) */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => readFavorites(getStorage()));
  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveFavorites(getStorage(), next);
      return next;
    });
  }, []);
  return { ids, toggle };
}
