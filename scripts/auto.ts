// 수기 검수(overrides)가 없는 구의 도서관을 공공데이터 원본만으로 만듭니다 (M5, 미검수).
// 원본 값을 옮기기만 하고, 해석하지 못한 값은 비워 둡니다(화면에 "운영시간 확인 필요").
import type { ClosedRule, Closure, Library, Room, TimeRange, WeekHours } from '../src/domain/types';
import { type CsvRow, normalizeDistrict, normalizePhone } from './merge';

/** 구 이름 → id 앞부분 (기존 overrides: gr, ydp, yc) */
export const DISTRICT_CODE: Record<string, string> = {
  종로구: 'jn',
  중구: 'jg',
  용산구: 'ys',
  성동구: 'sd',
  광진구: 'gj',
  동대문구: 'ddm',
  중랑구: 'jr',
  성북구: 'sb',
  강북구: 'gb',
  도봉구: 'db',
  노원구: 'nw',
  은평구: 'ep',
  서대문구: 'sdm',
  마포구: 'mp',
  양천구: 'yc',
  강서구: 'gs',
  구로구: 'gr',
  금천구: 'gc',
  영등포구: 'ydp',
  동작구: 'dj',
  관악구: 'ga',
  서초구: 'sc',
  강남구: 'gn',
  송파구: 'sp',
  강동구: 'gd',
};

const WEEKDAY: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const ORDINAL: Record<string, number> = {
  첫째: 1,
  둘째: 2,
  셋째: 3,
  넷째: 4,
  다섯째: 5,
  마지막: -1,
};

export interface ParsedClosed {
  rule: ClosedRule;
  /** 해마다 같은 날 휴관 ("MM-DD") */
  annual: string[];
  /** 해석하지 못한 조각. 하나라도 있으면 규칙을 쓰지 않습니다 */
  unknown: string[];
  /** 원문에 공휴일 언급이 없음 */
  holidayMissing: boolean;
}

/**
 * 표준데이터·서울 데이터의 휴관일 문장을 규칙으로 바꿉니다.
 * 예: "매주 월+법정공휴일", "매월둘째넷째월요일+정부지정공휴일", "주말, 법정공휴일"
 * "일요일을 제외한 법정공휴일"은 평범한 일요일을 공휴일로 보지 않는다는 뜻이라 holiday: "closed"로 둡니다
 * (_verification-2026-11-18.md 공통 발견 1).
 */
