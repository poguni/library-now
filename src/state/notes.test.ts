import { describe, expect, it } from 'vitest';
import { BACKUP_APP, exportData, importData } from './backup';
import { FAVORITES_KEY, readFavorites } from './favorites';
import { NOTES_KEY, parseNotes, readNotes, saveNotes } from './notes';
import { PLACES_KEY } from './places';
import { SETTINGS_KEY } from './settings';

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

const closure = { from: '2026-12-01', to: '2026-12-03', reason: '공사', rooms: ['reading'] };

describe('내 메모·임시 휴관 저장 (F14)', () => {
  it('저장하고 다시 읽기', () => {
    const s = memoryStorage();
    const notes = { memos: { a: '3층 창가 자리 좋음' }, closures: { a: [closure] } };
    expect(saveNotes(s, notes as never)).toBe(true);
    expect(JSON.parse(s.data[NOTES_KEY]!).version).toBe(1);
    expect(readNotes(s)).toEqual(notes);
  });

  it('잘못된 값은 버림', () => {
    expect(
      parseNotes({
        memos: { a: 3, b: '  ', c: '좋음' },
        closures: {
          a: [
            { ...closure, from: '2026-12-05' }, // 시작이 끝보다 늦음
            { ...closure, rooms: ['study'] }, // 없는 실
            { ...closure, to: '12월 3일' }, // 날짜 형식
            closure,
          ],
          b: 'x',
        },
      }),
    ).toEqual({ memos: { c: '좋음' }, closures: { a: [closure] } });
    expect(parseNotes(null)).toEqual({ memos: {}, closures: {} });
  });

  it('저장소가 막혀도 오류 없이 빈 값', () => {
    expect(readNotes(brokenStorage)).toEqual({ memos: {}, closures: {} });
    expect(saveNotes(brokenStorage, { memos: {}, closures: {} })).toBe(false);
    expect(readNotes(memoryStorage({ [NOTES_KEY]: '{깨진' }))).toEqual({ memos: {}, closures: {} });
  });
});

describe('내보내기·가져오기 (F14)', () => {
  const now = new Date('2026-11-19T01:00:00Z');

  it('내보낸 파일을 다른 기기에서 그대로 가져옴', () => {
    const from = memoryStorage({
      [SETTINGS_KEY]: '{"version":1,"theme":"mono"}',
      [FAVORITES_KEY]: '{"version":1,"ids":["a","b"]}',
      [NOTES_KEY]: JSON.stringify({ version: 1, memos: { a: '메모' }, closures: {} }),
      'other.key': '"무관"',
    });
    const file = exportData(from, now);
    const parsed = JSON.parse(file);
    expect(parsed).toMatchObject({ app: BACKUP_APP, version: 1, exportedAt: now.toISOString() });
    expect(Object.keys(parsed.data)).toEqual([SETTINGS_KEY, FAVORITES_KEY, NOTES_KEY]);

    const to = memoryStorage();
    expect(importData(to, file)).toEqual({
      ok: true,
      keys: [SETTINGS_KEY, FAVORITES_KEY, NOTES_KEY],
    });
    expect(readFavorites(to)).toEqual(['a', 'b']);
    expect(readNotes(to).memos).toEqual({ a: '메모' });
    expect(to.data[PLACES_KEY]).toBeUndefined();
  });

  it('다른 파일·새 버전·빈 파일은 거절하고 아무것도 바꾸지 않음', () => {
    const s = memoryStorage({ [FAVORITES_KEY]: '{"version":1,"ids":["a"]}' });
    expect(importData(s, '아님').ok).toBe(false);
    expect(importData(s, '{"app":"other","version":1,"data":{}}').ok).toBe(false);
    expect(importData(s, `{"app":"${BACKUP_APP}","version":99,"data":{}}`).ok).toBe(false);
    expect(importData(s, `{"app":"${BACKUP_APP}","version":1,"data":{"x":{}}}`).ok).toBe(false);
    expect(readFavorites(s)).toEqual(['a']);
  });

  it('저장소가 막혀 있으면 실패로 알림', () => {
    const file = `{"app":"${BACKUP_APP}","version":1,"data":{"${FAVORITES_KEY}":{"ids":[]}}}`;
    expect(importData(null, file).ok).toBe(false);
    expect(importData(brokenStorage, file).ok).toBe(false);
    expect(JSON.parse(exportData(brokenStorage, now)).data).toEqual({});
  });
});
