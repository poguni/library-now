import { describe, expect, it } from 'vitest';
import {
  applyUsable,
  describeClosedRule,
  describeCoverage,
  describeDateRange,
  describeNextOpen,
  describeReason,
  formatDate,
  formatDuration,
  presentStatus,
} from './present';
import type { ClosedRule } from './types';

const rule = (r: Partial<ClosedRule>): ClosedRule => ({
  weekly: [],
  monthly: [],
  holiday: 'closed',
  appliesTo: ['lending', 'reading'],
  ...r,
});

describe('설정 데이터 정보 (PRD 8.5)', () => {
  const all = Array.from({ length: 25 }, (_, i) => `구${i}`);

  it('25개 구가 다 있으면 짧게, 아니면 구 이름', () => {
    expect(describeCoverage(all, 254)).toBe('서울 25개 구 공공도서관 254곳');
    expect(describeCoverage(['양천구', '구로구', '영등포구'], 34)).toBe(
      '구로구 · 양천구 · 영등포구 공공도서관 34곳',
    );
  });

  it('기준일은 처음 ~ 끝', () => {
    expect(describeDateRange(['2026-10-14', '2018-05-01', '2025-06-18'])).toBe(
      '2018-05-01 ~ 2026-10-14',
    );
    expect(describeDateRange(['2026-10-14'])).toBe('2026-10-14');
    expect(describeDateRange([])).toBe('–');
  });
});

describe('문구 도우미', () => {
  it('시간 길이', () => {
    expect(formatDuration(158)).toBe('2시간 38분');
    expect(formatDuration(45)).toBe('45분');
    expect(formatDuration(120)).toBe('2시간');
    expect(formatDuration(0)).toBe('0분');
  });

  it('날짜와 요일', () => {
    expect(formatDate('2026-11-20')).toBe('11월 20일(금)');
  });

  it('휴관 사유', () => {
    expect(describeReason({ type: 'weekly', weekday: 1 })).toBe('매주 월요일');
    expect(describeReason({ type: 'monthly', nth: 3, weekday: 3 })).toBe('매월 셋째 수요일');
    expect(describeReason({ type: 'monthly', nth: -1, weekday: 2 })).toBe('매월 마지막 주 화요일');
    expect(describeReason({ type: 'holiday', name: '어린이날' })).toBe('공휴일(어린이날)');
    expect(describeReason({ type: 'closure', reason: '시설 공사' })).toBe('시설 공사');
  });

  it('다음 개관', () => {
    expect(describeNextOpen({ date: '2026-11-19', daysAhead: 1, open: 540 })).toEqual({
      day: '내일',
      time: '09:00',
      label: '내일 개관',
    });
    expect(describeNextOpen({ date: '2026-11-20', daysAhead: 2, open: 540 }).label).toBe(
      '모레 개관',
    );
    expect(describeNextOpen({ date: '2026-11-21', daysAhead: 3, open: 600 }).label).toBe(
      '11월 21일(토) 개관',
    );
  });

  it('정기 휴관 규칙 문장', () => {
    expect(describeClosedRule(rule({ weekly: [1] }))).toBe('매주 월요일, 법정공휴일');
    expect(describeClosedRule(rule({ monthly: [{ nth: [2, 4], weekday: 1 }] }))).toBe(
      '매월 둘째·넷째 월요일, 법정공휴일',
    );
    expect(describeClosedRule(rule({ weekly: [1, 5], holiday: 'open' }))).toBe('매주 월·금요일');
    expect(describeClosedRule(rule({ holiday: 'open' }))).toBe('정기 휴관 없음');
    expect(describeClosedRule(rule({ weekly: [1], appliesTo: ['lending'] }))).toBe(
      '매주 월요일, 법정공휴일(자료실만)',
    );
  });
});

