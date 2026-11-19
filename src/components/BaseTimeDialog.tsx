// 기준 시각 바꾸기 (PRD F13): 날짜·시각을 고르면 그 시점 기준으로 상태와 남은 시간을 다시 계산합니다.
import { X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { type DateKey, formatTime, fromSeoul, parseTime, toSeoul } from '../domain/time';
import styles from './SettingsDialog.module.css';

interface Props {
  open: boolean;
  onClose(): void;
  /** 실제 지금 */
  live: Date;
  /** 직접 고른 시각. null = 지금 */
  base: Date | null;
  /** 고를 수 있는 연도 (공휴일 데이터가 있는 해) */
  years: readonly number[];
  onApply(base: Date | null): void;
}

export function BaseTimeDialog(props: Props) {
  const { open, onClose } = props;
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.small}`}
      aria-labelledby="basetime-title"
      onClose={onClose}
    >
      <div className={styles.head}>
        <h2 id="basetime-title" className="ln-detail-title">
          기준 시각
        </h2>
        <button type="button" className={styles.icon} aria-label="닫기" onClick={onClose}>
          <X size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
      {/* 열 때마다 새로 그려서 그때의 기준 시각으로 채웁니다 */}
      {open && <BaseTimeForm {...props} />}
    </dialog>
  );
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function BaseTimeForm({ onClose, live, base, years, onApply }: Props) {
  const start = toSeoul(base ?? live);
  const [date, setDate] = useState<DateKey>(start.date);
  const [time, setTime] = useState(formatTime(start.minutes));

  const min = `${Math.min(...years)}-01-01`;
  const max = `${Math.max(...years)}-12-31`;
  const inRange = DATE.test(date) && date >= min && date <= max;
  const valid = inRange && TIME.test(time);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onApply(fromSeoul(date, parseTime(time)));
    onClose();
  };

  return (
    <form className={styles.body} onSubmit={submit}>
      <p className={styles.hint}>
        고른 날짜·시각에 출발한다고 보고 운영 상태와 이용 가능 시간을 다시 계산합니다. 새로고침하면
        지금 기준으로 돌아옵니다.
      </p>
      <div className={styles.place}>
        <label className={styles.field}>
          <span>날짜</span>
          <input
            type="date"
            required
            min={min}
            max={max}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>시각</span>
          <input
            type="time"
            required
            step={300}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
      </div>
      {date && !inRange && (
        <p className={styles.error} role="alert">
          {min.slice(0, 4)}~{max.slice(0, 4)}년 안의 날짜를 골라 주세요. 공휴일 정보가 있는
          기간입니다.
        </p>
      )}
      <div className={styles.actions}>
        {base && (
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              onApply(null);
              onClose();
            }}
          >
            지금으로 돌아가기
          </button>
        )}
        <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={!valid}>
          이 시각으로 보기
        </button>
      </div>
    </form>
  );
}
