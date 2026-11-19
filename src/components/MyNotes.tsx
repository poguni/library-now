// 상세의 "내 기록" (PRD F14): 개인 메모와 직접 입력한 임시 휴관. 이 브라우저에만 저장합니다.
import { Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { formatDate, ROOM_NAME } from '../domain/present';
import type { DateKey } from '../domain/time';
import type { Closure, Library, RoomKey } from '../domain/types';
import { CLOSURE_REASON_MAX, MEMO_MAX } from '../state/notes';
import styles from './MyNotes.module.css';

interface Props {
  lib: Library;
  today: DateKey;
  memo: string;
  closures: readonly Closure[];
  onMemo(text: string): void;
  onAddClosure(closure: Closure): void;
  onRemoveClosure(index: number): void;
}

type RoomChoice = 'both' | RoomKey;

export function MyNotes({ lib, today, memo, closures, ...props }: Props) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState('');
  const [rooms, setRooms] = useState<RoomChoice>('both');
  const hasReading = Boolean(lib.rooms.reading);
  const valid = Boolean(from && to && from <= to);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    props.onAddClosure({
      from,
      to,
      reason: reason.trim() || '직접 입력한 휴관',
      rooms: rooms === 'both' ? (hasReading ? ['lending', 'reading'] : ['lending']) : [rooms],
    });
    setReason('');
  };

  return (
    <section className={styles.sec} aria-labelledby={`notes-${lib.id}`}>
      <h3 id={`notes-${lib.id}`} className={`${styles.title} ln-sec-title`}>
        내 기록
      </h3>
      <label className={styles.field}>
        <span>메모</span>
        <textarea
          defaultValue={memo}
          maxLength={MEMO_MAX}
          rows={2}
          placeholder="예: 3층 창가 자리 좋음"
          onBlur={(e) => props.onMemo(e.target.value)}
        />
      </label>

      <div className={styles.closures}>
        <span className={styles.label}>직접 입력한 임시 휴관</span>
        {closures.length > 0 ? (
          <ul className={styles.list}>
            {closures.map((c, i) => (
              <li key={`${c.from}-${c.to}-${i}`}>
                <span>
                  <b>
                    {formatDate(c.from)}
                    {c.to !== c.from && ` ~ ${formatDate(c.to)}`}
                  </b>{' '}
                  {c.reason}
                  {hasReading && c.rooms.length === 1 && ` (${ROOM_NAME[c.rooms[0]!]}만)`}
                </span>
                <button
                  type="button"
                  className={styles.icon}
                  aria-label={`${formatDate(c.from)} 임시 휴관 지우기`}
                  onClick={() => props.onRemoveClosure(i)}
                >
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>
            공사·행사 공지를 보셨다면 기간을 넣어 두세요. 상태와 달력 계산에 반영합니다.
          </p>
        )}
      </div>

      <form className={styles.form} onSubmit={add} aria-label="임시 휴관 추가">
        <label className={styles.field}>
          <span>시작</span>
          <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>끝</span>
          <input
            type="date"
            required
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className={`${styles.field} ${styles.wide}`}>
          <span>사유 (선택)</span>
          <input
            type="text"
            maxLength={CLOSURE_REASON_MAX}
            placeholder="예: 시설 공사"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {hasReading && (
          <label className={styles.field}>
            <span>적용</span>
            <select value={rooms} onChange={(e) => setRooms(e.target.value as RoomChoice)}>
              <option value="both">자료실·열람실</option>
              <option value="lending">자료실만</option>
              <option value="reading">열람실만</option>
            </select>
          </label>
        )}
        <button type="submit" className={styles.btn} disabled={!valid}>
          휴관 추가
        </button>
      </form>
      <p className={styles.hint}>
        메모와 휴관은 이 브라우저에만 저장됩니다. 설정에서 파일로 옮길 수 있습니다.
      </p>
    </section>
  );
}
