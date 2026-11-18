// 원본 CSV 행과 overrides를 합쳐 Library를 만듭니다 (PRD 6.2 1~4단계).
// 우선순위: overrides > 전국도서관표준데이터 > 서울시 공공도서관 현황정보
import type { ClosedRule, Library, Room } from '../src/domain/types';

export type CsvRow = Record<string, string>;

export interface OverrideLibrary {
  id: string;
  name: string;
  district: string;
  operator: string;
  match: { standard: string | null; seoul: string | null };
  homepage?: string | null;
  address?: string;
  phone?: string | null;
  lat?: number;
  lng?: number;
  rooms: { lending: Room; reading: Room | null };
  closed: ClosedRule;
  closedRaw: string;
  closures: Library['closures'];
  notes: string[];
  source: { verifiedBy: string; checkedAt: string; verifiedAt: string | null };
}

export interface OverridesFile {
  version: number;
  exclude: { standard?: string; seoul?: string; reason: string }[];
  libraries: OverrideLibrary[];
}

/** "서울특별시 노원구"(끝에 전각 공백) → "노원구". JS의 \s는 전각 공백도 포함합니다. */
export function normalizeDistrict(value: string): string {
  return value.replace(/서울특별시|서울시|서울/g, '').replace(/\s+/g, '');
}

export function normalizePhone(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  return v === '' ? null : v;
}

function toNumber(value: string | undefined): number | null {
  const n = Number((value ?? '').trim());
  return (value ?? '').trim() !== '' && Number.isFinite(n) ? n : null;
}

export interface MergeInput {
  standardRows: CsvRow[];
  seoulRows: CsvRow[];
  overrides: OverridesFile;
}

export interface MergeResult {
  libraries: Library[];
  problems: string[];
}

export function mergeLibraries({ standardRows, seoulRows, overrides }: MergeInput): MergeResult {
  const problems: string[] = [];
  const districts = new Set(overrides.libraries.map((l) => l.district));

  // 1) 서울 · 대상 구 · 공공도서관만
  const std = standardRows.filter(
    (r) =>
      (r['시도명'] ?? '').includes('서울') &&
      r['도서관유형'] === '공공도서관' &&
      districts.has(normalizeDistrict(r['시군구명'] ?? '')),
  );
  const seoul = seoulRows.filter((r) => districts.has((r['구명'] ?? '').trim()));

  const used = { std: new Set<string>(), seoul: new Set<string>() };
  for (const e of overrides.exclude) {
    if (e.standard) used.std.add(e.standard);
    if (e.seoul) used.seoul.add(e.seoul);
  }

  const libraries: Library[] = [];
  for (const o of overrides.libraries) {
    const s = o.match.standard ? std.find((r) => r['도서관명'] === o.match.standard) : undefined;
    const g = o.match.seoul ? seoul.find((r) => r['도서관명'] === o.match.seoul) : undefined;
    if (o.match.standard && !s) problems.push(`${o.id}: 표준데이터에 '${o.match.standard}' 없음`);
    if (o.match.seoul && !g) problems.push(`${o.id}: 서울 데이터에 '${o.match.seoul}' 없음`);
    if (s) used.std.add(o.match.standard!);
    if (g) used.seoul.add(o.match.seoul!);

    const lat = o.lat ?? toNumber(s?.['위도']) ?? toNumber(g?.['위도']);
    const lng = o.lng ?? toNumber(s?.['경도']) ?? toNumber(g?.['경도']);
    if (lat === null || lng === null) problems.push(`${o.id}: 좌표 없음`);

    libraries.push({
      id: o.id,
      name: o.name,
      district: o.district,
      type: '공공도서관',
      operator: o.operator,
      address: o.address ?? s?.['소재지도로명주소']?.trim() ?? g?.['주소']?.trim() ?? '',
      phone:
        o.phone !== undefined
          ? o.phone
          : (normalizePhone(s?.['도서관전화번호']) ?? normalizePhone(g?.['전화번호'])),
      homepage: o.homepage ?? null,
      lat: lat ?? NaN,
      lng: lng ?? NaN,
      rooms: o.rooms,
      closed: o.closed,
      closedRaw: o.closedRaw,
      closures: o.closures,
      notes: o.notes,
      source: {
        dataset: s ? '전국도서관표준데이터' : g ? '서울시 공공도서관 현황정보' : '도서관 홈페이지',
        baseDate: s?.['데이터기준일자'] || null,
        checkedAt: o.source.checkedAt,
        verifiedAt: o.source.verifiedAt,
        verifiedBy: o.source.verifiedBy,
      },
    });
  }

  // 원본에 새 도서관이 생겼는데 overrides에 없으면 알려 줌
  for (const r of std) {
    if (!used.std.has(r['도서관명']!))
      problems.push(
        `표준데이터의 '${r['도서관명']}'(${normalizeDistrict(r['시군구명']!)})이 overrides에 없음`,
      );
  }
  for (const r of seoul) {
    if (!used.seoul.has(r['도서관명']!))
      problems.push(`서울 데이터의 '${r['도서관명']}'(${r['구명']})이 overrides에 없음`);
  }

  return { libraries, problems };
}
