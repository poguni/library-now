// data/raw + data/overrides + data/holidays → public/data/*.json  (npm run data:build)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Papa from 'papaparse';
import type { HolidaysFile, LibrariesFile } from '../src/domain/types';
import { buildAutoLibraries, reviewMarkdown } from './auto';
import { mergeLibraries, type CsvRow, type OverridesFile } from './merge';
import { validateHolidays, validateLibraries } from './validate';

const ROOT = join(import.meta.dirname, '..');
const RAW = join(ROOT, 'data/raw');
const OUT = join(ROOT, 'public/data');

const FILES = {
  standard: '전국도서관표준데이터.csv',
  seoul: '서울시 공공도서관 현황정보.csv',
};

function readCsv(name: string): CsvRow[] {
  const bytes = readFileSync(join(RAW, name));
  // 공공데이터 CSV는 CP949(EUC-KR)
  const text = new TextDecoder('euc-kr').decode(bytes);
  const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) throw new Error(`${name}: CSV 오류 ${parsed.errors[0]!.message}`);
  return parsed.data;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function writeJson(name: string, data: unknown) {
  const text = JSON.stringify(data);
  writeFileSync(join(OUT, name), text);
  return Buffer.byteLength(text);
}

function main() {
  const overrides = readJson<OverridesFile>(join(ROOT, 'data/overrides/libraries.json'));
  const standardRows = readCsv(FILES.standard);
  const seoulRows = readCsv(FILES.seoul);
  const merged = mergeLibraries({ standardRows, seoulRows, overrides });

  const holidayFiles = readdirSync(join(ROOT, 'data/holidays'))
    .filter((f) => /^\d{4}\.json$/.test(f))
    .sort()
    .map((f) =>
      readJson<HolidaysFile & { sources?: string[]; note?: string }>(
        join(ROOT, 'data/holidays', f),
      ),
    );

  // 검수하지 않은 구는 원본만으로 자동 변환 (M5, 미검수)
  const auto = buildAutoLibraries({
    standardRows,
    seoulRows,
    skipDistricts: new Set(overrides.libraries.map((l) => l.district)),
    exclude: overrides.exclude,
    years: holidayFiles.map((h) => h.year),
  });
  const libraries = [...merged.libraries, ...auto.libraries];
  const problems = [...merged.problems, ...auto.problems];

  problems.push(...validateLibraries(libraries), ...holidayFiles.flatMap(validateHolidays));
  if (problems.length) {
    console.error(`검증 실패 (${problems.length}건):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });
  const generatedAt = new Date().toISOString();
  const librariesFile: LibrariesFile = { version: 1, generatedAt, libraries };
  const size = writeJson('libraries.json', librariesFile);

  for (const h of holidayFiles) {
    const out: HolidaysFile = { year: h.year, updatedAt: h.updatedAt, holidays: h.holidays };
    writeJson(`holidays-${h.year}.json`, out);
  }

  const baseDates = [...new Set(libraries.map((l) => l.source.baseDate).filter(Boolean))].sort();
  writeJson('meta.json', {
    version: 1,
    generatedAt,
    libraryCount: libraries.length,
    districts: [...new Set(libraries.map((l) => l.district))],
    baseDates,
    holidayYears: holidayFiles.map((h) => h.year),
    sources: [
      {
        name: '전국도서관표준데이터',
        provider: '공공데이터포털',
        file: FILES.standard,
        license: null,
      },
      {
        name: '서울시 공공도서관 현황정보',
        provider: '서울 열린데이터광장',
        file: FILES.seoul,
        license: null,
      },
      { name: '각 도서관 홈페이지', provider: '구립·교육청 도서관', license: null },
      { name: '공휴일', provider: '정부 발표·언론 보도를 직접 정리', license: null },
      { name: '지도·일부 좌표', provider: '© OpenStreetMap contributors', license: 'ODbL' },
    ],
  });

  writeFileSync(join(ROOT, 'data/auto-review.md'), reviewMarkdown(auto.review, generatedAt));

  const verified = libraries.filter((l) => l.source.verifiedAt).length;
  const autoOk = auto.review.filter((r) => r.ok).length;
  console.log(
    `자동 변환(미검수) ${auto.libraries.length}곳: 운영시간 계산 가능 ${autoOk}곳, 확인 필요 ${auto.libraries.length - autoOk}곳 → data/auto-review.md`,
  );
  console.log(
    `도서관 ${libraries.length}곳 (${(size / 1024).toFixed(1)}KB), 공휴일 ${holidayFiles.map((h) => h.year).join('·')}`,
  );
  console.log(`사용자 검수 완료 ${verified}/${libraries.length}곳`);
}

main();
