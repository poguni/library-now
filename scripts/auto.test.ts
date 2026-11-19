import { describe, expect, it } from 'vitest';
import { groupRoomRows, parseClosedText, parseSeoulHours, stableId, toTime } from './auto';

const rule = (text: string) => {
  const p = parseClosedText(text);
  return { ...p.rule, annual: p.annual, unknown: p.unknown };
};

describe('휴관일 문장 자동 변환 (M5)', () => {
  it('매주 요일 + 공휴일', () => {
    expect(rule('매주 월+국가지정공휴일')).toMatchObject({
      weekly: [1],
      monthly: [],
      holiday: 'closed',
      unknown: [],
    });
    expect(rule('주말, 법정공휴일')).toMatchObject({ weekly: [0, 6], holiday: 'closed' });
    expect(rule('매주 토,일,월요일')).toMatchObject({ weekly: [0, 1, 6], holiday: 'open' });
    expect(rule('매주 화요일, 법정 공휴일, 임시 공휴일')).toMatchObject({
      weekly: [2],
      holiday: 'closed',
      unknown: [],
    });
  });

  it('"일요일을 제외한 법정공휴일"은 closed (평범한 일요일은 공휴일이 아님)', () => {
    expect(
      rule(
        '월요일+일요일을제외한법정공휴일(단,일요일이공휴일인경우휴관)+근로자의날+성북문화재단창립기념일(매년 9월 1일)',
      ),
    ).toMatchObject({ weekly: [1], holiday: 'closed', annual: ['05-01', '09-01'], unknown: [] });
    expect(rule('매주화요일+법정공휴일(일요일 제외)')).toMatchObject({
      weekly: [2],
      holiday: 'closed',
    });
  });

  it('매월 n째 요일', () => {
    expect(rule('매월둘째넷째월요일+정부지정공휴일').monthly).toEqual([
      { nth: [2, 4], weekday: 1 },
    ]);
    expect(rule('첫째 주 화+셋째 주 화+공휴일').monthly).toEqual([{ nth: [1, 3], weekday: 2 }]);
    expect(rule('매월둘째, 넷째 수요일')).toMatchObject({
      monthly: [{ nth: [2, 4], weekday: 3 }],
      holiday: 'open',
    });
    expect(rule('법정공휴일+매월 마지막주 일요일').monthly).toEqual([{ nth: [-1], weekday: 0 }]);
    expect(rule('1,3주 수요일 및 법정공휴일')).toMatchObject({
      weekly: [],
      monthly: [{ nth: [1, 3], weekday: 3 }],
      holiday: 'closed',
    });
    expect(rule('매월첫째/셋째 화요일 및 법정/임시공휴일')).toMatchObject({
      monthly: [{ nth: [1, 3], weekday: 2 }],
      holiday: 'closed',
      unknown: [],
    });
  });

  it('설·추석만 휴관과 1월 1일', () => {
    expect(rule('월+1월1일+설+추석')).toMatchObject({
      weekly: [1],
      holiday: 'seollal_chuseok_only',
      annual: ['01-01'],
    });
    expect(rule('설, 추석연휴')).toMatchObject({ holiday: 'seollal_chuseok_only', unknown: [] });
  });

  it('격주 등 옮길 수 없는 표기는 해석하지 않음', () => {
    expect(rule('월(격주)+일(2·4주)+법정공휴일').unknown).toHaveLength(1);
    expect(rule('매주 월요일+도서관 사정에 따라').unknown).toEqual(['도서관사정에따라']);
  });

  it('공휴일 언급이 없으면 알려 줌', () => {
    expect(parseClosedText('매주화요일').holidayMissing).toBe(true);
    expect(parseClosedText('매주화요일+공휴일').holidayMissing).toBe(false);
  });
});

describe('운영시간 자동 변환', () => {
  it('시각 형식', () => {
    expect(toTime('9:00')).toBe('09:00');
    expect(toTime('24:00')).toBeNull();
    expect(toTime('')).toBeNull();
  });

  it('서울 데이터 문장', () => {
    expect(parseSeoulHours('평일 : 09:00~22:00, 주말 : 09:00~17:00')).toEqual({
      weekday: { open: '09:00', close: '22:00' },
      saturday: { open: '09:00', close: '17:00' },
      sunday: { open: '09:00', close: '17:00' },
    });
    expect(parseSeoulHours('평일 : 09:00~18:00, 토요일 : 10:00~17:00')).toEqual({
      weekday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '17:00' },
      sunday: null,
    });
    expect(parseSeoulHours('화~토요일 09:00~17:00')).toBeNull();
  });
});

describe('실별로 나뉜 행 합치기', () => {
  const row = (name: string, lat = '37.6446', lng = '127.0439') => ({
    도서관명: name,
    시군구명: '도봉구',
    위도: lat,
    경도: lng,
  });

  it('같은 자리의 괄호 이름은 하나로, 대표는 종합자료실', () => {
    const groups = groupRoomRows([
      row('도봉문화정보도서관(어린이열람실)'),
      row('도봉문화정보도서관(종합자료실)'),
      row('학마을도서관', '37.6621', '127.0278'),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      name: '도봉문화정보도서관',
      rooms: ['어린이열람실', '종합자료실'],
    });
    expect(groups[0]!.row['도서관명']).toBe('도봉문화정보도서관(종합자료실)');
  });
});

describe('자동 id', () => {
  it('구 코드 + 이름 해시, 공백 차이는 같은 id', () => {
    expect(stableId('강남구', '논현도서관')).toMatch(/^gn-[0-9a-z]{7}$/);
    expect(stableId('강남구', '논현 도서관')).toBe(stableId('강남구', '논현도서관'));
    expect(stableId('강남구', '논현도서관')).not.toBe(stableId('강남구', '역삼도서관'));
  });
});
