// 데이터 검증 (PRD 6.2 5단계). 문제 목록을 돌려주며, 비어 있으면 통과입니다.
import type { HolidaysFile, Library, Room, WeekHours } from '../src/domain/types';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// 서울시 경계를 넉넉히 감싼 범위
export const SEOUL_BOUNDS = { minLat: 37.41, maxLat: 37.72, minLng: 126.76, maxLng: 127.19 };

function checkWeek(h: WeekHours, where: string, out: string[]) {
  for (const [day, r] of Object.entries(h)) {
    if (!r) continue;
    if (!TIME.test(r.open) || !TIME.test(r.close)) {
      out.push(`${where}.${day}: 시각 형식 오류 (${r.open}~${r.close})`);
    } else if (r.open >= r.close) {
      out.push(`${where}.${day}: 개관(${r.open})이 마감(${r.close})보다 늦음`);
    }
  }
}

function checkRoom(room: Room, where: string, out: string[]) {
  if (!room.label) out.push(`${where}: label 없음`);
  if (room.hours) checkWeek(room.hours, `${where}.hours`, out);
  for (const [i, s] of (room.seasons ?? []).entries()) {
    if (!MMDD.test(s.from) || !MMDD.test(s.to)) out.push(`${where}.seasons[${i}]: 날짜 형식 오류`);
    checkWeek(s.hours, `${where}.seasons[${i}]`, out);
  }
}

export function validateLibrary(lib: Library): string[] {
  const out: string[] = [];
  const at = (field: string) => `${lib.id}(${lib.name}).${field}`;

  for (const key of ['id', 'name', 'district', 'address'] as const) {
    if (!lib[key]) out.push(at(key) + ': 값 없음');
  }
  if (lib.searchUrl !== null && !lib.searchUrl.startsWith('https://'))
    out.push(at('searchUrl') + ': https:// 주소만');
  const b = SEOUL_BOUNDS;
  if (!(lib.lat >= b.minLat && lib.lat <= b.maxLat && lib.lng >= b.minLng && lib.lng <= b.maxLng)) {
    out.push(at('lat/lng') + `: 서울 범위 밖 (${lib.lat}, ${lib.lng})`);
  }
  checkRoom(lib.rooms.lending, at('rooms.lending'), out);
  if (lib.rooms.reading) checkRoom(lib.rooms.reading, at('rooms.reading'), out);

  const { weekly, monthly } = lib.closed;
  if (weekly.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
    out.push(at('closed.weekly') + ': 요일은 0~6');
  for (const m of monthly) {
    if (m.weekday < 0 || m.weekday > 6) out.push(at('closed.monthly') + ': 요일은 0~6');
    if (m.nth.some((n) => n !== -1 && (n < 1 || n > 5)))
      out.push(at('closed.monthly') + ': nth는 1~5 또는 -1');
  }
  for (const c of lib.closures) {
    if (!DATE.test(c.from) || !DATE.test(c.to) || c.from > c.to)
      out.push(at('closures') + `: 기간 오류 ${c.from}~${c.to}`);
  }
  return out;
}

export function validateLibraries(libs: Library[]): string[] {
  const out = libs.flatMap(validateLibrary);
  const seen = new Set<string>();
  for (const l of libs) {
    if (seen.has(l.id)) out.push(`id 중복: ${l.id}`);
    seen.add(l.id);
  }
  return out;
}

export function validateHolidays(file: HolidaysFile): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const h of file.holidays) {
    if (!DATE.test(h.date) || !h.date.startsWith(`${file.year}-`))
      out.push(`공휴일 ${file.year}: 날짜 오류 ${h.date}`);
    if (!h.name) out.push(`공휴일 ${h.date}: 이름 없음`);
    if (seen.has(h.date)) out.push(`공휴일 ${h.date}: 중복`);
    seen.add(h.date);
  }
  return out;
}