describe('상태 → 화면 문구 (F4)', () => {
  it('운영 중', () => {
    const v = presentStatus({ kind: 'open', close: 1320, minutesLeft: 158 }, 'reading');
    expect(v).toMatchObject({
      tone: 'open',
      badge: '운영 중',
      note: '열람실 22:00까지',
      big: '2시간 38분',
      summary: '지금부터 마감까지 2시간 38분',
      warn: false,
      off: false,
    });
  });

  it('곧 닫힘, 30분 미만이면 경고', () => {
    const v = presentStatus({ kind: 'soon', close: 1200, minutesLeft: 25 }, 'lending');
    expect(v).toMatchObject({ tone: 'soon', badge: '곧 닫힘 · 25분 남음', warn: true });
    expect(presentStatus({ kind: 'soon', close: 1200, minutesLeft: 40 }, 'lending').warn).toBe(
      false,
    );
  });

  it('곧 열림', () => {
    const v = presentStatus({ kind: 'opening', open: 540, close: 1320 }, 'lending');
    expect(v).toMatchObject({ badge: '09:00 개관', big: '09:00', bigLabel: '오늘 개관' });
  });

  it('운영 종료와 휴관은 다음 개관 시각', () => {
    const next = { date: '2026-11-19', daysAhead: 1, open: 540 };
    expect(presentStatus({ kind: 'ended', close: 1080, next }, 'lending')).toMatchObject({
      badge: '오늘 운영 종료',
      note: '자료실 18:00 마감',
      big: '09:00',
      bigLabel: '내일 개관',
      summary: '내일 09:00 개관',
      off: true,
    });
    expect(
      presentStatus({ kind: 'closed', reason: { type: 'weekly', weekday: 1 }, next }, 'lending'),
    ).toMatchObject({ badge: '오늘 휴관', note: '매주 월요일', tag: '휴관' });
    expect(
      presentStatus(
        { kind: 'closed', reason: { type: 'weekly', weekday: 1 }, next: null },
        'lending',
      ).bigLabel,
    ).toBe('다음 개관 정보 없음');
  });

  it('정보 없음과 열람실 없음', () => {
    expect(presentStatus({ kind: 'unknown' }, 'reading').badge).toBe('운영시간 확인 필요');
    expect(presentStatus({ kind: 'noRoom' }, 'reading')).toMatchObject({
      tone: 'none',
      badge: '열람실 없음',
      off: true,
    });
  });
});

describe('도착 기준 이용 가능 시간 (F5)', () => {
  const open = { kind: 'open', close: 1320, minutesLeft: 175 } as const;
  const usable = (minutes: number, waitsForOpen = false) =>
    ({ kind: 'usable', minutes, from: 0, close: 1320, waitsForOpen }) as const;

  it('운영 중: 도착 후 남는 시간', () => {
    const v = applyUsable(presentStatus(open, 'reading'), open, usable(158));
    expect(v).toMatchObject({
      big: '2시간 38분',
      bigLabel: '이용 가능',
      summary: '지금 가면 2시간 38분 이용 가능',
      warn: false,
    });
  });

  it('기준 시각을 직접 고르면 "그 시각에 가면" (F13)', () => {
    const v = applyUsable(presentStatus(open, 'reading'), open, usable(158), true);
    expect(v.summary).toBe('그 시각에 가면 2시간 38분 이용 가능');
  });

  it('곧 닫힘: 30분 미만이면 경고', () => {
    const soon = { kind: 'soon', close: 1200, minutesLeft: 55 } as const;
    expect(applyUsable(presentStatus(soon, 'lending'), soon, usable(29))).toMatchObject({
      big: '29분',
      bigLabel: '도착 후 이용',
      warn: true,
    });
  });

  it('개관 전 도착: 개관 시각은 그대로, 요약에 이용 시간', () => {
    const opening = { kind: 'opening', open: 540, close: 1320 } as const;
    const v = applyUsable(presentStatus(opening, 'lending'), opening, usable(780, true));
    expect(v).toMatchObject({ big: '09:00', summary: '09:00 개관 후 13시간 이용 가능' });
  });

  it('도착 시 마감: 흐리게, 다음 개관 안내', () => {
    const v = applyUsable(presentStatus(open, 'lending'), open, {
      kind: 'closedOnArrival',
      next: { date: '2026-11-19', daysAhead: 1, open: 540 },
    });
    expect(v).toMatchObject({
      big: '도착 시 마감',
      bigLabel: '내일 09:00 개관',
      off: true,
      badge: '운영 중',
    });
  });

  it('오늘 운영하지 않으면 바꾸지 않음', () => {
    const closed = { kind: 'closed', reason: { type: 'weekly', weekday: 1 }, next: null } as const;
    const base = presentStatus(closed, 'lending');
    expect(applyUsable(base, closed, { kind: 'notToday' })).toBe(base);
  });
});
