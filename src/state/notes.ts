// 내 메모와 직접 입력한 임시 휴관 (PRD F14, 6.4). 이 브라우저에만 저장합니다.
import { useCallback, useMemo, useState } from 'react';
import type { Closure, RoomKey } from '../domain/types';
import { type StorageLike, getStorage } from './settings';

export const NOTES_KEY = 'ln.notes';
export const NOTES_VERSION = 1;
export const MEMO_MAX = 500;
export const CLOSURE_REASON_MAX = 30;

export interface Notes {
  /** 도서관 ID → 메모 */
  memos: Record<string, string>;
  /** 도서관 ID → 직접 입력한 임시 휴관 */
  closures: Record<string, Closure[]>;
}

const EMPTY: Notes = { memos: {}, closures: {} };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROOMS: readonly RoomKey[] = ['lending', 'reading'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

function toClosure(value: unknown): Closure | null {
  if (!isRecord(value)) return null;
  const { from, to, reason, rooms } = value;
  if (typeof from !== 'string' || typeof to !== 'string' || !DATE.test(from) || !DATE.test(to))
    return null;
  if (from > to || !Array.isArray(rooms)) return null;
  const valid = ROOMS.filter((r) => rooms.includes(r));
  if (valid.length === 0) return null;
  return { from, to, reason: typeof reason === 'string' ? reason : '', rooms: valid };
}

/** 저장값·가져온 값을 검사해 맞는 것만 남깁니다 */
export function parseNotes(value: unknown): Notes {
  if (!isRecord(value)) return EMPTY;
  const memos: Record<string, string> = {};
  if (isRecord(value.memos)) {
    for (const [id, text] of Object.entries(value.memos)) {
      if (typeof text === 'string' && text.trim()) memos[id] = text.slice(0, MEMO_MAX);
    }
  }
  const closures: Record<string, Closure[]> = {};
  if (isRecord(value.closures)) {
    for (const [id, list] of Object.entries(value.closures)) {
      const valid = Array.isArray(list)
        ? list.map(toClosure).filter((c): c is Closure => c !== null)
        : [];
      if (valid.length) closures[id] = valid;
    }
  }
  return { memos, closures };
}

export function readNotes(storage: StorageLike | null): Notes {
  try {
    const raw = storage?.getItem(NOTES_KEY);
    return raw ? parseNotes(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveNotes(storage: StorageLike | null, notes: Notes): boolean {
  try {
    if (!storage) return false;
    storage.setItem(NOTES_KEY, JSON.stringify({ version: NOTES_VERSION, ...notes }));
    return true;
  } catch {
    return false;
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Notes>(() => readNotes(getStorage()));

  const update = useCallback((fn: (prev: Notes) => Notes) => {
    setNotes((prev) => {
      const next = fn(prev);
      saveNotes(getStorage(), next);
      return next;
    });
  }, []);

  const setMemo = useCallback(
    (id: string, text: string) =>
      update((prev) => {
        const memos = { ...prev.memos };
        if (text.trim()) memos[id] = text.slice(0, MEMO_MAX);
        else delete memos[id];
        return { ...prev, memos };
      }),
    [update],
  );

  const addClosure = useCallback(
    (id: string, closure: Closure) =>
      update((prev) => ({
        ...prev,
        closures: { ...prev.closures, [id]: [...(prev.closures[id] ?? []), closure] },
      })),
    [update],
  );

  const removeClosure = useCallback(
    (id: string, index: number) =>
      update((prev) => {
        const closures = { ...prev.closures };
        const list = (closures[id] ?? []).filter((_, i) => i !== index);
        if (list.length) closures[id] = list;
        else delete closures[id];
        return { ...prev, closures };
      }),
    [update],
  );

  /** 상태 계산에 넘길 형태 (ScheduleContext.userClosures) */
  const userClosures = useMemo(
    () => new Map(Object.entries(notes.closures)) as ReadonlyMap<string, readonly Closure[]>,
    [notes.closures],
  );

  return { notes, setMemo, addClosure, removeClosure, userClosures };
}

export type NotesApi = ReturnType<typeof useNotes>;
