import { describe, expect, it } from 'vitest';
import { FAVORITES_KEY, readFavorites, saveFavorites } from './favorites';
import { PLACES_KEY, readPlaces, savePlace } from './places';
import { SETTINGS_KEY, readMode, readPrefs, saveMode, savePrefs } from './settings';

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

describe('목록 설정과 출발지 선택 (F6·F7·F9)', () => {
  it('기본값: 현재 위치, 거리순, 필터 없음', () => {
    expect(readPrefs(memoryStorage())).toEqual({
      origin: 'current',
      sort: 'distance',
      filters: [],
      offDistricts: [],
    });
  });

  it('저장하고 다시 읽음, 모르는 값은 버림', () => {
    const s = memoryStorage();
    savePrefs(s, {
      origin: 'home',
      sort: 'time',
      filters: ['openNow', 'reviewed'],
      offDistricts: ['강남구'],
    });
    expect(readPrefs(s)).toEqual({
      origin: 'home',
      sort: 'time',
      filters: ['openNow', 'reviewed'],
      offDistricts: ['강남구'],
    });
    const bad = memoryStorage({
      [SETTINGS_KEY]: JSON.stringify({
        origin: 'moon',
        sort: 'x',
        filters: ['favorites', 'fav', 'late'],
        offDistricts: ['중구', 3],
      }),
    });
    expect(readPrefs(bad)).toEqual({
      origin: 'current',
      sort: 'distance',
      filters: ['favorites'],
      offDistricts: ['중구'],
    });
  });
});

describe('집·직장 저장 (ln.places)', () => {
  it('저장·읽기·지우기, 버전 기록', () => {
    const s = memoryStorage();
    expect(readPlaces(s)).toEqual({ home: null, work: null });
    expect(savePlace(s, 'home', { name: '집', lat: 37.5, lng: 126.9 })).toBe(true);
    expect(readPlaces(s).home).toEqual({ name: '집', lat: 37.5, lng: 126.9 });
    expect(JSON.parse(s.data[PLACES_KEY]!).version).toBe(1);
    savePlace(s, 'home', null);
    expect(readPlaces(s).home).toBeNull();
  });

  it('깨진 값과 막힌 저장소는 비어 있는 것으로', () => {
    expect(readPlaces(memoryStorage({ [PLACES_KEY]: '{oops' }))).toEqual({
      home: null,
      work: null,
    });
    expect(
      readPlaces(memoryStorage({ [PLACES_KEY]: '{"home":{"name":"집","lat":"37"}}' })).home,
    ).toBeNull();
    expect(readPlaces(brokenStorage)).toEqual({ home: null, work: null });
    expect(savePlace(brokenStorage, 'work', { name: '직장', lat: 37, lng: 127 })).toBe(false);
  });
});

describe('즐겨찾기 저장 (ln.favorites)', () => {
  it('순서를 지켜 저장하고 읽음', () => {
    const s = memoryStorage();
    expect(readFavorites(s)).toEqual([]);
    expect(saveFavorites(s, ['b', 'a'])).toBe(true);
    expect(readFavorites(s)).toEqual(['b', 'a']);
    expect(JSON.parse(s.data[FAVORITES_KEY]!).version).toBe(1);
  });

  it('깨진 값, 문자열이 아닌 항목, 막힌 저장소', () => {
    expect(readFavorites(memoryStorage({ [FAVORITES_KEY]: '{oops' }))).toEqual([]);
    expect(readFavorites(memoryStorage({ [FAVORITES_KEY]: '{"ids":["a",3,null]}' }))).toEqual([
      'a',
    ]);
    expect(readFavorites(brokenStorage)).toEqual([]);
    expect(saveFavorites(brokenStorage, ['a'])).toBe(false);
  });
});
