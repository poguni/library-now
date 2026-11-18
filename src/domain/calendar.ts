// 휴관 달력 계산 (PRD F11, DESIGN 5.8·5.9)
import { type ScheduleContext, getDaySchedule } from './schedule';
import { type DateKey, daysInMonth, weekdayOf } from './time';
import type { Library, RoomKey } from './types';

export interface YearMonth {
  year: number;
  /** 1~12 */
  month: number;
}

export const toYearMonth = (date: DateKey): YearMonth => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
});

export function addMonths({ year, month }: YearMonth, n: number): YearMonth {
  const i = year * 12 + (month - 1) + n;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 일요일부터 시작하는 7열 격자. 앞뒤 빈칸은 null */
export function monthGrid({ year, month }: YearMonth): (DateKey | null)[] {
  const first = `${year}-${pad(month)}-01`;
  const days = Array.from(
    { length: daysInMonth(first) },
    (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`,
  );
  const cells: (DateKey | null)[] = [...Array<null>(weekdayOf(first)).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** 그 실이 그날 휴관인지 (정보 없음·실 없음은 휴관으로 보지 않음) */
export function isClosedOn(
  lib: Library,
  room: RoomKey,
  date: DateKey,
  ctx: ScheduleContext,
): boolean {
  return getDaySchedule(lib, room, date, ctx).kind === 'closed';
}

export interface OpenEntry {
  lib: Library;
  /** 분 */
  open: number;
  close: number;
}

/** 그날 그 실을 여는 도서관 (이름순) */
export function openOn(
  libs: readonly Library[],
  room: RoomKey,
  date: DateKey,
  ctx: ScheduleContext,
): OpenEntry[] {
  return libs
    .flatMap((lib) => {
      const day = getDaySchedule(lib, room, date, ctx);
      return day.kind === 'open' ? [{ lib, open: day.open, close: day.close }] : [];
    })
    .sort((a, b) => a.lib.name.localeCompare(b.lib.name, 'ko'));
}
