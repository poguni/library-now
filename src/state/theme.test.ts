import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, SETTINGS_KEY, readTheme, saveTheme } from './theme';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

const brokenStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('readTheme', () => {
  it('저장값이 없으면 서재 테마', () => {
    expect(readTheme(memoryStorage())).toBe('library');
    expect(DEFAULT_THEME).toBe('library');
  });

  it('저장된 테마를 읽음', () => {
    const s = memoryStorage({ [SETTINGS_KEY]: JSON.stringify({ version: 1, theme: 'mono' }) });
    expect(readTheme(s)).toBe('mono');
  });

  it('알 수 없는 값, 깨진 JSON, 저장소 없음, 예외는 기본값', () => {
    expect(readTheme(memoryStorage({ [SETTINGS_KEY]: '{"theme":"dark"}' }))).toBe('library');
    expect(readTheme(memoryStorage({ [SETTINGS_KEY]: '{oops' }))).toBe('library');
    expect(readTheme(null)).toBe('library');
    expect(readTheme(brokenStorage)).toBe('library');
  });
});

describe('saveTheme', () => {
  it('다른 설정을 지우지 않고 버전과 함께 저장', () => {
    const s = memoryStorage({ [SETTINGS_KEY]: JSON.stringify({ version: 1, mode: 'study' }) });
    expect(saveTheme(s, 'pastel')).toBe(true);
    expect(JSON.parse(s.data[SETTINGS_KEY]!)).toEqual({
      version: 1,
      mode: 'study',
      theme: 'pastel',
    });
  });

  it('저장이 막혀도 예외 없이 false', () => {
    expect(saveTheme(brokenStorage, 'mono')).toBe(false);
    expect(saveTheme(null, 'mono')).toBe(false);
  });
});
