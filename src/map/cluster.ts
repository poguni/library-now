// 카카오맵용 마커 묶기 (M5). 카카오 MarkerClusterer는 기본 마커만 받아서(공식 문서: Array.<Marker>)
// 상태 기호·꼬리표가 있는 HTML 마커를 쓰려고 화면 좌표 기준으로 직접 묶습니다.

export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

export interface PointGroup {
  ids: string[];
  /** 묶음 원을 놓을 화면 좌표 (구성원 평균) */
  x: number;
  y: number;
}

/**
 * 앞에서부터 차례로, 이미 만든 묶음의 첫 점과 radius(px) 안이면 그 묶음에 넣습니다.
 * 같은 입력이면 늘 같은 결과(순서 유지)라 지도를 움직여도 덜 깜빡입니다.
 */
export function groupPoints(points: readonly ScreenPoint[], radius: number): PointGroup[] {
  const groups: { ids: string[]; ax: number; ay: number; sx: number; sy: number }[] = [];
  for (const p of points) {
    const g = groups.find((c) => Math.abs(c.ax - p.x) <= radius && Math.abs(c.ay - p.y) <= radius);
    if (g) {
      g.ids.push(p.id);
      g.sx += p.x;
      g.sy += p.y;
    } else {
      groups.push({ ids: [p.id], ax: p.x, ay: p.y, sx: p.x, sy: p.y });
    }
  }
  return groups.map((g) => ({ ids: g.ids, x: g.sx / g.ids.length, y: g.sy / g.ids.length }));
}

/** Leaflet 확대 수준(0~19) ↔ 카카오 레벨(1~14, 작을수록 가까움). 같은 축척이 되도록 맞춘 값 */
export function kakaoLevel(zoom: number): number {
  return Math.min(14, Math.max(1, Math.round(20 - zoom)));
}

export function leafletZoom(level: number): number {
  return 20 - level;
}
