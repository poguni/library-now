// 내 데이터 내보내기·가져오기 (PRD F14, 8.5). 기기를 바꿀 때 JSON 파일로 옮깁니다.
// 파일은 사용자 기기에 내려받기만 하고 어디로도 보내지 않습니다.
import { FAVORITES_KEY } from './favorites';
import { NOTES_KEY } from './notes';
import { PLACES_KEY } from './places';
import { SETTINGS_KEY, type StorageLike } from './settings';

export const BACKUP_APP = 'library-now';
export const BACKUP_VERSION = 1;
export const BACKUP_KEYS = [SETTINGS_KEY, PLACES_KEY, FAVORITES_KEY, NOTES_KEY] as const;

export function exportData(storage: StorageLike | null, now: Date): string {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    try {
      const raw = storage?.getItem(key);
      if (raw) data[key] = JSON.parse(raw);
    } catch {
      // 읽을 수 없는 값은 건너뜁니다
    }
  }
  return JSON.stringify(
    { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data },
    null,
    2,
  );
}

export type ImportResult = { ok: true; keys: string[] } | { ok: false; error: string };

/** 파일 내용을 검사해 저장합니다. 각 값의 세부 검사는 읽을 때(read*) 다시 합니다. */
export function importData(storage: StorageLike | null, text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON 파일이 아닙니다.' };
  }
  const file = parsed as { app?: unknown; version?: unknown; data?: unknown } | null;
  if (!file || file.app !== BACKUP_APP || typeof file.data !== 'object' || !file.data) {
    return { ok: false, error: '지금 열린 도서관에서 내보낸 파일이 아닙니다.' };
  }
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    return { ok: false, error: '이 앱보다 새 버전에서 만든 파일입니다.' };
  }
  if (!storage) return { ok: false, error: '이 브라우저는 저장이 막혀 있습니다.' };

  const data = file.data as Record<string, unknown>;
  const entries = BACKUP_KEYS.flatMap((key) => {
    const value = data[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? [[key, JSON.stringify(value)] as const]
      : [];
  });
  if (entries.length === 0) return { ok: false, error: '가져올 내용이 없습니다.' };
  try {
    for (const [key, value] of entries) storage.setItem(key, value);
  } catch {
    return { ok: false, error: '저장하지 못했습니다. 저장 공간을 확인해 주세요.' };
  }
  return { ok: true, keys: entries.map(([key]) => key) };
}
