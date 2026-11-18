// ln.settings 저장소 (PRD 6.4). 읽기·쓰기는 모두 예외 없이 동작합니다.
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
