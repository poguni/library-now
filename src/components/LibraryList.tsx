// 목록 패널 (PRD F7·F9, DESIGN 5.2~5.4)
import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { FilterKey, LibraryRow, SortKey } from '../domain/list';
import { ROOM_NAME } from '../domain/present';
import { formatKm, formatTravel } from '../domain/travel';
import type { RoomKey } from '../domain/types';
import styles from './LibraryList.module.css';

interface Props {
  rows: readonly LibraryRow[];
  openCount: number;
  mode: RoomKey;
  query: string;
  onQuery(query: string): void;
  filters: readonly FilterKey[];
  onFilters(filters: FilterKey[]): void;
  sort: SortKey;
  onSort(sort: SortKey): void;
  /** 출발지가 있으면 거리순을 고를 수 있음 */
  hasOrigin: boolean;
  /** 출발지 상태 안내 한 줄 */
  notice: string | null;
  /** 결과가 없을 때 제안 */
  suggestion: { id: string; text: string } | null;
  selectedId: string | null;
  onSelect(id: string): void;
  onHover(id: string | null): void;
  loading: boolean;
  className?: string;
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'openNow', label: '지금 열린 곳만' },
  { key: 'late', label: '21시 이후까지' },
];

export function LibraryList(props: Props) {
  const { rows, openCount, mode, filters, onFilters, sort, hasOrigin, suggestion } = props;
  const toggle = (key: FilterKey) =>
    onFilters(filters.includes(key) ? filters.filter((f) => f !== key) : [...filters, key]);
  const effectiveSort = sort === 'distance' && !hasOrigin ? 'time' : sort;

  return (
    <section className={`${styles.list} ${props.className ?? ''}`} aria-label="도서관 목록">
      <div className={styles.head}>
        <label className={styles.search}>
          <Search size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">도서관 이름 검색</span>
          <input
            type="search"
            placeholder="도서관 이름 검색"
            value={props.query}
            onChange={(e) => props.onQuery(e.target.value)}
          />
        </label>

        <div className={styles.filters} role="group" aria-label="필터">
          <button
            type="button"
            className={styles.fchip}
            aria-pressed={filters.length === 0}
            onClick={() => onFilters([])}
          >
            전체
          </button>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={styles.fchip}
              aria-pressed={filters.includes(key)}
              onClick={() => toggle(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.meta}>
          <p>
            문 연 곳 <b>{openCount}</b> / {rows.length}곳 · {ROOM_NAME[mode]} 기준
          </p>
          <label className={styles.sort}>
            <span className="sr-only">정렬</span>
            <select value={effectiveSort} onChange={(e) => props.onSort(e.target.value as SortKey)}>
              <option value="distance" disabled={!hasOrigin}>
                거리순
              </option>
              <option value="time">남은 시간순</option>
              <option value="name">이름순</option>
            </select>
            <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
          </label>
        </div>

        {props.notice && (
          <p className={styles.notice} role="status">
            {props.notice}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty} role="status">
          {props.loading ? (
            <p>도서관 정보를 불러오는 중입니다.</p>
          ) : (
            <>
              <p>조건에 맞는 도서관이 없습니다.</p>
              {suggestion && (
                <p>
                  다음 개관이 가장 빠른 곳:{' '}
                  <button
                    type="button"
                    className={styles.suggest}
                    onClick={() => {
                      onFilters([]);
                      props.onSelect(suggestion.id);
                    }}
                  >
                    {suggestion.text}
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <ul className={`${styles.cards} ln-cards`}>
          {rows.map((row) => (
            <li key={row.lib.id}>
              <LibraryCard
                row={row}
                selected={row.lib.id === props.selectedId}
                onSelect={props.onSelect}
                onHover={props.onHover}
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
  const { lib, view, travel, ruleText } = row;
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
          {lib.district}
          {travel && ` · ${formatKm(travel.straightKm)} · ${formatTravel(travel)}`}
        </span>
        <span className={styles.sub}>휴관 {ruleText}</span>
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
