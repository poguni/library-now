// 카카오맵 JavaScript SDK 중 이 앱이 쓰는 부분만 적은 타입 (공식 문서 apis.map.kakao.com/web/documentation 기준)
declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  interface Point {
    x: number;
    y: number;
  }

  interface MapProjection {
    containerPointFromCoords(latlng: LatLng): Point;
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
    disableDoubleClickZoom?: boolean;
    keyboardShortcuts?: boolean;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number, options?: { animate?: boolean; anchor?: LatLng }): void;
    getLevel(): number;
    panTo(latlng: LatLng): void;
    setBounds(
      bounds: LatLngBounds,
      top?: number,
      right?: number,
      bottom?: number,
      left?: number,
    ): void;
    relayout(): void;
    getProjection(): MapProjection;
  }

  interface CustomOverlayOptions {
    content: HTMLElement | string;
    position: LatLng;
    map?: Map;
    clickable?: boolean;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    setPosition(latlng: LatLng): void;
    getPosition(): LatLng;
    setContent(content: HTMLElement | string): void;
    setZIndex(zIndex: number): void;
  }

  interface PolylineOptions {
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
    zIndex?: number;
  }

  class Polyline {
    constructor(options: PolylineOptions);
    setMap(map: Map | null): void;
  }

  interface MouseEvent {
    latLng: LatLng;
  }

  namespace event {
    function addListener(target: object, type: string, handler: (e?: MouseEvent) => void): void;
    function removeListener(target: object, type: string, handler: (e?: MouseEvent) => void): void;
  }
}

interface Window {
  kakao?: typeof kakao;
}