export function parseClosedText(raw: string): ParsedClosed {
  const weekly = new Set<number>();
  const monthly: ClosedRule['monthly'] = [];
  const annual: string[] = [];
  const unknown: string[] = [];
  let holiday = false;
  let seollalChuseok = false;

  let text = raw.replace(/\s+/g, '');

  // 격주 표기는 규칙으로 옮길 수 없음 (예: "월(격주)+일(2·4주)")
  if (/격주|\(\d[·,]\d주\)/.test(text)) {
    return {
      rule: emptyRule(),
      annual,
      unknown: [raw.trim()],
      holidayMissing: false,
    };
  }

  // 창립기념일(8월12일), 근로자의날(5월1일), 1월1일
  text = text.replace(/[가-힣]*창립기념일\((?:매년)?(\d{1,2})월(\d{1,2})일\)/g, (_, m, d) => {
    annual.push(mmdd(m, d));
    return '+';
  });
  text = text.replace(/근로자의날(?:\(5월1일\))?/g, () => {
    annual.push('05-01');
    return '+';
  });
  text = text.replace(/1월1일/g, () => {
    annual.push('01-01');
    return '+';
  });
  text = text.replace(/임시휴관일?/g, '+');

  // 공휴일 문구 (괄호 설명까지 함께 지움)
  text = text.replace(
    /(?:일요일을제외한)?(?:(?:법정|국가지정|정부지정|임시)[/·]?)*공휴일(?:\([^)]*\))?/g,
    () => {
      holiday = true;
      return '+';
    },
  );

  // 매월 n째 요일: "매월둘째넷째월요일", "둘째주월요일", "첫째주화", "매월첫째/셋째화요일", "1,3주수요일"
  const addMonthly = (nth: number[], day: string) => {
    const weekday = WEEKDAY[day]!;
    const same = monthly.find((m) => m.weekday === weekday);
    if (same) same.nth = [...new Set([...same.nth, ...nth])].sort((a, b) => a - b);
    else monthly.push({ nth: [...nth].sort((a, b) => a - b), weekday });
    return '+';
  };
  const ord = '(?:첫째|둘째|셋째|넷째|다섯째|마지막)';
  const monthlyRe = new RegExp(
    `(?:매월)?((?:${ord}(?:주)?[,·/]?)+)([일월화수목금토])(?:요일)?`,
    'g',
  );
  text = text.replace(monthlyRe, (_, ords: string, day: string) =>
    addMonthly(
      [...ords.matchAll(new RegExp(ord, 'g'))].map((m) => ORDINAL[m[0]]!),
      day,
    ),
  );
  text = text.replace(
    /(?:매월)?([1-5](?:[,·][1-5])*)주(?:차)?([일월화수목금토])(?:요일)?/g,
    (_, nums: string, day: string) => addMonthly(nums.split(/[,·]/).map(Number), day),
  );

  for (const token of text.split(/[+,및、/]+/).filter(Boolean)) {
    const w = /^(?:매주)?([일월화수목금토])(?:요일)?$/.exec(token);
    if (w) weekly.add(WEEKDAY[w[1]!]!);
    else if (token === '주말') [0, 6].forEach((d) => weekly.add(d));
    else if (/^(?:설|설날|추석)(?:연휴)?$/.test(token)) seollalChuseok = true;
    else unknown.push(token);
  }

  const rule: ClosedRule = {
    weekly: [...weekly].sort((a, b) => a - b),
    monthly,
    holiday: holiday ? 'closed' : seollalChuseok ? 'seollal_chuseok_only' : 'open',
    appliesTo: ['lending', 'reading'],
  };
  return {
    rule,
    annual: [...new Set(annual)].sort(),
    unknown,
    holidayMissing: !holiday && !seollalChuseok,
  };
}

function emptyRule(): ClosedRule {
  return { weekly: [], monthly: [], holiday: 'open', appliesTo: ['lending', 'reading'] };
}

const mmdd = (m: string, d: string) => `${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** "9:00" → "09:00". 형식이 틀리면 null */
export function toTime(value: string | undefined): string | null {
  const m = TIME.exec((value ?? '').trim());
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : null;
}

function range(open: string | undefined, close: string | undefined): TimeRange | null | undefined {
  const o = toTime(open);
  const c = toTime(close);
  if (!o || !c || o >= c) return undefined; // 해석 불가
  return { open: o, close: c };
}

/** 서울 데이터 "평일 : 09:00~22:00, 주말 : 09:00~17:00" 또는 "…, 토요일 : 10:00~17:00" */
export function parseSeoulHours(
  text: string,
): { weekday: TimeRange; saturday: TimeRange | null; sunday: TimeRange | null } | null {
  const t = text.replace(/\s+/g, '');
  const pick = (label: string) => {
    const m = new RegExp(`${label}:?(\\d{1,2}:\\d{2})~(\\d{1,2}:\\d{2})`).exec(t);
    return m ? range(m[1], m[2]) : undefined;
  };
  const weekday = pick('평일');
  if (!weekday) return null;
  const weekend = pick('주말');
  return {
    weekday,
    saturday: weekend ?? pick('토요일') ?? null,
    sunday: weekend ?? pick('일요일') ?? null,
  };
}

/** "도봉문화정보도서관(종합자료실)" → "도봉문화정보도서관" */
export const baseName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '').trim();

/**
 * 표준데이터가 한 도서관을 실별로 나눠 올린 행(이름 끝 괄호, 같은 자리)을 하나로 합칩니다.
 * 대표 행은 "종합"이 들어간 실, 없으면 첫 행입니다.
 */
export function groupRoomRows(rows: CsvRow[]): { row: CsvRow; name: string; rooms: string[] }[] {
  const out: { row: CsvRow; name: string; rooms: string[]; members: CsvRow[] }[] = [];
  for (const r of rows) {
    const name = r['도서관명']!.trim();
    const isRoom = name !== baseName(name);
    const p = { lat: num(r['위도']) ?? 0, lng: num(r['경도']) ?? 0 };
    const group = isRoom
      ? out.find(
          (g) =>
            g.rooms.length > 0 &&
            g.row['시군구명'] === r['시군구명'] &&
            distanceM(p, { lat: num(g.row['위도']) ?? 0, lng: num(g.row['경도']) ?? 0 }) < 30,
        )
      : undefined;
    const room = isRoom ? /\(([^)]*)\)\s*$/.exec(name)![1]!.trim() : '';
    if (!group) {
      out.push({
        row: r,
        name: isRoom ? baseName(name) : name,
        rooms: isRoom ? [room] : [],
        members: [r],
      });
      continue;
    }
    group.members.push(r);
    group.rooms.push(room);
    if (/종합/.test(room) && !/종합/.test(group.row['도서관명']!)) group.row = r;
    // 가장 많이 나온 이름을 씀
    const counts = new Map<string, number>();
    for (const m of group.members) {
      const b = baseName(m['도서관명']!);
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    group.name = [...counts].sort((a, b) => b[1] - a[1])[0]![0];
  }
  return out.map(({ row, name, rooms }) => ({ row, name, rooms }));
}

/** 이름으로 만든 짧은 해시. 원본이 바뀌어도 이름이 같으면 id가 그대로라 즐겨찾기·메모가 유지됩니다 */
export function stableId(district: string, name: string): string {
  let h = 0x811c9dc5;
  for (const ch of name.replace(/\s+/g, '')) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${DISTRICT_CODE[district] ?? 'x'}-${h.toString(36).padStart(7, '0').slice(-7)}`;
}

