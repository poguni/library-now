// 목록 한 줄 만들기, 필터, 정렬 (PRD F5·F7·F9)
import {
  applyUsable,
  describeClosedRule,
  describeNextOpen,
  presentStatus,
  type StatusView,
} from './present';
import type { ScheduleContext } from './schedule';
import { type Status, type Usable, getStatus, getUsable } from './status';
import { formatTime } from './time';
import { type LatLng, type Travel, estimateTravel } from './travel';
import type { Library, RoomKey } from './types';

export interface LibraryRow {
  lib: Library;
  status: Status;
  usable: Usable;
  /** 선택한 모드의 화면 문구 */
  view: StatusView;
  /** 다른 실의 화면 문구 */
  other: StatusView;
  /** 출발지가 없으면 null */
  travel: Travel | null;
  /** 정기 휴관 규칙 문장 */
  ruleText: string;
}

const OTHER: Record<RoomKey, RoomKey> = { lending: 'reading', reading: 'lending' };

export function buildRows(
  libraries: readonly Library[],
  opts: { mode: RoomKey; now: Date; ctx: ScheduleContext; origin: LatLng | null },
): LibraryRow[] {
  const { mode, now, ctx, origin } = opts;
  return libraries.map((lib) => {
    const status = getStatus(lib, mode, now, ctx);
    const travel = origin ? estimateTravel(origin, lib) : null;
    const usable = getUsable(lib, mode, now, travel?.minutes ?? 0, ctx);
    const base = presentStatus(status, mode);
    return {
      lib,
      status,
      usable,
      view: travel ? applyUsable(base, status, usable) : base,
      other: presentStatus(getStatus(lib, OTHER[mode], now, ctx), OTHER[mode]),
      travel,
      ruleText: describeClosedRule(lib.closed),
    };
  });
}

/** 목록 정렬 (F7): 거리순 / 남은 이용 시간순 / 이름순 */
export type SortKey = 'distance' | 'time' | 'name';
/** 목록 필터 (F9): 지금 열린 곳만 / 21시 이후까지 운영 */
export type FilterKey = 'openNow' | 'late';

/** "21시 이후까지 운영" 기준 시각(분) */
export const LATE_CLOSE_MINUTES = 21 * 60;

const isOpenNow = (s: Status) => s.kind === 'open' || s.kind === 'soon';
const closesLate = (s: Status) =>
  (s.kind === 'open' || s.kind === 'soon' || s.kind === 'opening') && s.close >= LATE_CLOSE_MINUTES;

export function filterRows(
  rows: readonly LibraryRow[],
  opts: { offDistricts: ReadonlySet<string>; query: string; filters: readonly FilterKey[] },
): LibraryRow[] {
  const q = opts.query.replace(/\s+/g, '');
  return rows.filter(
    (r) =>
      !opts.offDistricts.has(r.lib.district) &&
      r.lib.name.replace(/\s+/g, '').includes(q) &&
      (!opts.filters.includes('openNow') || isOpenNow(r.status)) &&
      (!opts.filters.includes('late') || closesLate(r.status)),
  );
}

const usableMinutes = (u: Usable) => (u.kind === 'usable' ? u.minutes : -1);
const byName = (a: LibraryRow, b: LibraryRow) => a.lib.name.localeCompare(b.lib.name, 'ko');

/**
 * 거리순·남은 시간순은 오늘 이용할 수 없는 곳(휴관, 운영 종료, 도착 시 마감, 시간 정보 없음)을 뒤로 보냅니다 (F5).
 * 출발지가 없으면 거리순 대신 남은 시간순으로 정렬합니다.
 */
export function sortRows(rows: readonly LibraryRow[], sort: SortKey): LibraryRow[] {
  const list = [...rows];
  if (sort === 'name') return list.sort(byName);
  const byDistance = sort === 'distance' && list.every((r) => r.travel);
  return list.sort(
    (a, b) =>
      Number(a.usable.kind !== 'usable') - Number(b.usable.kind !== 'usable') ||
      (byDistance
        ? a.travel!.straightKm - b.travel!.straightKm
        : usableMinutes(b.usable) - usableMinutes(a.usable)) ||
      byName(a, b),
  );
}

/** 결과가 없을 때 제안: 다음 개관이 가장 빠른 곳 (F9) */
export function soonestOpening(
  rows: readonly LibraryRow[],
): { row: LibraryRow; text: string } | null {
  let best: { row: LibraryRow; days: number; open: number; when: string } | null = null;
  for (const row of rows) {
    const s = row.status;
    let c: { days: number; open: number; when: string } | null = null;
    if (s.kind === 'opening') {
      c = { days: 0, open: s.open, when: `오늘 ${formatTime(s.open)}` };
    } else if ((s.kind === 'ended' || s.kind === 'closed') && s.next) {
      const d = describeNextOpen(s.next);
      c = { days: s.next.daysAhead, open: s.next.open, when: `${d.day} ${d.time}` };
    }
    if (c && (!best || c.days < best.days || (c.days === best.days && c.open < best.open))) {
      best = { row, ...c };
    }
  }
  return best && { row: best.row, text: `${best.row.lib.name} (${best.when})` };
}
