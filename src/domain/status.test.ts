import { describe, expect, it } from 'vitest';
import { getDaySchedule, type HolidayMap } from './schedule';
import { getStatus, getUsable } from './status';
import { addDays, formatTime, fromSeoul, toSeoul, weekdayOf } from './time';
import type { Library, WeekHours } from './types';

// ---------- 테스트 도우미 ----------

const H = (open: string, close: string) => ({ open, close });
const week = (wk: [string, string] | null, sat = wk, sun = sat): WeekHours => ({
  weekday: wk && H(...wk),
  saturday: sat && H(...sat),
  sunday: sun && H(...sun),
  holiday: null,
});

function makeLib(patch: Partial<Library> = {}): Library {
  return {
    id: 't-001',
    name: '테스트도서관',
    district: '구로구',
    type: '공공도서관',
    operator: '구립',
    address: '서울',
    phone: null,
    homepage: null,
    lat: 37.5,
    lng: 126.88,
    rooms: {
      lending: {
        label: '자료실',
        hours: week(['09:00', '22:00'], ['09:00', '17:00']),
        seasons: null,
        memo: null,
      },
      reading: null,
    },
    closed: { weekly: [1], monthly: [], holiday: 'closed', appliesTo: ['lending', 'reading'] },
    closedRaw: '',
    closures: [],
    notes: [],
    source: { dataset: '', baseDate: null, checkedAt: '', verifiedAt: null, verifiedBy: '' },
    ...patch,
  };
}

/** 서울 시각 "YYYY-MM-DD HH:MM" → Date (기기 시간대와 무관) */
const seoul = (s: string) => new Date(`${s.replace(' ', 'T')}:00+09:00`);

const HOLIDAYS: HolidayMap = new Map([
  ['2026-02-17', '설날'],
  ['2026-03-01', '삼일절'],
  ['2026-05-05', '어린이날'],
  ['2026-06-03', '전국동시지방선거'],
  ['2026-10-05', '대체공휴일(개천절)'],
]);
const ctx = { holidays: HOLIDAYS };
const noHolidays = { holidays: new Map() };

// ---------- 시간 도우미 ----------

describe('time', () => {
  it('기기 시간대와 관계없이 서울 날짜·시각을 구함', () => {
    expect(toSeoul(new Date('2026-11-18T10:05:00Z'))).toEqual({
      date: '2026-11-18',
      weekday: 3,
      minutes: 19 * 60 + 5,
    });
    // UTC 15:30 = 서울 다음 날 00:30
    expect(toSeoul(new Date('2026-11-18T15:30:00Z'))).toMatchObject({
      date: '2026-11-19',
      weekday: 4,
      minutes: 30,
    });
  });

  it('서울 날짜·시각 → 시각 (기준 시각 바꾸기, F13)', () => {
    expect(fromSeoul('2026-11-21', 15 * 60).toISOString()).toBe('2026-11-21T06:00:00.000Z');
    expect(toSeoul(fromSeoul('2026-11-21', 15 * 60))).toEqual({
      date: '2026-11-21',
      weekday: 6,
      minutes: 900,
    });
    // 서울 00:30 = UTC 전날 15:30
    expect(fromSeoul('2027-01-01', 30).toISOString()).toBe('2026-12-31T15:30:00.000Z');
  });

  it('요일, 날짜 더하기, 시각 표기', () => {
    expect(weekdayOf('2026-11-16')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(formatTime(9 * 60)).toBe('09:00');
    expect(formatTime(1440 + 60)).toBe('01:00');
  });
});

// ---------- 휴관 판정 (PRD 5.2, 5.6) ----------

describe('getDaySchedule: 정기 휴관', () => {
  it('매주 월요일 휴관', () => {
    expect(getDaySchedule(makeLib(), 'lending', '2026-11-16', ctx)).toEqual({
      kind: 'closed',
      reason: { type: 'weekly', weekday: 1 },
    });
    expect(getDaySchedule(makeLib(), 'lending', '2026-11-17', ctx)).toMatchObject({
      kind: 'open',
      open: 540,
      close: 1320,
    });
  });

  it('매월 둘째·넷째 월요일 휴관 (2026년 11월: 9일, 23일)', () => {
    const lib = makeLib({
      closed: {
        weekly: [],
        monthly: [{ nth: [2, 4], weekday: 1 }],
        holiday: 'closed',
        appliesTo: ['lending'],
      },
    });
    const kinds = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'].map(
      (d) => getDaySchedule(lib, 'lending', d, noHolidays).kind,
    );
    expect(kinds).toEqual(['open', 'closed', 'open', 'closed', 'open']);
  });

  it('매월 마지막 화요일 휴관 (2026년 11월 24일, 다섯째 주가 없는 달)', () => {
    const lib = makeLib({
      closed: {
        weekly: [],
        monthly: [{ nth: [-1], weekday: 2 }],
        holiday: 'closed',
        appliesTo: ['lending'],
      },
    });
    expect(getDaySchedule(lib, 'lending', '2026-11-17', noHolidays).kind).toBe('open');
    expect(getDaySchedule(lib, 'lending', '2026-11-24', noHolidays)).toEqual({
      kind: 'closed',
      reason: { type: 'monthly', nth: -1, weekday: 2 },
    });
  });

  it('다섯째 주가 있는 달의 마지막 월요일 (2026년 11월 30일)', () => {
    const lib = makeLib({
      closed: {
        weekly: [],
        monthly: [{ nth: [-1], weekday: 1 }],
        holiday: 'closed',
        appliesTo: ['lending'],
      },
    });
    expect(getDaySchedule(lib, 'lending', '2026-11-23', noHolidays).kind).toBe('open');
    expect(getDaySchedule(lib, 'lending', '2026-11-30', noHolidays).kind).toBe('closed');
  });

  it('appliesTo에 없는 실은 정기 휴관을 적용하지 않음', () => {
    const lib = makeLib({
      rooms: {
        ...makeLib().rooms,
        reading: { label: '열람실', hours: week(['07:00', '22:00']), seasons: null, memo: null },
      },
      closed: { weekly: [1], monthly: [], holiday: 'closed', appliesTo: ['lending'] },
    });
    expect(getDaySchedule(lib, 'lending', '2026-11-16', ctx).kind).toBe('closed');
    expect(getDaySchedule(lib, 'reading', '2026-11-16', ctx).kind).toBe('open');
  });
});