const squash = (s: string) => s.replace(/\s+/g, '').replace(/서울특별시|서울/g, '');

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 88_000);
}

const num = (v: string | undefined) => {
  const n = Number((v ?? '').trim());
  return (v ?? '').trim() !== '' && Number.isFinite(n) ? n : null;
};

function operatorOf(name: string, operator: string): string {
  if (/교육청/.test(name + operator)) return '교육청';
  return operator.replace(/^서울특별시\s*/, '').trim();
}

export interface AutoReview {
  id: string;
  name: string;
  district: string;
  from: '표준' | '서울' | '표준+서울';
  closedRaw: string;
  ok: boolean;
  notes: string[];
}

export interface AutoInput {
  standardRows: CsvRow[];
  seoulRows: CsvRow[];
  /** 수기 검수가 끝난 구 (자동 생성하지 않음) */
  skipDistricts: ReadonlySet<string>;
  /** 제외 목록 (overrides.exclude) */
  exclude: { standard?: string; seoul?: string }[];
  /** 해마다 휴관일을 펼칠 연도 */
  years: number[];
}

const READING_UNKNOWN: Room = {
  label: '열람실',
  hours: null,
  seasons: null,
  memo: '열람실이 있는지와 운영시간을 아직 확인하지 않았습니다.',
};

