// 출발지(집·직장) 저장 (PRD F6, 6.4). 좌표는 브라우저 밖으로 보내지 않습니다.
import type { Place } from '../domain/directions';
import type { StorageLike } from './settings';

export const PLACES_KEY = 'ln.places';
export const PLACES_VERSION = 1;

export type PlaceKind = 'home' | 'work';
export type Places = Record<PlaceKind, Place | null>;

export const PLACE_LABEL: Record<PlaceKind, string> = { home: '집', work: '직장' };

function toPlace(value: unknown): Place | null {
  if (!value || typeof value !== 'object') return null;
  const { name, lat, lng } = value as Record<string, unknown>;
  if (typeof name !== 'string' || typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return null;
  return { name: name.trim() || '출발지', lat, lng };
}

export function readPlaces(storage: StorageLike | null): Places {
  try {
    const raw = storage?.getItem(PLACES_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    return { home: toPlace(parsed.home), work: toPlace(parsed.work) };
  } catch {
    return { home: null, work: null };
  }
}

/** 성공 여부만 돌려줍니다. place가 null이면 지웁니다. */
export function savePlace(
  storage: StorageLike | null,
  kind: PlaceKind,
  place: Place | null,
): boolean {
  try {
    if (!storage) return false;
    const next = { ...readPlaces(storage), [kind]: place, version: PLACES_VERSION };
    storage.setItem(PLACES_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
