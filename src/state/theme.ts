// 화면 테마 저장·적용 (PRD F16, DESIGN 2.2)
// index.html의 인라인 스크립트도 같은 규칙으로 첫 화면 전에 테마를 적용합니다.

export const THEMES = ['library', 'pastel', 'mono'] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = 'library';

export const SETTINGS_KEY = 'ln.settings';
export const SETTINGS_VERSION = 1;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

function readSettings(storage: StorageLike | null): Record<string, unknown> {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function readTheme(storage: StorageLike | null): Theme {
  const theme = readSettings(storage).theme;
  return isTheme(theme) ? theme : DEFAULT_THEME;
}

/** 저장에 실패해도 예외를 던지지 않습니다. 성공 여부만 돌려줍니다. */
export function saveTheme(storage: StorageLike | null, theme: Theme): boolean {
  try {
    if (!storage) return false;
    const next = { ...readSettings(storage), version: SETTINGS_VERSION, theme };
    storage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
