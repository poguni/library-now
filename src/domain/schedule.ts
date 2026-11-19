// 특정 날짜·특정 실의 운영 여부 판정 (PRD 5.2)
// 순서: 임시 휴관 → 정기 휴관 → 공휴일 → 요일·계절 운영시간
import type { Closure, Library, Room, RoomKey, WeekHours } from './types';
import { type DateKey, daysInMonth, parseTime, weekdayOf } from './time';

/** 날짜 → 공휴일 이름 */
export type HolidayMap = ReadonlyMap<DateKey, string>;

export type ClosedReason =
  | { type: 'closure'; reason: string }
  | { type: 'weekly'; weekday: number }
  | { type: 'monthly'; nth: number; weekday: number }
  | { type: 'holiday'; name: string }
  | { type: 'noHours' };

export type DaySchedule =
  /** open·close는 그날 자정부터의 분. 자정을 넘기면 close가 1440보다 큼 */
  | { kind: 'open'; open: number; close: number; holiday: string | null }
  | { kind: 'closed'; reason: ClosedReason }
  /** 그 실의 운영시간 데이터가 없음 */
  | { kind: 'unknown' }
  /** 그 실이 없음 (예: 열람실 없는 도서관) */
  | { kind: 'noRoom' };

export interface ScheduleContext {
  holidays: HolidayMap;
  /** 사용자가 직접 입력한 임시 휴관 (F14). 도서관 ID → 휴관 기간 */
  userClosures?: ReadonlyMap<string, readonly Closure[]>;
}

/** 그 달의 몇째 주 요일인지 (1~5)와 마지막 주인지 */
function nthOfMonth(date: DateKey): { nth: number; last: boolean } {
  const day = Number(date.slice(8, 10));
  return { nth: Math.ceil(day / 7), last: day + 7 > daysInMonth(date) };
}

function inClosure(c: Closure, date: DateKey, room: RoomKey): boolean {
  return c.from <= date && date <= c.to && c.rooms.includes(room);
}

/** 계절 구간("MM-DD")에 날짜가 들어가는지. from > to면 해를 넘기는 구간 */
function inSeason(from: string, to: string, date: DateKey): boolean {
  const md = date.slice(5);
  return from <= to ? from <= md && md <= to : md >= from || md <= to;
}

/** 그날 적용되는 주간 운영시간 (계절 구간 반영) */
export function hoursFor(room: Room, date: DateKey): WeekHours | null {
  const season = room.seasons?.find((s) => inSeason(s.from, s.to, date));
  return season ? season.hours : room.hours;
}

function dayKey(weekday: number): 'weekday' | 'saturday' | 'sunday' {
  return weekday === 0 ? 'sunday' : weekday === 6 ? 'saturday' : 'weekday';
}

export function getDaySchedule(
  lib: Library,
  roomKey: RoomKey,
  date: DateKey,
  ctx: ScheduleContext,
): DaySchedule {
  const room = lib.rooms[roomKey];
  if (!room) return { kind: 'noRoom' };

  // 1. 임시 휴관
  const closure = [...lib.closures, ...(ctx.userClosures?.get(lib.id) ?? [])].find((c) =>
    inClosure(c, date, roomKey),
  );
  if (closure) return { kind: 'closed', reason: { type: 'closure', reason: closure.reason } };

  const weekday = weekdayOf(date);
  const rule = lib.closed;
  const ruleApplies = rule.appliesTo.includes(roomKey);

  // 2. 정기 휴관
  if (ruleApplies) {
    if (rule.weekly.includes(weekday))
      return { kind: 'closed', reason: { type: 'weekly', weekday } };
    const { nth, last } = nthOfMonth(date);
    for (const m of rule.monthly) {
      if (m.weekday === weekday && (m.nth.includes(nth) || (last && m.nth.includes(-1)))) {
        return {
          kind: 'closed',
          reason: { type: 'monthly', nth: last && m.nth.includes(-1) ? -1 : nth, weekday },
        };
      }
    }
  }

  // 3. 공휴일
  const holiday = ctx.holidays.get(date) ?? null;
  let useHolidayHours = false;
  if (holiday && ruleApplies) {
    const closed =
      rule.holiday === 'closed' ||
      (rule.holiday === 'closed_except_sunday' && weekday !== 0) ||
      (rule.holiday === 'seollal_chuseok_only' && /설날|추석/.test(holiday));
    if (closed) return { kind: 'closed', reason: { type: 'holiday', name: holiday } };
    useHolidayHours = rule.holiday === 'open';
  }

  // 4. 요일·계절 운영시간
  const hours = hoursFor(room, date);
  if (!hours) return { kind: 'unknown' };
  const range = useHolidayHours ? (hours.holiday ?? hours.sunday) : hours[dayKey(weekday)];

  // 5. 그날 운영시간이 없으면 휴관
  if (!range) return { kind: 'closed', reason: { type: 'noHours' } };

  const open = parseTime(range.open);
  let close = parseTime(range.close);
  if (close <= open) close += 1440; // 자정을 넘겨 운영 (1차 범위에는 없음)
  return { kind: 'open', open, close, holiday };
}
