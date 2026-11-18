// 계산 상수는 이 파일 한 곳에만 둡니다 (PRD F4·F5·F7).

/** 마감까지 이 시간(분) 이하로 남으면 "곧 닫힘" (F4) */
export const SOON_CLOSE_MINUTES = 60;

/** 이용 가능 시간이 이보다 적으면 경고 색 (F5) */
export const SHORT_USE_MINUTES = 30;

/** 다음 개관일을 찾을 때 앞으로 살펴볼 최대 일수 */
export const NEXT_OPEN_SEARCH_DAYS = 31;

// ---- 이동 시간 추정 (F7). 직선거리 기반 추정이며 실제 경로 안내는 지도 앱이 담당 ----

/** 직선거리에 곱하는 우회 계수 */
export const DETOUR_FACTOR = 1.3;

/** 이 거리(km, 우회 반영) 이하는 도보로 가정 */
export const WALK_MAX_KM = 1.5;

/** 도보 속도(km/h) */
export const WALK_KMH = 4.2;

/** 대중교통: 정류장까지 걷기·기다리기(분) + 이동 속도(km/h) */
export const TRANSIT_BASE_MINUTES = 10;
export const TRANSIT_KMH = 18;

/** 현재 위치 오차가 이보다 크면(m) 집·직장 출발지를 권함 (F6) */
export const LOW_ACCURACY_METERS = 500;
