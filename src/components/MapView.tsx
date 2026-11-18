// 지도 패널 (PRD F1, DESIGN 5.6·5.7). 지도 구현은 MapProvider 뒤에 있습니다.
import { LocateFixed, Maximize, Minus, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../map/config';
import { createLeafletMap } from '../map/leaflet';
import type { MapHandle, MapMarker, MapOrigin } from '../map/types';
import styles from './MapView.module.css';

interface Props {
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
  const canvas = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onPickRef.current = onPick;
  }, [onSelect, onPick]);

  useEffect(() => {
    const map = createLeafletMap(canvas.current!, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      onSelect: (id) => onSelectRef.current(id),
    });
    handle.current = map;
    return () => {
      map.destroy();
      handle.current = null;
    };
  }, []);

  useEffect(() => handle.current?.setMarkers(markers), [markers]);
  useEffect(() => handle.current?.select(selectedId), [selectedId]);
  useEffect(() => handle.current?.hover(hoverId), [hoverId]);
  useEffect(() => handle.current?.setOrigin(origin), [origin]);
  useEffect(() => {
    if (focus) handle.current?.panTo(focus);
  }, [focus]);
  useEffect(() => {
    if (!pickLabel) return;
    return handle.current?.startPick((p) => onPickRef.current(p));
  }, [pickLabel]);

  return (
    <section className={`${styles.map} ${props.className ?? ''}`} aria-label="도서관 지도">
      <div ref={canvas} className={styles.canvas} />

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
