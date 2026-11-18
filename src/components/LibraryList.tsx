// 목록 패널 (PRD F9, DESIGN 5.2~5.4)
import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ROOM_NAME } from '../domain/present';
import type { RoomKey } from '../domain/types';
import styles from './LibraryList.module.css';
import type { LibraryRow } from './types';

interface Props {
  rows: readonly LibraryRow[];
  openCount: number;
  mode: RoomKey;
  query: string;
  onQuery(query: string): void;
  selectedId: string | null;
  onSelect(id: string): void;
  onHover(id: string | null): void;
  loading: boolean;
  className?: string;
}

export function LibraryList(props: Props) {
  const { rows, openCount, mode, query, onQuery, selectedId, onSelect, onHover, loading } = props;
  return (
    <section className={`${styles.list} ${props.className ?? ''}`} aria-label="도서관 목록">
      <div className={styles.head}>
        <label className={styles.search}>
          <Search size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">도서관 이름 검색</span>
          <input
            type="search"
            placeholder="도서관 이름 검색"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        <p className={styles.meta}>
          문 연 곳 <b>{openCount}</b> / {rows.length}곳 · {ROOM_NAME[mode]} 기준
        </p>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty} role="status">
          {loading ? '도서관 정보를 불러오는 중입니다.' : '조건에 맞는 도서관이 없습니다.'}
        </p>
      ) : (
        <ul className={`${styles.cards} ln-cards`}>
          {rows.map((row) => (
            <li key={row.lib.id}>
              <LibraryCard
                row={row}
                selected={row.lib.id === selectedId}
                onSelect={onSelect}
                onHover={onHover}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface CardProps {
  row: LibraryRow;
  selected: boolean;
  onSelect(id: string): void;
  onHover(id: string | null): void;
}

function LibraryCard({ row, selected, onSelect, onHover }: CardProps) {
  const { lib, view, ruleText } = row;
  const ref = useRef<HTMLElement>(null);

  // 지도에서 고르면 목록에서도 보이게
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <article
      ref={ref}
      className={`${styles.card} ln-card`}
      data-selected={selected || undefined}
      data-off={view.off || undefined}
      onMouseEnter={() => onHover(lib.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={styles.left}>
        <h3 className={styles.name}>
          <button
            type="button"
            className={styles.select}
            aria-pressed={selected}
            onClick={() => onSelect(lib.id)}
            onFocus={() => onHover(lib.id)}
            onBlur={() => onHover(null)}
          >
            {lib.name}
          </button>
        </h3>
        <span className={styles.sub}>
          {lib.district} · 휴관 {ruleText}
        </span>
      </div>
      <div className={styles.right}>
        <span className={`ln-num ${styles.big}`} data-warn={view.warn || undefined}>
          {view.big}
        </span>
        <small>{view.bigLabel}</small>
      </div>
      <div className={`${styles.foot} ln-card-foot`}>
        <span className="ln-badge" data-tone={view.tone}>
          {view.badge}
        </span>
        <span className={styles.note}>{view.note}</span>
      </div>
    </article>
  );
}
