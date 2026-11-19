// ln.settings 저장소 (PRD 6.4). 읽기·쓰기는 모두 예외 없이 동작합니다.
import type { FilterKey, SortKey } from '../domain/list';
import type { RoomKey } from '../domain/types';

export const SETTINGS_KEY = 'ln.settings';
export const SETTINGS_VERSION = 1;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** 브라우저 저장소. 막혀 있으면 null */
export function getStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSettings(storage: StorageLike | null): Record<string, unknown> {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** 다른 설정은 그대로 두고 일부만 바꿉니다. 성공 여부만 돌려줍니다. */
export function saveSettings(storage: StorageLike | null, patch: Record<string, unknown>): boolean {
  try {
    if (!storage) return false;
    const next = { ...readSettings(storage), ...patch, version: SETTINGS_VERSION };
    storage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** 이용 모드 (F3): lending = 책 빌리기, reading = 공부하기 */
export const DEFAULT_MODE: RoomKey = 'lending';

export function readMode(storage: StorageLike | null): RoomKey {
  const mode = readSettings(storage).mode;
  return mode === 'lending' || mode === 'reading' ? mode : DEFAULT_MODE;
}

export function saveMode(storage: StorageLike | null, mode: RoomKey): boolean {
  return saveSettings(storage, { mode });
}

/** 출발지 선택 (F6) */
export type OriginChoice = 'current' | 'home' | 'work';

export interface ListPrefs {
  origin: OriginChoice;
  sort: SortKey;
  filters: FilterKey[];
  /** 지역 선택에서 끈 구 (M5). 새로 생긴 구는 켜진 채로 나옵니다 */
  offDistricts: string[];
}

const ORIGINS: readonly OriginChoice[] = ['current', 'home', 'work'];
const SORTS: readonly SortKey[] = ['distance', 'time', 'name'];
const FILTERS: readonly FilterKey[] = ['openNow', 'late', 'favorites', 'reviewed'];

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function readPrefs(storage: StorageLike | null): ListPrefs {
  const s = readSettings(storage);
  return {
    origin: pick(s.origin, ORIGINS, 'current'),
    sort: pick(s.sort, SORTS, 'distance'),
    filters: Array.isArray(s.filters)
      ? FILTERS.filter((f) => (s.filters as unknown[]).includes(f))
      : [],
    offDistricts: Array.isArray(s.offDistricts)
      ? (s.offDistricts as unknown[]).filter((d): d is string => typeof d === 'string')
      : [],
  };
}

export function savePrefs(storage: StorageLike | null, patch: Partial<ListPrefs>): boolean {
  return saveSettings(storage, patch);
}