export function buildAutoLibraries(input: AutoInput): {
  libraries: Library[];
  review: AutoReview[];
  problems: string[];
} {
  const { skipDistricts, years } = input;
  const exStd = new Set(input.exclude.map((e) => e.standard).filter(Boolean));
  const exSeoul = new Set(input.exclude.map((e) => e.seoul).filter(Boolean));

  const groups = groupRoomRows(
    input.standardRows.filter(
      (r) =>
        (r['시도명'] ?? '').includes('서울') &&
        r['도서관유형'] === '공공도서관' &&
        !skipDistricts.has(normalizeDistrict(r['시군구명'] ?? '')) &&
        !exStd.has(r['도서관명']),
    ),
  );
  const std = groups.map((g) => g.row);
  const groupOf = new Map(groups.map((g) => [g.row, g]));
  const seoul = input.seoulRows.filter(
    (r) => !skipDistricts.has((r['구명'] ?? '').trim()) && !exSeoul.has(r['도서관명']),
  );

  // 서울 데이터 행을 표준 행과 짝지음: 같은 구에서 이름이 같거나 150m 안
  const pairOf = new Map<CsvRow, CsvRow>();
  const seoulOnly: CsvRow[] = [];
  for (const g of seoul) {
    const d = (g['구명'] ?? '').trim();
    const cands = std.filter((s) => normalizeDistrict(s['시군구명'] ?? '') === d);
    const p = { lat: num(g['위도']) ?? 0, lng: num(g['경도']) ?? 0 };
    const hit =
      cands.find((s) => squash(groupOf.get(s)!.name) === squash(g['도서관명']!)) ??
      cands.find(
        (s) =>
          !pairOf.has(s) &&
          distanceM(p, { lat: num(s['위도']) ?? 0, lng: num(s['경도']) ?? 0 }) < 150,
      );
    if (hit && !pairOf.has(hit)) pairOf.set(hit, g);
    else seoulOnly.push(g);
  }

  const libraries: Library[] = [];
  const review: AutoReview[] = [];
  const problems: string[] = [];

  const make = (s: CsvRow | undefined, g: CsvRow | undefined) => {
    const group = s ? groupOf.get(s) : undefined;
    const name = (group?.name ?? g?.['도서관명'] ?? '').trim();
    const district = s ? normalizeDistrict(s['시군구명']!) : g!['구명']!.trim();
    const id = stableId(district, name);
    const closedRaw = (s?.['휴관일'] || g?.['정기 휴관일'] || '').trim();
    const notes: string[] = [];

    const parsed = parseClosedText(closedRaw);
    let ok = closedRaw !== '' && parsed.unknown.length === 0;
    if (!closedRaw) notes.push('휴관일 정보 없음');
    if (parsed.unknown.length) notes.push(`해석 못 한 휴관일: ${parsed.unknown.join(', ')}`);
    const rule = ok ? parsed.rule : emptyRule();

    // 운영시간: 표준데이터(평일·토요일·공휴일 칸) 또는 서울 데이터(평일·주말 문장)
    let hours: WeekHours | null = null;
    let memo: string | null = null;
    if (ok && s) {
      const weekday = range(s['평일운영시작시각'], s['평일운영종료시각']);
      const sat = rule.weekly.includes(6)
        ? null
        : range(s['토요일운영시작시각'], s['토요일운영종료시각']);
      // 표준데이터의 "공휴일 운영시간"은 실제로는 일요일 시간이었습니다 (검수한 30곳 모두)
      const sun = rule.weekly.includes(0)
        ? null
        : range(s['공휴일운영시작시각'], s['공휴일운영종료시각']);
      if (weekday === undefined || sat === undefined || sun === undefined) {
        const raw = [
          `평일 ${s['평일운영시작시각']}~${s['평일운영종료시각']}`,
          `토요일 ${s['토요일운영시작시각']}~${s['토요일운영종료시각']}`,
          `공휴일(일요일) ${s['공휴일운영시작시각']}~${s['공휴일운영종료시각']}`,
        ].join(', ');
        notes.push(`운영시간 칸이 비었거나 00:00: ${raw}`);
        memo = `표준데이터 운영시간: ${raw}`;
      } else {
        hours = { weekday, saturday: sat, sunday: sun, holiday: null };
        if (sun) memo = "일요일 시간은 표준데이터의 '공휴일 운영시간' 값입니다.";
      }
    } else if (ok && g) {
      const h = parseSeoulHours(g['운영시간'] ?? '');
      if (!h) notes.push(`운영시간 문장 해석 못 함: ${g['운영시간'] ?? ''}`);
      else {
        const sat = rule.weekly.includes(6) ? null : h.saturday;
        const sun = rule.weekly.includes(0) ? null : h.sunday;
        if ((!rule.weekly.includes(6) && !sat) || (!rule.weekly.includes(0) && !sun)) {
          notes.push(`주말 운영시간 없음: ${g['운영시간']}`);
        } else {
          hours = { weekday: h.weekday, saturday: sat, sunday: sun, holiday: null };
        }
      }
      if (!hours) memo = `서울 데이터 운영시간: ${g['운영시간'] || '정보 없음'}`;
    }
    if (!hours) ok = false;

    const libNotes: string[] = [];
    if (group?.rooms.length) {
      libNotes.push(`표준데이터에는 실별로 나뉘어 있습니다: ${group.rooms.join(', ')}`);
    }
    if (parsed.holidayMissing && hours) {
      notes.push('원문에 공휴일 휴관 언급이 없어 공휴일에도 운영하는 것으로 계산');
      libNotes.push('휴관일 원문에 공휴일 언급이 없어 공휴일에도 운영하는 것으로 계산합니다.');
    }

    const closures: Closure[] = ok
      ? years.flatMap((y) =>
          parsed.annual.map((d) => ({
            from: `${y}-${d}`,
            to: `${y}-${d}`,
            reason: '정기 휴관일(원문)',
            rooms: ['lending', 'reading'] as Closure['rooms'],
          })),
        )
      : [];

    const lat = num(s?.['위도']) ?? num(g?.['위도']);
    const lng = num(s?.['경도']) ?? num(g?.['경도']);
    if (lat === null || lng === null) problems.push(`${id}(${name}): 좌표 없음`);

    const homepage = (s?.['홈페이지주소'] || g?.['홈페이지 URL'] || '').trim() || null;

    libraries.push({
      id,
      name,
      district,
      type: '공공도서관',
      operator: operatorOf(name, s?.['운영기관명'] ?? ''),
      address: (s?.['소재지도로명주소'] || g?.['주소'] || '').trim(),
      phone: normalizePhone(s?.['도서관전화번호']) ?? normalizePhone(g?.['전화번호']),
      homepage: homepage && !/^https?:\/\//.test(homepage) ? `http://${homepage}` : homepage,
      lat: lat ?? NaN,
      lng: lng ?? NaN,
      rooms: {
        lending: { label: '자료실', hours, seasons: null, memo },
        reading: READING_UNKNOWN,
      },
      closed: rule,
      closedRaw,
      closures,
      notes: libNotes,
      source: {
        dataset: s ? '전국도서관표준데이터' : '서울시 공공도서관 현황정보',
        baseDate: s?.['데이터기준일자'] || null,
        checkedAt: null,
        verifiedAt: null,
        verifiedBy: 'auto',
      },
    });
    review.push({
      id,
      name,
      district,
      from: s && g ? '표준+서울' : s ? '표준' : '서울',
      closedRaw,
      ok,
      notes,
    });
  };

  for (const s of std) make(s, pairOf.get(s));
  for (const g of seoulOnly) make(undefined, g);

  return { libraries, review, problems };
}

