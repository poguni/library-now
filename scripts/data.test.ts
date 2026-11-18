import { describe, expect, it } from 'vitest';
import type { Library } from '../src/domain/types';
import { mergeLibraries, normalizeDistrict, type OverrideLibrary } from './merge';
import { validateHolidays, validateLibrary } from './validate';

const H = (open: string, close: string) => ({ open, close });

function override(partial: Partial<OverrideLibrary> = {}): OverrideLibrary {
  return {
    id: 'gr-001',
    name: '테스트도서관',
    district: '구로구',
    operator: '구립',
    match: { standard: '테스트도서관', seoul: null },
    rooms: {
      lending: {
        label: '종합자료실',
        hours: {
          weekday: H('09:00', '22:00'),
          saturday: H('09:00', '17:00'),
          sunday: null,
          holiday: null,
        },
        seasons: null,
        memo: null,
      },
      reading: null,
    },
    closed: { weekly: [1], monthly: [], holiday: 'closed', appliesTo: ['lending', 'reading'] },
    closedRaw: '매주 월요일',
    closures: [],
    notes: [],
    source: { verifiedBy: 'homepage', checkedAt: '2026-11-18', verifiedAt: null },
    ...partial,
  };
}

const stdRow = {
  도서관명: '테스트도서관',
  시도명: '서울특별시',
  시군구명: '구로구　',
  도서관유형: '공공도서관',
  소재지도로명주소: '서울특별시 구로구 어딘가 1',
  도서관전화번호: '02-000-0000',
  위도: '37.5',
  경도: '126.88',
  데이터기준일자: '2026-10-01',
};

describe('normalizeDistrict', () => {
  it('시 이름과 공백(전각 포함)을 지움', () => {
    expect(normalizeDistrict('서울특별시 도봉구')).toBe('도봉구');
    expect(normalizeDistrict('노원구　')).toBe('노원구');
  });
});

describe('mergeLibraries', () => {
  it('표준데이터 값을 쓰고 overrides가 우선', () => {
    const { libraries, problems } = mergeLibraries({
      standardRows: [stdRow],
      seoulRows: [],
      overrides: { version: 1, exclude: [], libraries: [override({ phone: '02-111-1111' })] },
    });
    expect(problems).toEqual([]);
    const lib = libraries[0]!;
    expect(lib.address).toBe('서울특별시 구로구 어딘가 1');
    expect(lib.phone).toBe('02-111-1111');
    expect([lib.lat, lib.lng]).toEqual([37.5, 126.88]);
    expect(lib.source).toMatchObject({ dataset: '전국도서관표준데이터', baseDate: '2026-10-01' });
  });

  it('원본에 있는데 overrides에도 exclude에도 없으면 문제로 보고', () => {
    const { problems } = mergeLibraries({
      standardRows: [stdRow, { ...stdRow, 도서관명: '새도서관' }],
      seoulRows: [],
      overrides: { version: 1, exclude: [], libraries: [override()] },
    });
    expect(problems).toEqual([expect.stringContaining('새도서관')]);
  });

  it('exclude에 있으면 보고하지 않음', () => {
    const { problems } = mergeLibraries({
      standardRows: [stdRow, { ...stdRow, 도서관명: '폐관도서관' }],
      seoulRows: [],
      overrides: {
        version: 1,
        exclude: [{ standard: '폐관도서관', reason: '폐관' }],
        libraries: [override()],
      },
    });
    expect(problems).toEqual([]);
  });

  it('연결할 원본 이름이 없으면 보고', () => {
    const { problems } = mergeLibraries({
      standardRows: [],
      seoulRows: [],
      overrides: {
        version: 1,
        exclude: [],
        libraries: [override({ lat: 37.5, lng: 126.9, address: '주소' })],
      },
    });
    expect(problems).toEqual([expect.stringContaining("'테스트도서관' 없음")]);
  });
});

describe('validateLibrary', () => {
  const base = (): Library =>
    mergeLibraries({
      standardRows: [stdRow],
      seoulRows: [],
      overrides: { version: 1, exclude: [], libraries: [override()] },
    }).libraries[0]!;

  it('정상 데이터는 통과', () => {
    expect(validateLibrary(base())).toEqual([]);
  });

  it('개관이 마감보다 늦거나 형식이 틀리면 실패', () => {
    const lib = base();
    lib.rooms.lending.hours!.weekday = H('22:00', '09:00');
    lib.rooms.lending.hours!.saturday = H('9:00', '17:00');
    expect(validateLibrary(lib)).toHaveLength(2);
  });

  it('서울 범위 밖 좌표, 잘못된 요일은 실패', () => {
    const lib = base();
    lib.lat = 35.1;
    lib.closed.weekly = [7];
    expect(validateLibrary(lib)).toHaveLength(2);
  });
});

describe('validateHolidays', () => {
  it('다른 해 날짜와 중복을 잡음', () => {
    const problems = validateHolidays({
      year: 2026,
      updatedAt: '2026-11-18',
      holidays: [
        { date: '2026-01-01', name: '신정' },
        { date: '2026-01-01', name: '신정' },
        { date: '2027-01-01', name: '신정' },
      ],
    });
    expect(problems).toHaveLength(2);
  });
});
