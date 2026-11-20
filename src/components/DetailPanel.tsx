// 오른쪽 패널 (DESIGN 5.8): 탭(상세 / 휴관 달력), 고른 도서관의 상세, 고르지 않았으면 오늘 요약 (PRD 8.2)
import {
  Ban,
  BookOpen,
  BookSearch,
  CalendarDays,
  ExternalLink,
  PanelRightClose,
  X,
} from 'lucide-react';
import type { Place } from '../domain/directions';
import type { LibraryRow } from '../domain/list';
import { formatDate, isUnreviewed, ROOM_NAME, type StatusView } from '../domain/present';
import { type ScheduleContext, hoursFor } from '../domain/schedule';
import { type DateKey, formatTime, toSeoul, weekdayOf } from '../domain/time';
import type { Library, Room, RoomKey, TimeRange, WeekHours } from '../domain/types';
import type { NotesApi } from '../state/notes';
import { ArrivalBox } from './ArrivalBox';
import { ClosureCalendar } from './ClosureCalendar';
import styles from './DetailPanel.module.css';
import { DirectionsBar } from './DirectionsBar';
import { MiniCalendar } from './MiniCalendar';
import { MyNotes } from './MyNotes';
import { StarButton } from './StarButton';

export type DetailTab = 'detail' | 'calendar';

interface Props {
  row: LibraryRow | null;
  /** 지금 목록에 보이는 줄 (오늘 요약용) */
  rows: readonly LibraryRow[];
  /** 선택한 구의 도서관 (달력용) */
  libraries: readonly Library[];
  mode: RoomKey;
  now: Date;
  /** 기준 시각을 직접 고른 상태 (F13) */
  customTime: boolean;
  origin: Place | null;
  ctx: ScheduleContext;
  notes: NotesApi;
  holidayYears: readonly number[];
  favorites: readonly string[];
  onToggleFavorite(id: string): void;
  onSelect(id: string): void;
  onClose(): void;
  tab: DetailTab;
  onTab(tab: DetailTab): void;
  /** 스마트폰은 아래 탭 바가 대신하므로 탭 줄을 숨김 */
  showTabs: boolean;
  /** 데스크탑에서 패널 접기 */
  onCollapse?: () => void;
  className?: string;
}

const TABS: { key: DetailTab; label: string; Icon: typeof BookOpen }[] = [
  { key: 'detail', label: '상세', Icon: BookOpen },
  { key: 'calendar', label: '휴관 달력', Icon: CalendarDays },
];

