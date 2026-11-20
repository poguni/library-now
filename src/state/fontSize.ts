// 글자 크기 3단계 저장·적용. index.html의 인라인 스크립트도 같은 값으로 첫 화면 전에 적용합니다.
import { type StorageLike, readSettings, saveSettings } from './settings';

export const FONT_SIZES = ['normal', 'large', 'xlarge'] as const;
export type FontSize = (typeof FONT_SIZES)[number];

/** global.css의 --font-scale 값과 같게 둡니다 (메뉴 미리보기용) */
export const FONT_SCALE: Record<FontSize, number> = { normal: 1, large: 1.15, xlarge: 1.3 };

export const FONT_SIZE_LABEL: Record<FontSize, string> = {
  normal: '보통',
  large: '크게',
  xlarge: '아주 크게',
};

export function readFontSize(storage: StorageLike | null): FontSize {
  const value = readSettings(storage).fontSize;
  return (FONT_SIZES as readonly unknown[]).includes(value) ? (value as FontSize) : 'normal';
}

export function saveFontSize(storage: StorageLike | null, fontSize: FontSize): boolean {
  return saveSettings(storage, { fontSize });
}

export function applyFontSize(fontSize: FontSize): void {
  document.documentElement.setAttribute('data-font-size', fontSize);
}
