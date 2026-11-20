// 지도 교체 구조 (PRD 7.1). 화면 코드는 이 인터페이스만 알고, Leaflet·카카오맵 구현은 몰라도 됩니다.
import type { Tone } from '../domain/present';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  tone: Tone;
  name: string;
  /** 팝업 배지 글자 */
  badge: string;
  /** 마커 옆 꼬리표 */
  tag: string;
  /** 팝업 한 줄 요약 */
  summary: string;
}

export interface MapOrigin {
  lat: number;
  lng: number;
  name: string;
  kind: 'current' | 'home' | 'work';
}

export interface MapHandle {
  /** 마커 목록을 통째로 바꿉니다 (바뀐 것만 다시 그림) */
  setMarkers(markers: readonly MapMarker[]): void;
  /** 선택 마커 강조 + 팝업 + 이동. null이면 선택 해제 */
  select(id: string | null): void;
  /** 목록에서 마우스를 올린 마커 강조 */
  hover(id: string | null): void;
  /** 출발지 마커. 선택한 도서관이 있으면 둘 사이에 점선(방향 표시)을 그립니다 */
  setOrigin(origin: MapOrigin | null): void;
  /** 지도를 한 번 눌러 위치를 고르게 합니다. 돌려준 함수를 부르면 취소 */
  startPick(onPick: (point: { lat: number; lng: number }) => void): () => void;
  panTo(point: { lat: number; lng: number }): void;
  zoomIn(): void;
  zoomOut(): void;
  /** 지금 보이는 마커가 모두 들어오게 */
  fitAll(): void;
  destroy(): void;
}

export interface MapOptions {
  center: { lat: number; lng: number };
  zoom: number;
  onSelect(id: string): void;
  /** 지도를 불러오지 못했을 때 (카카오맵 SDK 실패 등) */
  onError?(): void;
}

export type CreateMap = (container: HTMLElement, options: MapOptions) => MapHandle;
