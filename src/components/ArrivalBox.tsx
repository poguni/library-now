// "지금 가면 몇 시간 이용 가능" 상자 (PRD F5, DESIGN 5.8 .hero)
import type { LibraryRow } from '../domain/list';
import { describeNextOpen, formatDuration, ROOM_NAME } from '../domain/present';
import type { NextOpen } from '../domain/status';
import { formatTime, toSeoul } from '../domain/time';
import { formatTravel } from '../domain/travel';
import type { RoomKey } from '../domain/types';
import styles from './ArrivalBox.module.css';

interface Props {
  row: LibraryRow;
  mode: RoomKey;
  now: Date;
  /** 기준 시각을 직접 고른 상태 (F13) */
  customTime: boolean;
  /** 출발지 이름. 없으면 null */
  originName: string | null;
}

const nextText = (next: NextOpen | null) => {
  if (!next) return '다음 개관 정보 없음';
  const d = describeNextOpen(next);
  return `다음 개관 ${d.day} ${d.time}`;
};

export function ArrivalBox({ row, mode, now, customTime, originName }: Props) {
  const { status, usable, travel } = row;
  if (status.kind === 'unknown' || status.kind === 'noRoom') return null;

  const nowMin = toSeoul(now).minutes;
  const when = customTime ? '그 시각에' : '지금';
  const lead = originName ? `${originName}에서 ${when} 출발하면` : `${when} 가면`;

  if (usable.kind !== 'usable') {
    const next =
      usable.kind === 'closedOnArrival'
        ? usable.next
        : status.kind === 'ended' || status.kind === 'closed'
          ? status.next
          : null;
    return (
      <div className={`${styles.hero} ln-hero`}>
        <div className={styles.lbl}>{lead}</div>
        <div className={`ln-num ${styles.num} ${styles.small}`}>
          {usable.kind === 'closedOnArrival' ? '도착 시 마감' : '오늘은 이용할 수 없음'}
        </div>
        <div className={styles.lbl}>{nextText(next)}</div>
      </div>
    );
  }

  const go = travel?.minutes ?? 0;
  const arrival = nowMin + go;
  const wait = usable.waitsForOpen ? usable.from - arrival : 0;
  const total = go + wait + usable.minutes;
  const pct = (m: number) => `${(m / total) * 100}%`;

  return (
    <div className={`${styles.hero} ln-hero`}>
      <div className={styles.top}>
        <div>
          <div className={styles.lbl}>{lead}</div>
          <div className={`ln-num ${styles.num}`}>
            {formatDuration(usable.minutes)}
            <small>이용 가능</small>
          </div>
        </div>
        <div className={styles.lbl}>
          {ROOM_NAME[mode]} {formatTime(usable.close)} 마감
        </div>
      </div>

      <div className={styles.track} aria-hidden="true">
        {go > 0 && <span className={styles.go} style={{ width: pct(go) }} />}
        {wait > 0 && <span className={styles.wait} style={{ width: pct(wait) }} />}
        <span className={styles.use} />
      </div>

      <div className={styles.ticks}>
        <span>
          <b>{formatTime(nowMin)}</b>
          {customTime ? '출발' : '지금'}
        </span>
        {travel && (
          <span>
            <b>{formatTime(arrival)}</b>도착 · {formatTravel(travel)}(추정)
          </span>
        )}
        {usable.waitsForOpen && (
          <span>
            <b>{formatTime(usable.from)}</b>개관
          </span>
        )}
        <span>
          <b>{formatTime(usable.close)}</b>마감
        </span>
      </div>
    </div>
  );
}
