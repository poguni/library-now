import { describe, expect, it } from 'vitest';
import { SETTINGS_KEY, readMode, saveMode } from './settings';

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

describe('이용 모드 저장 (F3)', () => {
  it('저장값이 없거나 이상하면 책 빌리기', () => {
    expect(readMode(memoryStorage())).toBe('lending');
    expect(readMode(memoryStorage({ [SETTINGS_KEY]: '{"mode":"study"}' }))).toBe('lending');
    expect(readMode(brokenStorage)).toBe('lending');
    expect(readMode(null)).toBe('lending');
  });

  it('테마를 지우지 않고 모드를 저장하고 다시 읽음', () => {
    const s = memoryStorage({ [SETTINGS_KEY]: JSON.stringify({ version: 1, theme: 'mono' }) });
    expect(saveMode(s, 'reading')).toBe(true);
    expect(JSON.parse(s.data[SETTINGS_KEY]!)).toEqual({
      version: 1,
      theme: 'mono',
      mode: 'reading',
    });
    expect(readMode(s)).toBe('reading');
  });

  it('저장이 막혀도 예외 없이 false', () => {
    expect(saveMode(brokenStorage, 'reading')).toBe(false);
  });
});