export function DetailPanel(props: Props) {
  const { row, rows, mode, now, tab, favorites, showTabs } = props;
  const today = toSeoul(now).date;
  return (
    <aside
      className={`${styles.detail} ${props.className ?? ''}`}
      aria-label="도서관 상세와 휴관 달력"
      data-open={row || tab === 'calendar' ? '' : undefined}
    >
      {showTabs && (
        <div className={styles.tabs} role="tablist" aria-label="오른쪽 패널">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={tab === key}
              aria-controls="detail-tabpanel"
              className={`${styles.tab} ln-tab`}
              onClick={() => props.onTab(key)}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </button>
          ))}
          {props.onCollapse && (
            <button
              type="button"
              className={styles.collapse}
              aria-label="오른쪽 패널 접기"
              data-tip="패널 접기"
              data-tip-pos="end"
              onClick={props.onCollapse}
            >
              <PanelRightClose size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <div
        className={styles.body}
        id="detail-tabpanel"
        role={showTabs ? 'tabpanel' : undefined}
        aria-labelledby={showTabs ? `tab-${tab}` : undefined}
      >
        {tab === 'calendar' ? (
          <ClosureCalendar
            libraries={props.libraries}
            favorites={favorites}
            room={mode}
            today={today}
            ctx={props.ctx}
            years={props.holidayYears}
            onSelectLibrary={(id) => {
              props.onSelect(id);
              props.onTab('detail');
            }}
          />
        ) : row ? (
          <LibraryDetail
            row={row}
            mode={mode}
            now={now}
            customTime={props.customTime}
            origin={props.origin}
            ctx={props.ctx}
            notes={props.notes}
            favorite={favorites.includes(row.lib.id)}
            onToggleFavorite={() => props.onToggleFavorite(row.lib.id)}
            onClose={props.onClose}
          />
        ) : (
          <Summary
            rows={rows}
            mode={mode}
            today={today}
            favorites={favorites}
            onSelect={props.onSelect}
          />
        )}
      </div>
    </aside>
  );
}

const liveClose = (r: LibraryRow) =>
  r.status.kind === 'open' || r.status.kind === 'soon' || r.status.kind === 'opening'
    ? r.status.close
    : -1;

function Summary({
  rows,
  mode,
  today,
  favorites,
  onSelect,
}: {
  rows: readonly LibraryRow[];
  mode: RoomKey;
  today: DateKey;
  favorites: readonly string[];
  onSelect(id: string): void;
}) {
  const count = (tones: string[]) => rows.filter((r) => tones.includes(r.view.tone)).length;
  const latest = rows.reduce<LibraryRow | null>(
    (best, r) => (liveClose(r) > (best ? liveClose(best) : -1) ? r : best),
    null,
  );
  const favRows = favorites.flatMap((id) => rows.filter((r) => r.lib.id === id));
  return (
    <>
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
      {latest && (
        <p className={styles.hint}>
          가장 늦게까지 여는 곳:{' '}
          <button type="button" className={styles.link} onClick={() => onSelect(latest.lib.id)}>
            {latest.lib.name}
          </button>{' '}
          ({formatTime(liveClose(latest))}까지)
        </p>
      )}
      <section className={styles.sec}>
        <h3 className={`${styles.secTitle} ln-sec-title`}>즐겨찾기</h3>
        {favRows.length === 0 ? (
          <p className={styles.hint}>목록이나 상세에서 별을 누르면 여기에 모아 봅니다.</p>
        ) : (
          <ul className={styles.favs}>
            {favRows.map((r) => (
              <li key={r.lib.id}>
                <button type="button" className={styles.link} onClick={() => onSelect(r.lib.id)}>
                  {r.lib.name}
                </button>
                <span className="ln-badge" data-tone={r.view.tone}>
                  {r.view.badge}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className={styles.hint}>
        목록이나 지도에서 도서관을 고르면 운영시간과 휴관 규칙을 볼 수 있습니다.
      </p>
    </>
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
  now,
  customTime,
  origin,
  ctx,
  notes,
  favorite,
  onToggleFavorite,
  onClose,
}: {
  row: LibraryRow;
  mode: RoomKey;
  now: Date;
  customTime: boolean;
  origin: Place | null;
  ctx: ScheduleContext;
  notes: NotesApi;
  favorite: boolean;
  onToggleFavorite(): void;
  onClose(): void;
}) {
  const today = toSeoul(now).date;
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
    <>
      <div className={styles.head}>
        <div className={styles.grow}>
          <h2 className={`${styles.title} ln-detail-title`}>{lib.name}</h2>
          <span className={styles.sub}>
            {lib.district}
            {lib.operator && ` · ${lib.operator}`}
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
        <StarButton on={favorite} name={lib.name} onToggle={onToggleFavorite} />
        <button
          type="button"
          className={styles.close}
          aria-label="상세 닫기"
          data-tip="닫기"
          data-tip-pos="end"
          onClick={onClose}
        >
          <X size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <ArrivalBox
        row={row}
        mode={mode}
        now={now}
        customTime={customTime}
        originName={origin?.name ?? null}
      />

      <div className={styles.acts}>
        <DirectionsBar lib={lib} origin={origin} mode={mode} />
      </div>

      <p className={styles.address}>{lib.address}</p>

      {/* 책 검색은 도서관 홈페이지로 보내는 링크만 (M5). 확인한 검색 페이지가 없으면 홈페이지 */}
      {(lib.searchUrl ?? lib.homepage) && (
        <a
          className={`${styles.bookSearch} ln-book-search`}
          href={(lib.searchUrl ?? lib.homepage)!}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={`${styles.bsIcon} ln-book-search-icon`} aria-hidden="true">
            <BookSearch size={20} strokeWidth={1.8} />
          </span>
          <span className={styles.bsText}>
            <b className="ln-book-search-title">소장 도서 검색</b>
            <span className={styles.bsDesc}>
              {lib.searchUrl
                ? '이 도서관에 찾는 책이 있는지 확인합니다'
                : '홈페이지의 자료 검색 메뉴를 이용하세요'}
            </span>
          </span>
          <ExternalLink className={styles.bsGo} size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">(새 창)</span>
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
            {isUnreviewed(lib) && (
              <>
                <br />
                원문: {lib.closedRaw || '정보 없음'}
              </>
            )}
          </span>
        </p>
      </section>

      <MiniCalendar lib={lib} room={mode} today={today} ctx={ctx} />

      <MyNotes
        key={lib.id}
        lib={lib}
        today={today}
        memo={notes.notes.memos[lib.id] ?? ''}
        closures={notes.notes.closures[lib.id] ?? []}
        onMemo={(text) => notes.setMemo(lib.id, text)}
        onAddClosure={(c) => notes.addClosure(lib.id, c)}
        onRemoveClosure={(i) => notes.removeClosure(lib.id, i)}
      />

      <p className={styles.src}>
        <span>데이터 기준 {lib.source.baseDate ?? '–'}</span>
        <span>
          {lib.source.checkedAt
            ? `홈페이지 확인 ${lib.source.checkedAt}`
            : '공공데이터 자동 변환 · 홈페이지 미확인'}
        </span>
      </p>
    </>
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
