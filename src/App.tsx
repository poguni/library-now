// 화면 배치 (PRD 8.2~8.4)
// 데스크탑: 상단 바 / 목록 · 지도 · 상세 3단, 태블릿: 목록 · 지도 + 상세 서랍,
// 스마트폰: 전체 지도 + 바텀 시트 + 아래 탭 바
import { CalendarDays, PanelRightOpen } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import styles from './App.module.css';
import { BottomSheet, type SheetSnap } from './components/BottomSheet';
import { DetailPanel, type DetailTab } from './components/DetailPanel';
import { LibraryList } from './components/LibraryList';
import { MapView } from './components/MapView';
import { SettingsDialog } from './components/SettingsDialog';
import { type PhoneTab, TabBar } from './components/TabBar';
import { TopBar } from './components/TopBar';
import { LOW_ACCURACY_METERS } from './domain/config';
import {
  type FilterKey,
  type SortKey,
  buildRows,
  filterRows,
  soonestOpening,
  sortRows,
} from './domain/list';
import { ROOM_NAME } from './domain/present';
import { formatKm } from './domain/travel';
import type { RoomKey } from './domain/types';
import type { MapMarker, MapOrigin } from './map/types';
import { FAVORITES_KEY, useFavorites } from './state/favorites';
import { PLACES_KEY, PLACE_LABEL, type PlaceKind } from './state/places';
import {
  type ListPrefs,
  SETTINGS_KEY,
  getStorage,
  readMode,
  readPrefs,
  saveMode,
  savePrefs,
} from './state/settings';
import { type Theme, applyTheme, readTheme, saveTheme } from './state/theme';
import { useLibraryData } from './state/useLibraryData';
import { DESKTOP_QUERY, PHONE_QUERY, useMediaQuery } from './state/useMediaQuery';
import { useNow } from './state/useNow';
import { type OriginState, useOrigin } from './state/useOrigin';

/** 출발지 상태 안내 (F6) */
function originNotice(choice: ListPrefs['origin'], o: OriginState): string | null {
  if (choice !== 'current') return null;
  if (o.locating) return '현재 위치를 찾는 중입니다.';
  if (o.error) {
    const why = o.error === 'denied' ? '위치 권한이 없어' : '현재 위치를 찾지 못해';
    return o.origin
      ? `${why} ${o.origin.name} 기준으로 계산합니다.`
      : `${why} 이동 시간을 빼지 않았습니다. '출발'에서 집·직장을 지정할 수 있습니다.`;
  }
  const acc = o.origin?.accuracy;
  if (acc && acc > LOW_ACCURACY_METERS) {
    return `현재 위치 오차가 약 ${formatKm(acc / 1000)}입니다. 집·직장 출발지를 쓰면 더 정확합니다.`;
  }
  return null;
}

