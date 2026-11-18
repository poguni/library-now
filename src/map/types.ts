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

export interface MapHandle {
  /** 마커 목록을 통째로 바꿉니다 (바뀐 것만 다시 그림) */
  setMarkers(markers: readonly MapMarker[]): void;
  /** 선택 마커 강조 + 팝업 + 이동. null이면 선택 해제 */
  select(id: string | null): void;
  /** 목록에서 마우스를 올린 마커 강조 */
  hover(id: string | null): void;
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
}

export type CreateMap = (container: HTMLElement, options: MapOptions) => MapHandle;
