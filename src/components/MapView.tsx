// 지도 패널 (PRD F1, DESIGN 5.6·5.7). 지도 구현은 MapProvider 뒤에 있습니다.
import { LocateFixed, Maximize, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_CENTER, DEFAULT_ZOOM, KAKAO_JS_KEY } from '../map/config';
import { createKakaoMap } from '../map/kakao';
import { createLeafletMap } from '../map/leaflet';
import type { MapHandle, MapMarker, MapOrigin } from '../map/types';
import type { MapKind } from '../state/settings';
import { useOnline } from '../state/useOnline';
import styles from './MapView.module.css';

interface Props {
  /** 지도 종류 (PRD 7.1). 카카오맵을 못 불러오면 OSM으로 돌아갑니다 */
  kind: MapKind;
  markers: readonly MapMarker[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect(id: string): void;
  origin: MapOrigin | null;
  /** 지도를 눌러 위치를 고르는 중이면 안내 문구 */
  pickLabel: string | null;
  onPick(point: { lat: number; lng: number }): void;
  onCancelPick(): void;
  /** 바뀔 때마다 그 위치로 이동 */
  focus: { lat: number; lng: number } | null;
  onLocate(): void;
  className?: string;
}

const LEGEND = [
  { tone: 'open', label: '운영 중' },
  { tone: 'soon', label: '곧 닫힘' },
  { tone: 'opening', label: '곧 열림' },
  { tone: 'ended', label: '운영 종료' },
  { tone: 'closed', label: '휴관' },
] as const;

export function MapView(props: Props) {
  const { markers, selectedId, hoverId, onSelect, origin, pickLabel, onPick, focus } = props;
  const online = useOnline();
  const canvas = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  // 지도를 바꿔 새로 만들 때 지금 상태를 다시 넣으려고 최신 값을 기억합니다
  const latest = useRef({ markers, selectedId, hoverId, origin });
  const [kakaoFailed, setKakaoFailed] = useState(false);
  const [noticeClosed, setNoticeClosed] = useState(false);
  const kind = props.kind === 'kakao' && KAKAO_JS_KEY && !kakaoFailed ? 'kakao' : 'osm';

  useEffect(() => {
    onSelectRef.current = onSelect;
    onPickRef.current = onPick;
    latest.current = { markers, selectedId, hoverId, origin };
  });

  useEffect(() => {
    const create = kind === 'kakao' ? createKakaoMap(KAKAO_JS_KEY!) : createLeafletMap;
    const map = create(canvas.current!, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      onSelect: (id) => onSelectRef.current(id),
      onError: () => setKakaoFailed(true),
    });
    handle.current = map;
    const now = latest.current;
    map.setMarkers(now.markers);
    map.select(now.selectedId);
    map.hover(now.hoverId);
    map.setOrigin(now.origin);
    return () => {
      map.destroy();
      handle.current = null;
    };
  }, [kind]);

  useEffect(() => handle.current?.setMarkers(markers), [markers]);
  // 공유 링크처럼 데이터보다 선택이 먼저 오면, 마커가 생긴 뒤 다시 선택합니다
  const hasMarkers = markers.length > 0;
  useEffect(() => handle.current?.select(selectedId), [selectedId, hasMarkers]);
  useEffect(() => handle.current?.hover(hoverId), [hoverId]);
  useEffect(() => handle.current?.setOrigin(origin), [origin]);
  useEffect(() => {
    if (focus) handle.current?.panTo(focus);
  }, [focus]);
  useEffect(() => {
    if (!pickLabel) return;
    return handle.current?.startPick((p) => onPickRef.current(p));
  }, [pickLabel, kind]);

  return (
    <section className={`${styles.map} ${props.className ?? ''}`} aria-label="도서관 지도">
      {/* 지도 종류를 바꾸면 그릴 칸도 새로 만듭니다 (두 지도 라이브러리가 칸을 함께 쓰지 않게) */}
      <div key={kind} ref={canvas} className={styles.canvas} />

      {props.kind === 'kakao' && kakaoFailed && !noticeClosed && !pickLabel && (
        <div className={styles.pick} role="status">
          <span>카카오맵을 불러오지 못해 기본 지도(OpenStreetMap)로 보여 줍니다.</span>
          <button type="button" onClick={() => setNoticeClosed(true)}>
            닫기
          </button>
        </div>
      )}

      {!online && !pickLabel && (
        <div className={styles.pick} role="status">
          <span>오프라인입니다. 지도 배경은 연결되면 보입니다.</span>
        </div>
      )}

      {pickLabel && (
        <div className={styles.pick} role="status">
          <span>{pickLabel}</span>
          <button type="button" onClick={props.onCancelPick}>
            취소
          </button>
        </div>
      )}

      <div className={styles.ctrls}>
        <div className={styles.group}>
          <button type="button" aria-label="확대" onClick={() => handle.current?.zoomIn()}>
            <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button type="button" aria-label="축소" onClick={() => handle.current?.zoomOut()}>
            <Minus size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.group}>
          <button type="button" aria-label="내 위치로 이동" onClick={props.onLocate}>
            <LocateFixed size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button type="button" aria-label="전체 보기" onClick={() => handle.current?.fitAll()}>
            <Maximize size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul className={styles.legend} aria-label="범례">
        {LEGEND.map(({ tone, label }) => (
          <li key={tone} data-tone={tone}>
            <i aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
