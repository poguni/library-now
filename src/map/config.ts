// 지도 설정 한곳 관리 (PRD 7.1). 타일 서비스를 바꿀 때는 이 파일만 고칩니다.

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = 19;

/** 기본 중심: 신도림역 (사용자 결정 2026-11-18) */
export const DEFAULT_CENTER = { lat: 37.50876, lng: 126.89127 };
export const DEFAULT_ZOOM = 13;

/** 꼬리표를 보이기 시작하는 확대 수준 (그보다 멀면 마커가 겹침) */
export const TAG_MIN_ZOOM = 14;

/** 카카오맵 JavaScript 키 (PRD 7.1·부록 A). 없으면 카카오맵 선택지를 숨깁니다 */
export const KAKAO_JS_KEY: string | null = import.meta.env.VITE_KAKAO_JS_KEY?.trim() || null;