export default function App() {
  const data = useLibraryData();
  const now = useNow();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [mode, setMode] = useState<RoomKey>(() => readMode(getStorage()));
  const [prefs, setPrefs] = useState<ListPrefs>(() => readPrefs(getStorage()));
  const [theme, setTheme] = useState<Theme>(() => readTheme(getStorage()));
  const [offDistricts, setOffDistricts] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [picking, setPicking] = useState<PlaceKind | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [tab, setTab] = useState<DetailTab>('detail');
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>('mid');
  const originState = useOrigin(prefs.origin);
  const { origin, places, setPlace } = originState;
  const favorites = useFavorites();

  const changeMode = (next: RoomKey) => {
    setMode(next);
    saveMode(getStorage(), next);
  };

  const changePrefs = useCallback((patch: Partial<ListPrefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    savePrefs(getStorage(), patch);
  }, []);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    saveTheme(getStorage(), next);
  };

  const toggleDistrict = (district: string) =>
    setOffDistricts((prev) => {
      const next = new Set(prev);
      if (!next.delete(district)) next.add(district);
      return next;
    });

  const startPick = (kind: PlaceKind) => {
    setSettingsOpen(false);
    setPicking(kind);
    setSnap('low');
  };

  const onPick = useCallback(
    (point: { lat: number; lng: number }) => {
      if (!picking) return;
      setPlace(picking, { name: places[picking]?.name ?? PLACE_LABEL[picking], ...point });
      changePrefs({ origin: picking });
      setPicking(null);
      setSnap('mid');
    },
    [picking, places, setPlace, changePrefs],
  );

  const renamePlace = (kind: PlaceKind, name: string) => {
    const place = places[kind];
    if (place) setPlace(kind, { ...place, name: name.trim() || PLACE_LABEL[kind] });
  };

  const deletePlace = (kind: PlaceKind) => {
    setPlace(kind, null);
    if (prefs.origin === kind) changePrefs({ origin: 'current' });
  };

  const resetAll = () => {
    if (!window.confirm('저장된 설정, 출발지, 즐겨찾기를 모두 지울까요?')) return;
    try {
      for (const key of [SETTINGS_KEY, PLACES_KEY, FAVORITES_KEY, 'ln.notes']) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // 저장소가 막혀 있으면 지울 것도 없습니다
    }
    window.location.reload();
  };

  const onLocate = async () => {
    if (prefs.origin !== 'current') changePrefs({ origin: 'current' });
    const p = await originState.relocate();
    if (p) setFocus({ lat: p.lat, lng: p.lng });
    else if (origin) setFocus({ lat: origin.lat, lng: origin.lng });
  };

  const ready = data.kind === 'ready' ? data : null;
  const ctx = useMemo(() => ({ holidays: ready?.holidays ?? new Map<string, string>() }), [ready]);

  const allRows = useMemo(
    () => (ready ? buildRows(ready.libraries, { mode, now, ctx, origin }) : []),
    [ready, mode, now, ctx, origin],
  );
  const districtRows = useMemo(
    () => filterRows(allRows, { offDistricts, query: '', filters: [] }),
    [allRows, offDistricts],
  );
  const rows = useMemo(
    () =>
      sortRows(
        filterRows(districtRows, {
          offDistricts,
          query,
          filters: prefs.filters,
          favorites: favorites.ids,
        }),
        prefs.sort,
      ),
    [districtRows, offDistricts, query, prefs.filters, prefs.sort, favorites.ids],
  );
  const districtLibs = useMemo(() => districtRows.map((r) => r.lib), [districtRows]);

  const markers = useMemo<MapMarker[]>(
    () =>
      rows.map(({ lib, view }) => ({
        id: lib.id,
        lat: lib.lat,
        lng: lib.lng,
        tone: view.tone,
        name: lib.name,
        badge: view.badge,
        tag: view.tag,
        summary: view.summary,
      })),
    [rows],
  );

  const mapOrigin = useMemo<MapOrigin | null>(
    () => origin && { lat: origin.lat, lng: origin.lng, name: origin.name, kind: origin.kind },
    [origin],
  );

  // 달력에서 고른 도서관은 필터에 걸려도 상세를 보여 줍니다
  const selected =
    rows.find((r) => r.lib.id === selectedId) ??
    districtRows.find((r) => r.lib.id === selectedId) ??
    null;
  const openCount = rows.filter((r) => r.view.tone === 'open' || r.view.tone === 'soon').length;

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      setTab('detail');
      setCollapsed(false);
      if (isPhone) setSnap((s) => (s === 'low' ? 'mid' : s));
    },
    [isPhone],
  );

  const suggestion = useMemo(() => {
    const s = rows.length === 0 ? soonestOpening(districtRows) : null;
    return s && { id: s.row.lib.id, text: s.text };
  }, [rows.length, districtRows]);

  // ---- 화면 조각 ----
  const list = (
    <LibraryList
      className={isPhone ? styles.sheetPanel : styles.list}
      rows={rows}
      openCount={openCount}
      mode={mode}
      query={query}
      onQuery={setQuery}
      filters={prefs.filters}
      onFilters={(filters: FilterKey[]) => changePrefs({ filters })}
      sort={prefs.sort}
      onSort={(sort: SortKey) => changePrefs({ sort })}
      hasOrigin={Boolean(origin)}
      notice={originNotice(prefs.origin, originState)}
      suggestion={suggestion}
      selectedId={selected?.lib.id ?? null}
      onSelect={select}
      onHover={setHoverId}
      favorites={favorites.ids}
      onToggleFavorite={favorites.toggle}
      loading={data.kind === 'loading'}
    />
  );

  const detail = (
    <DetailPanel
      className={isPhone ? styles.sheetPanel : styles.detail}
      row={selected}
      rows={rows}
      libraries={districtLibs}
      mode={mode}
      now={now}
      origin={origin}
      ctx={ctx}
      holidayYears={ready?.meta.holidayYears ?? [toYear(now)]}
      favorites={favorites.ids}
      onToggleFavorite={favorites.toggle}
      onSelect={select}
      onClose={() => setSelectedId(null)}
      tab={tab}
      onTab={setTab}
      showTabs={!isPhone}
      onCollapse={
        isDesktop
          ? () => setCollapsed(true)
          : () => {
              setSelectedId(null);
              setTab('detail');
            }
      }
    />
  );

  const map = (
    <MapView
      className={styles.map}
      markers={markers}
      selectedId={selected?.lib.id ?? null}
      hoverId={hoverId}
      onSelect={select}
      origin={mapOrigin}
      pickLabel={picking ? `지도를 눌러 ${PLACE_LABEL[picking]} 위치를 고르세요` : null}
      onPick={onPick}
      onCancelPick={() => setPicking(null)}
      focus={focus}
      onLocate={onLocate}
    />
  );

  // 스마트폰 탭 바
  const phoneTab: PhoneTab = settingsOpen
    ? 'settings'
    : tab === 'calendar'
      ? 'calendar'
      : snap === 'low'
        ? 'map'
        : 'list';
  const onPhoneTab = (t: PhoneTab) => {
    if (t === 'settings') return setSettingsOpen(true);
    setSettingsOpen(false);
    if (t === 'map') return setSnap('low');
    if (t === 'calendar') {
      setTab('calendar');
      return setSnap('full');
    }
    setTab('detail');
    setSelectedId(null);
    setSnap((s) => (s === 'low' ? 'mid' : s));
  };
  const sheetTitle =
    tab === 'calendar' ? (
      '휴관 달력'
    ) : selected ? (
      `상세 · ${ROOM_NAME[mode]} 기준`
    ) : (
      <>
        문 연 곳 <b>{openCount}</b>곳 · {ROOM_NAME[mode]} 기준
      </>
    );

  return (
    <div className={styles.app}>
      <TopBar
        districts={ready?.districts ?? []}
        offDistricts={offDistricts}
        onToggleDistrict={toggleDistrict}
        mode={mode}
        onMode={changeMode}
        now={now}
        originChoice={prefs.origin}
        places={places}
        onOriginChoice={(choice) => changePrefs({ origin: choice })}
        onPickPlace={startPick}
        onSettings={() => setSettingsOpen(true)}
      />

      {data.kind === 'error' ? (
        <p className={styles.message} role="alert">
          도서관 정보를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.
        </p>
      ) : isPhone ? (
        <div className={styles.phoneBody}>
          {map}
          <BottomSheet
            snap={snap}
            onSnap={setSnap}
            title={<p className={styles.sheetTitle}>{sheetTitle}</p>}
          >
            {tab === 'calendar' || selected ? detail : list}
          </BottomSheet>
        </div>
      ) : (
        <div className={styles.body} data-collapsed={(isDesktop && collapsed) || undefined}>
          {list}
          {map}
          {detail}
          {isDesktop && collapsed && (
            <button
              type="button"
              className={styles.panelBtn}
              aria-label="오른쪽 패널 펼치기"
              onClick={() => setCollapsed(false)}
            >
              <PanelRightOpen size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
          {!isDesktop && !selected && tab !== 'calendar' && (
            <button
              type="button"
              className={styles.panelBtn}
              aria-label="휴관 달력 열기"
              onClick={() => setTab('calendar')}
            >
              <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {isPhone && <TabBar active={phoneTab} onTab={onPhoneTab} />}

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onTheme={changeTheme}
        places={places}
        onRenamePlace={renamePlace}
        onPickPlace={startPick}
        onDeletePlace={deletePlace}
        meta={ready?.meta ?? null}
        libraryCount={ready?.libraries.length ?? 0}
        onReset={resetAll}
      />
    </div>
  );
}

const toYear = (d: Date) => Number(d.toISOString().slice(0, 4));
