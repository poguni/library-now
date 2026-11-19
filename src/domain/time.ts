// 서울 시각 도우미. 기기 시간대와 관계없이 Asia/Seoul 기준으로 계산합니다 (PRD 5.1).

/** "YYYY-MM-DD" (서울 날짜) */
export type DateKey = string;

export interface SeoulNow {
  date: DateKey;
  /** 0=일 ~ 6=토 */
  weekday: number;
  /** 자정부터 지난 분 */
  minutes: number;
}

const seoulFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function toSeoul(instant: Date): SeoulNow {
  const parts = Object.fromEntries(
    seoulFormat.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date,
    weekday: weekdayOf(date),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function toUtc(date: DateKey): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function weekdayOf(date: DateKey): number {
  return toUtc(date).getUTCDay();
}

export function addDays(date: DateKey, days: number): DateKey {
  const t = toUtc(date);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

export function daysInMonth(date: DateKey): number {
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
}

/** "HH:MM" → 분 */
export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

/** 분 → "HH:MM" (24시 이상은 다음 날 시각으로 표시) */
export function formatTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 서울 날짜·시각(자정부터의 분) → 시각. 서울은 일광 절약 시간이 없어 +09:00 고정입니다 (F13) */
export function fromSeoul(date: DateKey, minutes: number): Date {
  return new Date(`${date}T${formatTime(minutes)}:00+09:00`);
}
