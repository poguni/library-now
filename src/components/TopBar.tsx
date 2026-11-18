// 상단 바 (DESIGN 5.1): 지역 칩(F2), 이용 모드(F3), 기준 시각 표시
import { BookOpen, Pencil } from 'lucide-react';
import { formatDate, ROOM_NAME } from '../domain/present';
import { formatTime, toSeoul } from '../domain/time';
import type { RoomKey } from '../domain/types';
import styles from './TopBar.module.css';

interface Props {
  districts: readonly string[];
  offDistricts: ReadonlySet<string>;
  onToggleDistrict(district: string): void;
  mode: RoomKey;
  onMode(mode: RoomKey): void;
  now: Date;
}

const MODES: { key: RoomKey; label: string; Icon: typeof BookOpen }[] = [
  { key: 'lending', label: '책 빌리기', Icon: BookOpen },
  { key: 'reading', label: '공부하기', Icon: Pencil },
];

export function TopBar({ districts, offDistricts, onToggleDistrict, mode, onMode, now }: Props) {
  const seoul = toSeoul(now);
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

      <span className={styles.now}>
        <span className={styles.label}>기준</span>
        <span>
          지금 · {formatDate(seoul.date)} {formatTime(seoul.minutes)}
        </span>
      </span>
    </header>
  );
}
