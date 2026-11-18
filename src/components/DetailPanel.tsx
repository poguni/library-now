// 오른쪽 패널 (DESIGN 5.8): 고른 도서관의 기본 정보·운영시간·휴관 규칙, 고르지 않았으면 오늘 요약 (PRD 8.2)
// 길찾기(M2)와 휴관 달력(M3)은 다음 단계에서 추가합니다.
import { Ban, Link as LinkIcon, X } from 'lucide-react';
import { formatDate, ROOM_NAME, type StatusView } from '../domain/present';
import { hoursFor } from '../domain/schedule';
import { type DateKey, toSeoul, weekdayOf } from '../domain/time';
import type { Library, Room, RoomKey, TimeRange, WeekHours } from '../domain/types';
import styles from './DetailPanel.module.css';
import type { LibraryRow } from './types';

interface Props {
  row: LibraryRow | null;
  rows: readonly LibraryRow[];
  mode: RoomKey;
  now: Date;
  onClose(): void;
  className?: string;
}

export function DetailPanel({ row, rows, mode, now, onClose, className }: Props) {
  const today = toSeoul(now).date;
  return (
    <aside
      className={`${styles.detail} ${className ?? ''}`}
      aria-label={row ? `${row.lib.name} 상세` : '오늘 요약'}
      data-open={row ? '' : undefined}
    >
      {row ? (
        <LibraryDetail row={row} mode={mode} today={today} onClose={onClose} />
      ) : (
        <Summary rows={rows} mode={mode} today={today} />
      )}
    </aside>
  );
}

function Summary({
  rows,
  mode,
  today,
}: {
  rows: readonly LibraryRow[];
  mode: RoomKey;
  today: DateKey;
}) {
  const count = (tones: string[]) => rows.filter((r) => tones.includes(r.view.tone)).length;
  return (
    <div className={styles.body}>
      <div>
        <h2 className={`${styles.title} ln-detail-title`}>오늘 요약</h2>
        <span className={styles.sub}>
          {formatDate(today)} · {ROOM_NAME[mode]} 기준 · {rows.length}곳
        </span>
      </div>
      <dl className={styles.stats}>
        <Stat tone="open" label="지금 문 연 곳" value={count(['open', 'soon'])} />
        <Stat tone="opening" label="곧 열리는 곳" value={count(['opening'])} />
        <Stat tone="ended" label="오늘 운영 종료" value={count(['ended'])} />
        <Stat tone="closed" label="오늘 휴관" value={count(['closed'])} />
      </dl>
      <p className={styles.hint}>
        목록이나 지도에서 도서관을 고르면 운영시간과 휴관 규칙을 볼 수 있습니다.
      </p>
    </div>
  );
}

function Stat({ tone, label, value }: { tone: StatusView['tone']; label: string; value: number }) {
  return (
    <div className={styles.stat} data-tone={tone}>
      <dt>{label}</dt>
      <dd className="ln-num">{value}곳</dd>
    </div>
  );
}

const OTHER: Record<RoomKey, RoomKey> = { lending: 'reading', reading: 'lending' };

function otherText(view: StatusView, room: RoomKey): string {
  const name = ROOM_NAME[room];
  if (view.tone === 'closed') return `${name} 오늘 휴관`;
  if (view.tone === 'unknown') return `${name} 운영시간 확인 필요`;
  if (view.tone === 'none') return view.badge;
  return view.note;
}

function LibraryDetail({
  row,
  mode,
  today,
  onClose,
}: {
  row: LibraryRow;
  mode: RoomKey;
  today: DateKey;
  onClose(): void;
}) {
  const { lib, view, other, ruleText } = row;
  const memos = [
    ...(['lending', 'reading'] as const).flatMap((k) => {
      const memo = lib.rooms[k]?.memo;
      return memo ? [`${ROOM_NAME[k]}: ${memo}`] : [];
    }),
    ...lib.notes,
  ];
  const hasSeasons = Boolean(
    lib.rooms.lending.seasons?.length || lib.rooms.reading?.seasons?.length,
  );

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        <div className={styles.grow}>
          <h2 className={`${styles.title} ln-detail-title`}>{lib.name}</h2>
          <span className={styles.sub}>
            {lib.district} · {lib.operator}
            {lib.phone && (
              <>
                {' · '}
                <a href={`tel:${lib.phone}`}>{lib.phone}</a>
              </>
            )}
          </span>
          <div className={styles.badges}>
            <span className="ln-badge" data-tone={view.tone}>
              {ROOM_NAME[mode]} {view.badge}
            </span>
            <span>{otherText(other, OTHER[mode])}</span>
          </div>
        </div>
        <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
          <X size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <p className={styles.address}>{lib.address}</p>

      {lib.homepage && (
        <a className={styles.btn} href={lib.homepage} target="_blank" rel="noopener noreferrer">
          <LinkIcon size={18} strokeWidth={1.8} aria-hidden="true" />
          홈페이지에서 임시 휴관 공지 확인
        </a>
      )}

      <section className={styles.sec}>
        <h3 className={`${styles.secTitle} ln-sec-title`}>운영시간</h3>
        <HoursTable lib={lib} today={today} />
        {hasSeasons && (
          <p className={styles.memo}>계절에 따라 시간이 달라집니다. 표는 오늘 날짜 기준입니다.</p>
        )}
        {memos.map((m) => (
          <p key={m} className={styles.memo}>
            {m}
          </p>
        ))}
        <p className={styles.rule}>
          <Ban size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <b>정기 휴관</b> · {ruleText}
          </span>
        </p>
      </section>

      <p className={styles.src}>
        <span>데이터 기준 {lib.source.baseDate ?? '–'}</span>
        <span>홈페이지 확인 {lib.source.checkedAt}</span>
      </p>
    </div>
  );
}

const DAY_ROWS: { key: keyof WeekHours; label: string }[] = [
  { key: 'weekday', label: '평일' },
  { key: 'saturday', label: '토요일' },
  { key: 'sunday', label: '일요일' },
];

function cell(room: Room | null, hours: WeekHours | null, key: keyof WeekHours): string {
  if (!room) return '없음';
  if (!hours) return '확인 필요';
  const range: TimeRange | null = hours[key];
  return range ? `${range.open}–${range.close}` : '운영 안 함';
}

function HoursTable({ lib, today }: { lib: Library; today: DateKey }) {
  const weekday = weekdayOf(today);
  const todayKey = weekday === 0 ? 'sunday' : weekday === 6 ? 'saturday' : 'weekday';
  const lending = hoursFor(lib.rooms.lending, today);
  const reading = lib.rooms.reading ? hoursFor(lib.rooms.reading, today) : null;
  const rowsToShow =
    lib.closed.holiday === 'open'
      ? [...DAY_ROWS, { key: 'holiday' as const, label: '공휴일' }]
      : DAY_ROWS;

  return (
    <table className={styles.hours}>
      <thead>
        <tr>
          <th scope="col">구분</th>
          <th scope="col">자료실</th>
          <th scope="col">열람실</th>
        </tr>
      </thead>
      <tbody>
        {rowsToShow.map(({ key, label }) => (
          <tr key={key} data-today={key === todayKey || undefined}>
            <th scope="row">
              {label}
              {key === todayKey && ' (오늘)'}
            </th>
            <td>{cell(lib.rooms.lending, lending, key)}</td>
            <td>{cell(lib.rooms.reading, reading, key)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
