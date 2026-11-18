// 계산 결과를 화면 문구로 바꿉니다 (PRD F4·F5·F10, DESIGN 5.4·5.5)
import { SHORT_USE_MINUTES } from './config';
import type { ClosedReason } from './schedule';
import type { NextOpen, Status } from './status';
import { type DateKey, formatTime, weekdayOf } from './time';
import type { ClosedRule, RoomKey } from './types';

export type Tone = 'open' | 'soon' | 'opening' | 'ended' | 'closed' | 'unknown' | 'none';

export const ROOM_NAME: Record<RoomKey, string> = { lending: '자료실', reading: '열람실' };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const NTH: Record<number, string> = {
  1: '첫째',
  2: '둘째',
  3: '셋째',
  4: '넷째',
  5: '다섯째',
  [-1]: '마지막 주',
};

/** 158 → "2시간 38분" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/** "2026-11-20" → "11월 20일(금)" */
export function formatDate(date: DateKey): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일(${WEEKDAYS[weekdayOf(date)]})`;
}

export function describeReason(reason: ClosedReason): string {
  switch (reason.type) {
    case 'closure':
      return reason.reason;
    case 'weekly':
      return `매주 ${WEEKDAYS[reason.weekday]}요일`;
    case 'monthly':
      return `매월 ${NTH[reason.nth]} ${WEEKDAYS[reason.weekday]}요일`;
    case 'holiday':
      return `공휴일 (${reason.name})`;
    case 'noHours':
      return '오늘 운영하지 않음';
  }
}

/** 다음 개관: { day: "내일", time: "09:00", label: "내일 개관" } */
export function describeNextOpen(next: NextOpen): { day: string; time: string; label: string } {
  const day = next.daysAhead === 1 ? '내일' : next.daysAhead === 2 ? '모레' : formatDate(next.date);
  return { day, time: formatTime(next.open), label: `${day} 개관` };
}

/** 정기 휴관 규칙 문장 (F10): "매주 월요일, 법정공휴일" */
export function describeClosedRule(rule: ClosedRule): string {
  const parts: string[] = [];
  if (rule.weekly.length > 0) {
    parts.push(`매주 ${rule.weekly.map((w) => WEEKDAYS[w]).join('·')}요일`);
  }
  for (const m of rule.monthly) {
    parts.push(`매월 ${m.nth.map((n) => NTH[n]).join('·')} ${WEEKDAYS[m.weekday]}요일`);
  }
  const holiday = {
    closed: '법정공휴일',
    closed_except_sunday: '법정공휴일(일요일 제외)',
    seollal_chuseok_only: '설날·추석',
    open: null,
  }[rule.holiday];
  if (holiday) parts.push(holiday);
  if (parts.length === 0) return '정기 휴관 없음';
  const text = parts.join(', ');
  return rule.appliesTo.length === 1 ? `${text} (${ROOM_NAME[rule.appliesTo[0]!]}만)` : text;
}

export interface StatusView {
  tone: Tone;
  /** 배지 글자 */
  badge: string;
  /** 배지 옆 보조 글자 */
  note: string;
  /** 카드 오른쪽 큰 숫자 */
  big: string;
  bigLabel: string;
  /** 큰 숫자를 경고 색으로 (30분 미만) */
  warn: boolean;
  /** 지도 마커 꼬리표 */
  tag: string;
  /** 팝업 한 줄 요약 */
  summary: string;
  /** 지금 이용할 수 없음 (카드 흐리게) */
  off: boolean;
}

/**
 * 상태 → 화면 문구. M1에서는 출발지가 없으므로 "지금부터 마감까지"로 표시합니다 (F5).
 */
export function presentStatus(status: Status, room: RoomKey): StatusView {
  const name = ROOM_NAME[room];
  switch (status.kind) {
    case 'open':
    case 'soon': {
      const left = formatDuration(status.minutesLeft);
      return {
        tone: status.kind,
        badge: status.kind === 'open' ? '운영 중' : `곧 닫힘 · ${status.minutesLeft}분 남음`,
        note: `${name} ${formatTime(status.close)}까지`,
        big: left,
        bigLabel: '마감까지',
        warn: status.minutesLeft < SHORT_USE_MINUTES,
        tag: left,
        summary: `지금부터 마감까지 ${left}`,
        off: false,
      };
    }
    case 'opening': {
      const open = formatTime(status.open);
      return {
        tone: 'opening',
        badge: `${open} 개관`,
        note: `${name} ${open}–${formatTime(status.close)}`,
        big: open,
        bigLabel: '오늘 개관',
        warn: false,
        tag: `${open} 개관`,
        summary: `오늘 ${open} 개관`,
        off: false,
      };
    }
    case 'ended':
    case 'closed': {
      const next = status.next ? describeNextOpen(status.next) : null;
      const ended = status.kind === 'ended';
      return {
        tone: status.kind,
        badge: ended ? '오늘 운영 종료' : '오늘 휴관',
        note: ended ? `${name} ${formatTime(status.close)} 마감` : describeReason(status.reason),
        big: next?.time ?? '–',
        bigLabel: next?.label ?? '다음 개관 정보 없음',
        warn: false,
        tag: ended ? '운영 종료' : '휴관',
        summary: next ? `${next.day} ${next.time} 개관` : '다음 개관 정보 없음',
        off: true,
      };
    }
    case 'unknown':
      return {
        tone: 'unknown',
        badge: '운영시간 확인 필요',
        note: '홈페이지에서 확인해 주세요',
        big: '–',
        bigLabel: '시간 정보 없음',
        warn: false,
        tag: '확인 필요',
        summary: `${name} 운영시간 확인 필요`,
        off: false,
      };
    case 'noRoom':
      return {
        tone: 'none',
        badge: `${name} 없음`,
        note: '자료실만 운영',
        big: '–',
        bigLabel: `${name} 없음`,
        warn: false,
        tag: `${name} 없음`,
        summary: `${name}이 없는 도서관입니다`,
        off: true,
      };
  }
}

/** 목록 기본 순서: 이용 가능한 곳 먼저 (출발지가 생기면 M2에서 거리순으로 바뀜) */
export const TONE_ORDER: Record<Tone, number> = {
  open: 0,
  soon: 1,
  opening: 2,
  ended: 3,
  closed: 4,
  unknown: 5,
  none: 6,
};
