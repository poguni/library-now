// 운영 상태 배지 (PRD F4)와 남은 이용 시간 (PRD F5, 5.5)
import { NEXT_OPEN_SEARCH_DAYS, SOON_CLOSE_MINUTES } from './config';
import { type ClosedReason, type ScheduleContext, getDaySchedule } from './schedule';
import { type DateKey, addDays, toSeoul } from './time';
import type { Library, RoomKey } from './types';

export interface NextOpen {
  date: DateKey;
  /** 0 = 오늘, 1 = 내일 … */
  daysAhead: number;
  /** 개관 시각(분) */
  open: number;
}

export type Status =
  | { kind: 'open'; close: number; minutesLeft: number }
  | { kind: 'soon'; close: number; minutesLeft: number }
  | { kind: 'opening'; open: number; close: number }
  | { kind: 'ended'; close: number; next: NextOpen | null }
  | { kind: 'closed'; reason: ClosedReason; next: NextOpen | null }
  | { kind: 'unknown' }
  | { kind: 'noRoom' };

export function findNextOpen(
  lib: Library,
  room: RoomKey,
  fromDate: DateKey,
  ctx: ScheduleContext,
): NextOpen | null {
  for (let i = 1; i <= NEXT_OPEN_SEARCH_DAYS; i++) {
    const date = addDays(fromDate, i);
    const day = getDaySchedule(lib, room, date, ctx);
    if (day.kind === 'open') return { date, daysAhead: i, open: day.open };
    if (day.kind === 'unknown' || day.kind === 'noRoom') return null;
  }
  return null;
}

/** 기준 시각(now)에 그 실의 상태 */
export function getStatus(lib: Library, room: RoomKey, now: Date, ctx: ScheduleContext): Status {
  const { date, minutes } = toSeoul(now);
  const day = getDaySchedule(lib, room, date, ctx);

  switch (day.kind) {
    case 'unknown':
    case 'noRoom':
      return day;
    case 'closed':
      return { kind: 'closed', reason: day.reason, next: findNextOpen(lib, room, date, ctx) };
    case 'open':
      if (minutes < day.open) return { kind: 'opening', open: day.open, close: day.close };
      if (minutes >= day.close) {
        return { kind: 'ended', close: day.close, next: findNextOpen(lib, room, date, ctx) };
      }
      return {
        kind: day.close - minutes <= SOON_CLOSE_MINUTES ? 'soon' : 'open',
        close: day.close,
        minutesLeft: day.close - minutes,
      };
  }
}

export type Usable =
  /** from: 이용을 시작하는 시각(분). 도착 시각 또는 개관 시각 */
  | { kind: 'usable'; minutes: number; from: number; close: number; waitsForOpen: boolean }
  /** 도착하면 이미 마감. next: 다음 개관 */
  | { kind: 'closedOnArrival'; next: NextOpen | null }
  | { kind: 'notToday' };

/**
 * 오늘 도착했을 때 이용 가능한 시간 (PRD 5.5)
 * 이용 가능 = 마감 − max(도착, 개관)
 * @param travelMinutes 예상 이동 시간. 출발지가 없으면 0 (F5)
 */
export function getUsable(
  lib: Library,
  room: RoomKey,
  now: Date,
  travelMinutes: number,
  ctx: ScheduleContext,
): Usable {
  const { date, minutes } = toSeoul(now);
  const day = getDaySchedule(lib, room, date, ctx);
  if (day.kind !== 'open') return { kind: 'notToday' };

  const arrival = minutes + travelMinutes;
  if (arrival >= day.close) {
    return { kind: 'closedOnArrival', next: findNextOpen(lib, room, date, ctx) };
  }
  const from = Math.max(arrival, day.open);
  return {
    kind: 'usable',
    minutes: day.close - from,
    from,
    close: day.close,
    waitsForOpen: arrival < day.open,
  };
}