describe('getDaySchedule: 공휴일', () => {
  it('공휴일과 정기 휴관이 겹치면 정기 휴관 사유', () => {
    expect(getDaySchedule(makeLib(), 'lending', '2026-10-05', ctx)).toEqual({
      kind: 'closed',
      reason: { type: 'weekly', weekday: 1 },
    });
  });

  it('공휴일 휴관(closed): 평일 공휴일과 임시공휴일(지방선거) 휴관', () => {
    expect(getDaySchedule(makeLib(), 'lending', '2026-05-05', ctx)).toEqual({
      kind: 'closed',
      reason: { type: 'holiday', name: '어린이날' },
    });
    expect(getDaySchedule(makeLib(), 'lending', '2026-06-03', ctx)).toMatchObject({
      kind: 'closed',
      reason: { type: 'holiday', name: '전국동시지방선거' },
    });
  });

  it('일요일인 공휴일: closed면 휴관, 보통 일요일은 운영', () => {
    expect(getDaySchedule(makeLib(), 'lending', '2026-03-01', ctx).kind).toBe('closed');
    expect(getDaySchedule(makeLib(), 'lending', '2026-03-08', ctx)).toMatchObject({
      kind: 'open',
      close: 17 * 60,
    });
  });

  it('일요일인 공휴일: closed_except_sunday면 일요일 시간으로 운영', () => {
    const lib = makeLib({ closed: { ...makeLib().closed, holiday: 'closed_except_sunday' } });
    expect(getDaySchedule(lib, 'lending', '2026-03-01', ctx)).toMatchObject({
      kind: 'open',
      holiday: '삼일절',
    });
    expect(getDaySchedule(lib, 'lending', '2026-05-05', ctx).kind).toBe('closed');
  });

  it('설·추석만 휴관(seollal_chuseok_only)', () => {
    const lib = makeLib({ closed: { ...makeLib().closed, holiday: 'seollal_chuseok_only' } });
    expect(getDaySchedule(lib, 'lending', '2026-02-17', ctx).kind).toBe('closed');
    expect(getDaySchedule(lib, 'lending', '2026-05-05', ctx).kind).toBe('open');
  });

  it('공휴일 운영(open): 공휴일 시간, 없으면 일요일 시간', () => {
    const base = makeLib({ closed: { ...makeLib().closed, holiday: 'open' } });
    expect(getDaySchedule(base, 'lending', '2026-05-05', ctx)).toMatchObject({
      kind: 'open',
      close: 17 * 60,
    });
    const withHoliday = makeLib({
      closed: { ...makeLib().closed, holiday: 'open' },
      rooms: {
        lending: {
          label: '자료실',
          hours: { ...week(['09:00', '22:00']), holiday: H('10:00', '16:00') },
          seasons: null,
          memo: null,
        },
        reading: null,
      },
    });
    expect(getDaySchedule(withHoliday, 'lending', '2026-05-05', ctx)).toMatchObject({
      open: 600,
      close: 960,
    });
  });
});

