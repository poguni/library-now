// 화면 테마 저장·적용 (PRD F16, DESIGN 2.2)
// index.html의 인라인 스크립트도 같은 규칙으로 첫 화면 전에 테마를 적용합니다.
import { type StorageLike, readSettings, saveSettings } from './settings';

export { SETTINGS_KEY, SETTINGS_VERSION } from './settings';

export const THEMES = ['library', 'pastel', 'mono'] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = 'library';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function readTheme(storage: StorageLike | null): Theme {
  const theme = readSettings(storage).theme;
  return isTheme(theme) ? theme : DEFAULT_THEME;
}

/** 저장에 실패해도 예외를 던지지 않습니다. 성공 여부만 돌려줍니다. */
export function saveTheme(storage: StorageLike | null, theme: Theme): boolean {
  return saveSettings(storage, { theme });
}

/** 테마별 글꼴 (DESIGN 3.1). index.html의 인라인 스크립트와 같은 주소를 씁니다 */
export const THEME_FONTS: Record<Theme, string> = {
  library:
    'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap',
  pastel: 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap',
  mono: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap',
};

export const THEME_LABEL: Record<Theme, { name: string; desc: string }> = {
  library: { name: '서재', desc: '종이 바탕, 짙은 녹색, 명조 제목' },
  pastel: { name: '말랑', desc: '파스텔, 둥글고 귀여운 느낌' },
  mono: { name: '모노', desc: '검정·회색과 코발트 블루' },
};

/** 화면에 테마를 적용하고, 그 테마 글꼴이 없으면 불러옵니다 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  const id = `font-${theme}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = THEME_FONTS[theme];
  document.head.appendChild(link);
}
