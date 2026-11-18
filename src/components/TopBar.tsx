// 상단 바 (DESIGN 5.1): 지역 칩(F2), 이용 모드(F3), 기준 시각 표시
import { BookOpen, ChevronDown, Pencil, SlidersHorizontal } from 'lucide-react';
import { formatDate, ROOM_NAME } from '../domain/present';
import { formatTime, toSeoul } from '../domain/time';
import type { RoomKey } from '../domain/types';
import { PLACE_LABEL, type PlaceKind, type Places } from '../state/places';
import type { OriginChoice } from '../state/settings';
import styles from './TopBar.module.css';

interface Props {
  districts: readonly string[];
  offDistricts: ReadonlySet<string>;
  onToggleDistrict(district: string): void;
  mode: RoomKey;
  onMode(mode: RoomKey): void;
  now: Date;
  originChoice: OriginChoice;
  places: Places;
  onOriginChoice(choice: OriginChoice): void;
  /** 지도에서 집·직장 위치 지정 시작 */
  onPickPlace(kind: PlaceKind): void;
  onSettings(): void;
}

const MODES: { key: RoomKey; label: string; Icon: typeof BookOpen }[] = [
  { key: 'lending', label: '책 빌리기', Icon: BookOpen },
  { key: 'reading', label: '공부하기', Icon: Pencil },
];

export function TopBar(props: Props) {
  const { districts, offDistricts, onToggleDistrict, mode, onMode, now, places } = props;
  const seoul = toSeoul(now);

  const onOriginChange = (value: string) => {
    if (value === 'pick-home' || value === 'pick-work') {
      props.onPickPlace(value === 'pick-home' ? 'home' : 'work');
    } else {
      props.onOriginChoice(value as OriginChoice);
    }
  };
  return (
    <header className={`${styles.top} ln-top`}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          <BookOpen size={22} strokeWidth={1.8} />
        </span>
        <span className={styles.brandText}>
          <b className="ln-brand-title">지금 열린 도서관</b>
          <span>LIBRARY NOW</span>
        </span>
      </div>

      <div className={styles.chips} role="group" aria-label="지역 선택">
        {districts.map((d) => {
          const on = !offDistricts.has(d);
          return (
            <button
              key={d}
              type="button"
              className={styles.chip}
              aria-pressed={on}
              onClick={() => onToggleDistrict(d)}
            >
              {d}
            </button>
          );
        })}
      </div>

      <span className={styles.vline} aria-hidden="true" />

      <div className={styles.seg} role="group" aria-label="이용 모드">
        {MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            title={`${ROOM_NAME[key]} 운영시간 기준`}
            onClick={() => onMode(key)}
          >
            <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <span className={styles.spacer} />

      <label className={styles.origin}>
        <span className={styles.label}>출발</span>
        <select value={props.originChoice} onChange={(e) => onOriginChange(e.target.value)}>
          <option value="current">현재 위치</option>
          {(['home', 'work'] as const).map((kind) =>
            places[kind] ? (
              <option key={kind} value={kind}>
                {places[kind].name}
              </option>
            ) : null,
          )}
          {(['home', 'work'] as const).map((kind) => (
            <option key={`pick-${kind}`} value={`pick-${kind}`}>
              {PLACE_LABEL[kind]} {places[kind] ? '다시 지정' : '지정'}…
            </option>
          ))}
        </select>
        <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
      </label>

      <span className={styles.now}>
        <span className={styles.label}>기준</span>
        <span>
          지금 · {formatDate(seoul.date)} {formatTime(seoul.minutes)}
        </span>
      </span>

      <button
        type="button"
        className={styles.settings}
        aria-label="설정"
        onClick={props.onSettings}
      >
        <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </header>
  );
}