describe('getDaySchedule: 임시 휴관, 계절, 데이터 없음', () => {
  it('임시 휴관 기간(시작일·종료일 포함)과 대상 실', () => {
    const lib = makeLib({
      rooms: {
        ...makeLib().rooms,
        reading: { label: '열람실', hours: week(['07:00', '22:00']), seasons: null, memo: null },
      },
      closures: [{ from: '2026-12-01', to: '2026-12-14', reason: '시설 보수', rooms: ['lending'] }],
    });
    expect(getDaySchedule(lib, 'lending', '2026-11-30', ctx).kind).toBe('closed'); // 월요일
    expect(getDaySchedule(lib, 'lending', '2026-12-01', ctx)).toEqual({
      kind: 'closed',
      reason: { type: 'closure', reason: '시설 보수' },
    });
    expect(getDaySchedule(lib, 'lending', '2026-12-14', ctx).kind).toBe('closed');
    expect(getDaySchedule(lib, 'lending', '2026-12-15', ctx).kind).toBe('open');
    expect(getDaySchedule(lib, 'reading', '2026-12-02', ctx).kind).toBe('open');
  });

  it('사용자가 입력한 임시 휴관도 반영 (F14)', () => {
    const userClosures = new Map([
      [
        't-001',
        [{ from: '2026-11-18', to: '2026-11-18', reason: '내 메모', rooms: ['lending' as const] }],
      ],
    ]);
    const ctx = { holidays: HOLIDAYS, userClosures };
    expect(getDaySchedule(makeLib(), 'lending', '2026-11-18', ctx)).toEqual({
      kind: 'closed',
      reason: { type: 'closure', reason: '내 메모' },
    });
    // 다른 도서관과 다른 날, 지정하지 않은 실에는 영향 없음
    expect(getDaySchedule(makeLib({ id: 't-002' }), 'lending', '2026-11-18', ctx).kind).toBe(
      'open',
    );
    expect(getDaySchedule(makeLib(), 'lending', '2026-11-19', ctx).kind).toBe('open');
  });

  it('하절기·동절기 경계일 (3월 1일, 10월 31일 / 11월 1일)', () => {
    const lib = makeLib({
      closed: { weekly: [], monthly: [], holiday: 'closed', appliesTo: ['lending'] },
      rooms: {
        lending: {
          label: '열람실',
          hours: week(['08:00', '22:00']),
          seasons: [{ from: '03-01', to: '10-31', hours: week(['07:00', '22:00']) }],
          memo: null,
        },
        reading: null,
      },
    });
    const openAt = (d: string) => {
      const s = getDaySchedule(lib, 'lending', d, noHolidays);
      return s.kind === 'open' ? formatTime(s.open) : s.kind;
    };
    expect(['2026-02-28', '2026-03-01', '2026-10-31', '2026-11-01'].map(openAt)).toEqual([
      '08:00',
      '07:00',
      '07:00',
      '08:00',
    ]);
  });

  it('해를 넘기는 계절 구간 (11-01 ~ 02-28)', () => {
    const lib = makeLib({
      closed: { weekly: [], monthly: [], holiday: 'closed', appliesTo: ['lending'] },
      rooms: {
        lending: {
          label: '열람실',
          hours: week(['07:00', '22:00']),
          seasons: [{ from: '11-01', to: '02-28', hours: week(['08:00', '22:00']) }],
          memo: null,
        },
        reading: null,
      },
    });
    expect(getDaySchedule(lib, 'lending', '2027-01-15', noHolidays)).toMatchObject({ open: 480 });
    expect(getDaySchedule(lib, 'lending', '2027-03-02', noHolidays)).toMatchObject({ open: 420 });
  });

  it('그 요일 운영시간이 없으면 휴관, 실 시간 자체가 없으면 확인 필요, 실이 없으면 noRoom', () => {
    const noSunday = makeLib({
      closed: { weekly: [], monthly: [], holiday: 'closed', appliesTo: ['lending'] },
      rooms: {
        lending: {
          label: '자료실',
          hours: week(['09:00', '22:00'], ['09:00', '18:00'], null),
          seasons: null,
          memo: null,
        },
        reading: null,
      },
    });
    expect(getDaySchedule(noSunday, 'lending', '2026-11-22', noHolidays)).toEqual({
      kind: 'closed',
      reason: { type: 'noHours' },
    });

    const unknown = makeLib({
      rooms: {
        ...makeLib().rooms,
        reading: { label: '스터디실', hours: null, seasons: null, memo: null },
      },
    });
    expect(getDaySchedule(unknown, 'reading', '2026-11-18', ctx)).toEqual({ kind: 'unknown' });
    expect(getDaySchedule(makeLib(), 'reading', '2026-11-18', ctx)).toEqual({ kind: 'noRoom' });
  });
});

