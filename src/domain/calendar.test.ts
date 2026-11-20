import { describe, expect, it } from 'vitest';
import { addMonths, isClosedOn, monthGrid, openOn, toYearMonth } from './calendar';
import type { Library } from './types';

const hours = { open: '09:00', close: '22:00' };
function lib(name: string, weekly: number[]): Library {
  return {
    id: name,
    name,
    district: '구로구',
    type: '공공도서관',
    operator: '구립',
    address: '',
    phone: null,
    homepage: null,
    searchUrl: null,
    lat: 37.5,
    lng: 126.9,
    rooms: {
      lending: {
        label: '자료실',
        hours: { weekday: hours, saturday: hours, sunday: hours, holiday: null },
        seasons: null,
        memo: null,
      },
      reading: null,
    },
    closed: { weekly, monthly: [], holiday: 'closed', appliesTo: ['lending', 'reading'] },
    closedRaw: '',
    closures: [],
    notes: [],
    source: { dataset: '', baseDate: null, checkedAt: '', verifiedAt: null, verifiedBy: '' },
  };
}
const ctx = { holidays: new Map([['2026-11-20', '테스트공휴일']]) };

describe('달력 격자', () => {
  it('2026년 11월: 1일이 일요일, 30일, 5주', () => {
    const g = monthGrid({ year: 2026, month: 11 });
    expect(g[0]).toBe('2026-11-01');
    expect(g.length).toBe(35);
    expect(g.filter(Boolean).length).toBe(30);
    expect(g[29]).toBe('2026-11-30');
    expect(g[30]).toBeNull();
  });

  it('2026년 2월: 1일이 일요일, 28일, 앞 빈칸 없음', () => {
    const g = monthGrid({ year: 2026, month: 2 });
    expect(g[0]).toBe('2026-02-01');
    expect(g.length).toBe(28);
  });

  it('2026년 12월: 1일이 화요일이라 앞 빈칸 2개', () => {
    const g = monthGrid({ year: 2026, month: 12 });
    expect(g.slice(0, 3)).toEqual([null, null, '2026-12-01']);
    expect(g.length % 7).toBe(0);
  });

  it('달 이동은 해를 넘김', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(toYearMonth('2026-11-18')).toEqual({ year: 2026, month: 11 });
  });
});

describe('휴관일과 그날 여는 곳', () => {
  const mon = lib('가월요휴관', [1]);
  const tue = lib('나화요휴관', [2]);

  it('정기 휴관과 공휴일', () => {
    expect(isClosedOn(mon, 'lending', '2026-11-16', ctx)).toBe(true); // 월
    expect(isClosedOn(mon, 'lending', '2026-11-17', ctx)).toBe(false);
    expect(isClosedOn(mon, 'lending', '2026-11-20', ctx)).toBe(true); // 공휴일
    expect(isClosedOn(mon, 'reading', '2026-11-16', ctx)).toBe(false); // 열람실 없음
  });

  it('그날 여는 도서관만 이름순으로', () => {
    expect(openOn([tue, mon], 'lending', '2026-11-16', ctx).map((e) => e.lib.name)).toEqual([
      '나화요휴관',
    ]);
    expect(openOn([tue, mon], 'lending', '2026-11-18', ctx)).toMatchObject([
      { lib: { name: '가월요휴관' }, open: 540, close: 1320 },
      { lib: { name: '나화요휴관' } },
    ]);
  });
});
