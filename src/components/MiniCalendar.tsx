// 상세 패널의 이번 달 미니 달력 (DESIGN 5.8 .cal): 고른 도서관·모드의 휴관일
import { isClosedOn, monthGrid, toYearMonth } from '../domain/calendar';
import type { ScheduleContext } from '../domain/schedule';
import type { DateKey } from '../domain/time';
import type { Library, RoomKey } from '../domain/types';
import styles from './Calendar.module.css';

export const WEEK_HEAD = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  lib: Library;
  room: RoomKey;
  today: DateKey;
  ctx: ScheduleContext;
}

export function MiniCalendar({ lib, room, today, ctx }: Props) {
  const ym = toYearMonth(today);
  const cells = monthGrid(ym);
  const closedDays = cells.filter((d): d is DateKey => !!d && isClosedOn(lib, room, d, ctx));
  return (
    <section className={styles.mini}>
      <div className={styles.miniHead}>
        <h3 className="ln-sec-title">
          {ym.year}년 {ym.month}월
        </h3>
        <span className={styles.key}>
          <i aria-hidden="true" />
          휴관일
        </span>
      </div>
      <p className="sr-only">
        {closedDays.length
          ? `이번 달 휴관일: ${closedDays.map((d) => Number(d.slice(8))).join(', ')}일`
          : '이번 달 휴관일 없음'}
      </p>
      <div className={`${styles.grid} ln-cal`} aria-hidden="true">
        {WEEK_HEAD.map((w) => (
          <span key={w} className={styles.head}>
            {w}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const closed = closedDays.includes(date);
          const holiday = ctx.holidays.get(date);
          const day = Number(date.slice(8));
          return (
            <span
              key={date}
              className={styles.day}
              data-closed={closed || undefined}
              data-today={date === today || undefined}
              title={holiday}
            >
              {day}
              {holiday && <i className={styles.holidayDot} aria-hidden="true" />}
            </span>
          );
        })}
      </div>
    </section>
  );
}
