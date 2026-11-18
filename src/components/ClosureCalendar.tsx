// 휴관일 달력 (PRD F11, DESIGN 5.9)
// 즐겨찾기가 있으면 즐겨찾기 도서관의 휴관일을 색 점으로, 없으면 날짜마다 문 연 곳 수를 보여 줍니다.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { addMonths, isClosedOn, monthGrid, openOn, toYearMonth } from '../domain/calendar';
import { formatDate, ROOM_NAME } from '../domain/present';
import type { ScheduleContext } from '../domain/schedule';
import { type DateKey, formatTime } from '../domain/time';
import type { Library, RoomKey } from '../domain/types';
import styles from './Calendar.module.css';
import { WEEK_HEAD } from './MiniCalendar';

/** 즐겨찾기 도서관 점 색 (앞에서부터 5곳) */
const FAV_COLORS = [1, 2, 3, 4, 5].map((i) => `var(--fav-${i})`);
const MAX_DOTS = 5;

interface Props {
  libraries: readonly Library[];
  favorites: readonly string[];
  room: RoomKey;
  today: DateKey;
  ctx: ScheduleContext;
  /** 달력에서 고를 수 있는 연도 (공휴일 데이터가 있는 해) */
  years: readonly number[];
  onSelectLibrary(id: string): void;
}

export function ClosureCalendar(props: Props) {
  const { libraries, room, today, ctx, years } = props;
  const [ym, setYm] = useState(() => toYearMonth(today));
  const [picked, setPicked] = useState<DateKey>(today);

  const favs = props.favorites
    .map((id) => libraries.find((l) => l.id === id))
    .filter((l): l is Library => Boolean(l));
  const minYm = { year: Math.min(...years), month: 1 };
  const maxYm = { year: Math.max(...years), month: 12 };
  const canPrev = ym.year * 12 + ym.month > minYm.year * 12 + minYm.month;
  const canNext = ym.year * 12 + ym.month < maxYm.year * 12 + maxYm.month;

  const go = (n: number) => {
    const next = addMonths(ym, n);
    setYm(next);
    setPicked(`${next.year}-${String(next.month).padStart(2, '0')}-01`);
  };

  const open = openOn(libraries, room, picked, ctx);
  const closedFavs = favs.filter((l) => isClosedOn(l, room, picked, ctx));
  const pickedHoliday = ctx.holidays.get(picked);

  return (
    <section className={styles.full} aria-label="휴관일 달력">
      <div className={styles.nav}>
        <button type="button" aria-label="이전 달" disabled={!canPrev} onClick={() => go(-1)}>
          <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h3 className="ln-detail-title">
          {ym.year}년 {ym.month}월
        </h3>
        <button type="button" aria-label="다음 달" disabled={!canNext} onClick={() => go(1)}>
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      {favs.length > 0 ? (
        <ul className={styles.legend} aria-label="즐겨찾기 도서관 색">
          {favs.slice(0, MAX_DOTS).map((l, i) => (
            <li key={l.id}>
              <i style={{ background: FAV_COLORS[i] }} aria-hidden="true" />
              {l.name}
            </li>
          ))}
          <li className={styles.legendNote}>점 = 그날 휴관</li>
        </ul>
      ) : (
        <p className={styles.note}>
          즐겨찾기가 없어 날짜마다 문 여는 도서관 수를 보여 줍니다 ({ROOM_NAME[room]} 기준).
        </p>
      )}

      <div className={`${styles.grid} ${styles.big}`}>
        {WEEK_HEAD.map((w) => (
          <span key={w} className={styles.head} aria-hidden="true">
            {w}
          </span>
        ))}
        {monthGrid(ym).map((date, i) => {
          if (!date) return <span key={`e${i}`} aria-hidden="true" />;
          const holiday = ctx.holidays.get(date);
          const day = Number(date.slice(8));
          const closed = favs.slice(0, MAX_DOTS).map((l) => isClosedOn(l, room, date, ctx));
          const extra = favs.slice(MAX_DOTS).filter((l) => isClosedOn(l, room, date, ctx)).length;
          const openCount = favs.length ? 0 : openOn(libraries, room, date, ctx).length;
          const label = favs.length
            ? `휴관 ${closed.filter(Boolean).length + extra}곳`
            : `문 여는 곳 ${openCount}곳`;
          return (
            <button
              key={date}
              type="button"
              className={`${styles.cell} ln-cal-cell`}
              aria-pressed={date === picked}
              data-today={date === today || undefined}
              data-holiday={holiday ? '' : undefined}
              aria-label={`${formatDate(date)}${holiday ? ` ${holiday}` : ''}, ${label}`}
              onClick={() => setPicked(date)}
            >
              <span className={styles.num}>{day}</span>
              {holiday && <span className={styles.hname}>{holiday}</span>}
              {favs.length > 0 ? (
                <span className={styles.dots} aria-hidden="true">
                  {closed.map((c, j) =>
                    c ? <i key={j} style={{ background: FAV_COLORS[j] }} /> : null,
                  )}
                  {extra > 0 && <small>+{extra}</small>}
                </span>
              ) : (
                <span className={styles.count} aria-hidden="true">
                  {openCount}곳
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.dayList} aria-live="polite">
        <h4>
          {formatDate(picked)}
          {pickedHoliday && ` · ${pickedHoliday}`} · 문 여는 곳 {open.length}곳
        </h4>
        {closedFavs.length > 0 && (
          <p className={styles.closedFavs}>
            즐겨찾기 중 휴관: {closedFavs.map((l) => l.name).join(', ')}
          </p>
        )}
        <ul>
          {open.map((e) => (
            <li key={e.lib.id}>
              <button type="button" onClick={() => props.onSelectLibrary(e.lib.id)}>
                {e.lib.name}
              </button>
              <span className="ln-num">
                {formatTime(e.open)}–{formatTime(e.close)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