// ---------- 상태 배지 (F4) ----------

describe('getStatus', () => {
  const lib = makeLib(); // 평일 09:00~22:00, 주말 09:00~17:00, 월요일 휴관

  it('개관 전이면 곧 열림', () => {
    expect(getStatus(lib, 'lending', seoul('2026-11-18 08:30'), ctx)).toEqual({
      kind: 'opening',
      open: 540,
      close: 1320,
    });
  });

  it('마감까지 60분 넘게 남으면 운영 중, 60분 이하면 곧 닫힘', () => {
    expect(getStatus(lib, 'lending', seoul('2026-11-18 20:59'), ctx)).toMatchObject({
      kind: 'open',
      minutesLeft: 61,
    });
    expect(getStatus(lib, 'lending', seoul('2026-11-18 21:00'), ctx)).toMatchObject({
      kind: 'soon',
      minutesLeft: 60,
    });
  });

  it('마감 직전(1분 전)은 곧 닫힘, 마감 시각이 되면 운영 종료', () => {
    expect(getStatus(lib, 'lending', seoul('2026-11-18 21:59'), ctx)).toMatchObject({
      kind: 'soon',
      minutesLeft: 1,
    });
    expect(getStatus(lib, 'lending', seoul('2026-11-18 22:00'), ctx).kind).toBe('ended');
  });

  it('자정 직전: 운영 종료, 다음 개관은 내일 09:00', () => {
    expect(getStatus(lib, 'lending', seoul('2026-11-18 23:59'), ctx)).toEqual({
      kind: 'ended',
      close: 1320,
      next: { date: '2026-11-19', daysAhead: 1, open: 540 },
    });
  });

  it('다음 날이 휴관이면 그다음 개관일 (일요일 밤 → 화요일)', () => {
    expect(getStatus(lib, 'lending', seoul('2026-11-22 23:59'), ctx)).toMatchObject({
      kind: 'ended',
      next: { date: '2026-11-24', daysAhead: 2 },
    });
  });

  it('오늘 휴관이면 사유와 다음 개관', () => {
    expect(getStatus(lib, 'lending', seoul('2026-11-16 10:00'), ctx)).toEqual({
      kind: 'closed',
      reason: { type: 'weekly', weekday: 1 },
      next: { date: '2026-11-17', daysAhead: 1, open: 540 },
    });
  });

  it('공휴일 다음 날이 정기 휴관이면 그 다음 날 (2026-10-03 토 개천절 → 10-04 일)', () => {
    const holidays = new Map([
      ['2026-10-03', '개천절'],
      ['2026-10-05', '대체공휴일(개천절)'],
    ]);
    expect(getStatus(lib, 'lending', seoul('2026-10-03 12:00'), { holidays })).toMatchObject({
      kind: 'closed',
      next: { date: '2026-10-04' },
    });
    expect(getStatus(lib, 'lending', seoul('2026-10-04 18:00'), { holidays })).toMatchObject({
      kind: 'ended',
      next: { date: '2026-10-06', daysAhead: 2 },
    });
  });
});

// ---------- 남은 이용 시간 (F5, 5.5) ----------

describe('getUsable', () => {
  const lib = makeLib();

  it('운영 중 도착: 마감 − 도착', () => {
    expect(getUsable(lib, 'lending', seoul('2026-11-18 19:05'), 17, ctx)).toEqual({
      kind: 'usable',
      minutes: 22 * 60 - (19 * 60 + 22),
      from: 19 * 60 + 22,
      close: 1320,
      waitsForOpen: false,
    });
  });

  it('개관 전 도착: 마감 − 개관', () => {
    expect(getUsable(lib, 'lending', seoul('2026-11-18 08:00'), 20, ctx)).toMatchObject({
      kind: 'usable',
      minutes: 13 * 60,
      from: 540,
      waitsForOpen: true,
    });
  });

  it('도착하면 이미 마감, 다음 개관 안내', () => {
    expect(getUsable(lib, 'lending', seoul('2026-11-18 21:40'), 25, ctx)).toEqual({
      kind: 'closedOnArrival',
      next: { date: '2026-11-19', daysAhead: 1, open: 540 },
    });
  });

  it('출발지가 없으면 이동 시간 0으로 지금부터 마감까지', () => {
    expect(getUsable(lib, 'lending', seoul('2026-11-18 20:00'), 0, ctx)).toMatchObject({
      minutes: 120,
    });
  });

  it('오늘 운영하지 않으면 notToday', () => {
    expect(getUsable(lib, 'lending', seoul('2026-11-16 10:00'), 0, ctx)).toEqual({
      kind: 'notToday',
    });
  });
});
