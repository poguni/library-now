import { describe, expect, it } from 'vitest';
import { buildRows, filterRows, soonestOpening, sortRows } from './list';
import type { Library, WeekHours } from './types';

const week = (open: string, close: string, weekend = true): WeekHours => ({
  weekday: { open, close },
  saturday: weekend ? { open, close } : null,
  sunday: weekend ? { open, close } : null,
  holiday: null,
});

function lib(
  id: string,
  name: string,
  lat: number,
  hours: WeekHours,
  weekly: number[] = [],
): Library {
  return {
    id,
    name,
    district: id.startsWith('g') ? '구로구' : '양천구',
    type: '공공도서관',
    operator: '구립',
    address: '서울',
    phone: null,
    homepage: null,
    searchUrl: null,
    lat,
    lng: 126.9,
    rooms: { lending: { label: '자료실', hours, seasons: null, memo: null }, reading: null },
    closed: { weekly, monthly: [], holiday: 'closed', appliesTo: ['lending', 'reading'] },
    closedRaw: '',
    closures: [],
    notes: [],
    source: { dataset: '', baseDate: null, checkedAt: '', verifiedAt: null, verifiedBy: '' },
  };
}

// 출발지 (37.5, 126.9)에서 북쪽으로 0.5km, 2km, 4km, 6km
const km = (k: number) => 37.5 + k / 111.195;
const LIBS = [
  lib('g1', '가까운도서관', km(0.5), week('09:00', '20:00')), // 도보 9분
  lib('g2', '나중도서관', km(2), week('09:00', '22:00')), // 대중교통 약 19분
  lib('y1', '다른구도서관', km(4), week('09:00', '22:00')), // 대중교통 약 27분
  lib('y2', '월요휴관도서관', km(6), week('09:00', '22:00'), [3]), // 수요일 휴관
];
const ctx = { holidays: new Map() };
const origin = { lat: 37.5, lng: 126.9 };
const at = (hhmm: string) => new Date(`2026-11-18T${hhmm}:00+09:00`); // 수요일

const rows = (hhmm: string, withOrigin = true) =>
  buildRows(LIBS, { mode: 'lending', now: at(hhmm), ctx, origin: withOrigin ? origin : null });
const names = (list: { lib: Library }[]) => list.map((r) => r.lib.name);

describe('목록 한 줄 (F5·F7)', () => {
  it('출발지가 있으면 이동 시간과 도착 기준 이용 시간', () => {
    const r = rows('19:05')[0]!;
    expect(r.travel).toMatchObject({ means: 'walk', minutes: 9 });
    expect(r.usable).toMatchObject({ kind: 'usable', minutes: 20 * 60 - (19 * 60 + 14) });
    expect(r.view).toMatchObject({ big: '46분', bigLabel: '도착 후 이용' });
  });

  it('출발지가 없으면 이동 시간 없이 지금부터 마감까지', () => {
    const r = rows('19:05', false)[0]!;
    expect(r.travel).toBeNull();
    expect(r.view).toMatchObject({ big: '55분', bigLabel: '마감까지' });
  });
});

describe('정렬', () => {
  it('거리순: 이용할 수 없는 곳은 뒤로', () => {
    expect(names(sortRows(rows('19:05'), 'distance'))).toEqual([
      '가까운도서관',
      '나중도서관',
      '다른구도서관',
      '월요휴관도서관',
    ]);
  });

  it('도착 시 마감은 뒤로 (19:55 출발: 가까운 곳은 20:04 도착)', () => {
    const list = sortRows(rows('19:55'), 'distance');
    expect(names(list)).toEqual(['나중도서관', '다른구도서관', '가까운도서관', '월요휴관도서관']);
    expect(list[2]!.view.big).toBe('도착 시 마감');
  });

  it('남은 시간순: 이용 가능 시간이 긴 곳부터', () => {
    expect(names(sortRows(rows('19:05'), 'time'))).toEqual([
      '나중도서관',
      '다른구도서관',
      '가까운도서관',
      '월요휴관도서관',
    ]);
  });

  it('출발지가 없으면 거리순 대신 남은 시간순', () => {
    expect(names(sortRows(rows('19:05', false), 'distance'))[0]).not.toBe('가까운도서관');
  });

  it('시간 정보가 없는 곳도 뒤로', () => {
    const unknown = lib('g0', '정보없음도서관', km(0.1), week('09:00', '22:00'));
    unknown.rooms.lending.hours = null;
    const list = buildRows([unknown, ...LIBS], { mode: 'lending', now: at('19:05'), ctx, origin });
    expect(names(sortRows(list, 'distance'))[0]).toBe('가까운도서관');
  });

  it('이름순', () => {
    expect(names(sortRows(rows('19:05'), 'name'))).toEqual([
      '가까운도서관',
      '나중도서관',
      '다른구도서관',
      '월요휴관도서관',
    ]);
  });
});

describe('필터 (F9)', () => {
  const none = new Set<string>();

  it('지금 열린 곳만', () => {
    const list = rows('19:05');
    expect(
      names(filterRows(list, { offDistricts: none, query: '', filters: ['openNow'] })),
    ).toEqual(['가까운도서관', '나중도서관', '다른구도서관']);
  });

  it('즐겨찾기만', () => {
    const list = rows('19:05');
    expect(
      names(
        filterRows(list, {
          offDistricts: none,
          query: '',
          filters: ['favorites'],
          favorites: ['y2', 'g1'],
        }),
      ),
    ).toEqual(['가까운도서관', '월요휴관도서관']);
    expect(filterRows(list, { offDistricts: none, query: '', filters: ['favorites'] })).toEqual([]);
  });

  it('검수된 곳만: 자동 변환(미검수) 도서관은 뺌 (M5)', () => {
    const auto = lib('y9', '자동변환도서관', km(1), week('09:00', '22:00'));
    auto.source.verifiedBy = 'auto';
    const list = buildRows([...LIBS, auto], { mode: 'lending', now: at('19:05'), ctx, origin });
    expect(names(filterRows(list, { offDistricts: none, query: '', filters: [] }))).toContain(
      '자동변환도서관',
    );
    expect(
      names(filterRows(list, { offDistricts: none, query: '', filters: ['reviewed'] })),
    ).not.toContain('자동변환도서관');
  });

  it('구 선택과 이름 검색(띄어쓰기 무시)', () => {
    const list = rows('19:05');
    expect(
      names(filterRows(list, { offDistricts: new Set(['양천구']), query: '', filters: [] })),
    ).toEqual(['가까운도서관', '나중도서관']);
    expect(
      names(filterRows(list, { offDistricts: none, query: '나중 도서', filters: [] })),
    ).toEqual(['나중도서관']);
  });

  it('결과가 없을 때 다음 개관이 가장 빠른 곳', () => {
    expect(soonestOpening(rows('23:00'))?.text).toBe('가까운도서관 (내일 09:00)');
    expect(soonestOpening(rows('08:00'))?.text).toBe('가까운도서관 (오늘 09:00)');
    expect(soonestOpening([])).toBeNull();
  });
});
