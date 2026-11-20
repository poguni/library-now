import { describe, expect, it } from 'vitest';
import { groupPoints, kakaoLevel, leafletZoom } from './cluster';

describe('카카오맵 마커 묶기 (M5)', () => {
  it('반경 안의 점은 하나로, 먼 점은 따로', () => {
    const groups = groupPoints(
      [
        { id: 'a', x: 100, y: 100 },
        { id: 'b', x: 120, y: 90 },
        { id: 'c', x: 300, y: 100 },
      ],
      24,
    );
    expect(groups).toEqual([
      { ids: ['a', 'b'], x: 110, y: 95 },
      { ids: ['c'], x: 300, y: 100 },
    ]);
  });

  it('반경이 0이면 겹친 점만 묶음', () => {
    expect(
      groupPoints(
        [
          { id: 'a', x: 5, y: 5 },
          { id: 'b', x: 5, y: 5 },
          { id: 'c', x: 6, y: 5 },
        ],
        0,
      ).map((g) => g.ids),
    ).toEqual([['a', 'b'], ['c']]);
  });

  it('빈 목록', () => {
    expect(groupPoints([], 24)).toEqual([]);
  });
});

describe('확대 수준 바꾸기', () => {
  it('Leaflet 17 ≈ 카카오 3, 범위는 1~14', () => {
    expect(kakaoLevel(17)).toBe(3);
    expect(kakaoLevel(13)).toBe(7);
    expect(kakaoLevel(19)).toBe(1);
    expect(kakaoLevel(2)).toBe(14);
    expect(leafletZoom(kakaoLevel(14))).toBe(14);
  });
});
