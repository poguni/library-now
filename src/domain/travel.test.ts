import { describe, expect, it } from 'vitest';
import { kakaoDirectionsUrl, naverDirectionsUrl, naverWebUrl } from './directions';
import { distanceKm, estimateTravel, formatKm, formatTravel } from './travel';

// 위도 1도 ≈ 111.19km. 경도 방향 이동은 위도에 따라 줄어듦
const base = { lat: 37.5, lng: 126.9 };
const north = (km: number) => ({ lat: base.lat + km / 111.195, lng: base.lng });

describe('거리 (하버사인)', () => {
  it('같은 점은 0, 남북 1km는 약 1km', () => {
    expect(distanceKm(base, base)).toBe(0);
    expect(distanceKm(base, north(1))).toBeCloseTo(1, 2);
  });

  it('신도림역 → 여의도 약 3.2km', () => {
    const sindorim = { lat: 37.50876, lng: 126.89127 };
    const yeouido = { lat: 37.52153, lng: 126.92429 };
    expect(distanceKm(sindorim, yeouido)).toBeGreaterThan(3.1);
    expect(distanceKm(sindorim, yeouido)).toBeLessThan(3.3);
  });
});

describe('이동 시간 추정 (F7)', () => {
  it('우회 반영 1.5km 이하는 도보 4.2km/h', () => {
    const t = estimateTravel(base, north(1)); // 1km × 1.3 = 1.3km
    expect(t.means).toBe('walk');
    expect(t.routeKm).toBeCloseTo(1.3, 2);
    expect(t.minutes).toBe(19); // 1.3 / 4.2 × 60 = 18.6
  });

  it('경계: 우회 1.5km는 도보, 넘으면 대중교통', () => {
    expect(estimateTravel(base, north(1.5 / 1.3 - 0.001)).means).toBe('walk');
    expect(estimateTravel(base, north(1.5 / 1.3 + 0.001)).means).toBe('transit');
  });

  it('대중교통: 10분 + 거리 ÷ 18km/h', () => {
    const t = estimateTravel(base, north(3)); // 3.9km → 10 + 13 = 23
    expect(t).toMatchObject({ means: 'transit', minutes: 23 });
  });

  it('같은 자리는 도보 1분 (0분으로 표시하지 않음)', () => {
    expect(estimateTravel(base, base).minutes).toBe(1);
  });

  it('표시 문구', () => {
    expect(formatKm(0.94)).toBe('0.9km');
    expect(formatKm(12.4)).toBe('12km');
    expect(formatTravel(estimateTravel(base, north(1)))).toBe('도보 약 19분');
    expect(formatTravel(estimateTravel(base, north(3)))).toBe('대중교통 약 23분');
  });
});

describe('길찾기 링크 (F8)', () => {
  const lib = { name: '구로기적의도서관', lat: 37.49, lng: 126.88 };
  const home = { name: '집', lat: 37.5, lng: 126.9 };

  it('카카오맵: 도착만, 출발 포함', () => {
    expect(kakaoDirectionsUrl(lib, null)).toBe(
      `https://map.kakao.com/link/to/${encodeURIComponent('구로기적의도서관')},37.49,126.88`,
    );
    expect(kakaoDirectionsUrl(lib, home)).toBe(
      `https://map.kakao.com/link/from/${encodeURIComponent('집')},37.5,126.9/to/${encodeURIComponent('구로기적의도서관')},37.49,126.88`,
    );
  });

  it('카카오맵: 이름의 쉼표·슬래시는 구분자와 섞이지 않게 뺌', () => {
    expect(kakaoDirectionsUrl({ ...lib, name: 'A,B/C' }, null)).toBe(
      'https://map.kakao.com/link/to/A%20B%20C,37.49,126.88',
    );
  });

  it('네이버 지도 앱 스킴과 웹 대체', () => {
    const url = new URL(naverDirectionsUrl(lib, home, 'https://example.github.io/library-now/'));
    expect(url.protocol).toBe('nmap:');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      slat: '37.5',
      slng: '126.9',
      sname: '집',
      dlat: '37.49',
      dlng: '126.88',
      dname: '구로기적의도서관',
      appname: 'https://example.github.io/library-now/',
    });
    expect(naverDirectionsUrl(lib, null, 'x')).not.toContain('slat');
    expect(naverWebUrl(lib)).toBe(
      `https://map.naver.com/p/search/${encodeURIComponent('구로기적의도서관')}`,
    );
  });
});