/** 사람이 훑어볼 검수 목록 (data/auto-review.md) */
export function reviewMarkdown(review: AutoReview[], generatedAt: string): string {
  const bad = review.filter((r) => !r.ok);
  const noted = review.filter((r) => r.ok && r.notes.length);
  const lines = [
    '# 자동 변환 도서관 검수 목록',
    '',
    `> \`npm run data:build\`가 만든 파일입니다. 직접 고치지 마세요. 생성: ${generatedAt}`,
    '>',
    '> 검수를 마친 도서관은 `data/overrides/libraries.json`으로 옮기면 이 목록에서 빠집니다.',
    '',
    `- 자동 변환 ${review.length}곳 · 운영시간 계산 가능 ${review.length - bad.length}곳 · 확인 필요 ${bad.length}곳`,
    '',
    `## 확인 필요 (${bad.length}곳)`,
    '',
    '| 구 | 도서관 | id | 원본 | 휴관일 원문 | 사유 |',
    '|---|---|---|---|---|---|',
    ...bad.map(
      (r) =>
        `| ${r.district} | ${r.name} | ${r.id} | ${r.from} | ${r.closedRaw || '-'} | ${r.notes.join('; ')} |`,
    ),
    '',
    `## 계산은 되지만 살펴볼 것 (${noted.length}곳)`,
    '',
    '| 구 | 도서관 | id | 휴관일 원문 | 메모 |',
    '|---|---|---|---|---|',
    ...noted.map(
      (r) => `| ${r.district} | ${r.name} | ${r.id} | ${r.closedRaw} | ${r.notes.join('; ')} |`,
    ),
    '',
  ];
  return lines.join('\n');
}
