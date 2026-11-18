// 거리와 이동 시간 추정 (PRD F7)
import { DETOUR_FACTOR, TRANSIT_BASE_MINUTES, TRANSIT_KMH, WALK_KMH, WALK_MAX_KM } from './config';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Travel {
  /** 직선거리(km) */
  straightKm: number;
  /** 우회 계수를 곱한 예상 이동 거리(km) */
  routeKm: number;
  means: 'walk' | 'transit';
  minutes: number;
}

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** 하버사인 공식으로 구한 직선거리(km) */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function estimateTravel(from: LatLng, to: LatLng): Travel {
  const straightKm = distanceKm(from, to);
  const routeKm = straightKm * DETOUR_FACTOR;
  if (routeKm <= WALK_MAX_KM) {
    return {
      straightKm,
      routeKm,
      means: 'walk',
      minutes: Math.max(1, Math.round((routeKm / WALK_KMH) * 60)),
    };
  }
  return {
    straightKm,
    routeKm,
    means: 'transit',
    minutes: Math.round(TRANSIT_BASE_MINUTES + (routeKm / TRANSIT_KMH) * 60),
  };
}

/** "0.9km", "12km" */
export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`;
}

/** "도보 약 17분", "약 25분" (추정값임을 밝힘, F7) */
export function formatTravel(t: Travel): string {
  return t.means === 'walk' ? `도보 약 ${t.minutes}분` : `대중교통 약 ${t.minutes}분`;
}
