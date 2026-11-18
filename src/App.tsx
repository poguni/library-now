// 데스크탑 3단 배치 (PRD 8.2): 상단 바 / 목록 · 지도 · 상세
import { useCallback, useMemo, useState } from 'react';
import styles from './App.module.css';
import { DetailPanel } from './components/DetailPanel';
import { LibraryList } from './components/LibraryList';
import { MapView } from './components/MapView';
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
import { formatKm } from './domain/travel';
import type { RoomKey } from './domain/types';
import type { MapMarker, MapOrigin } from './map/types';
import { PLACE_LABEL, type PlaceKind } from './state/places';
import {
  type ListPrefs,
  getStorage,
  readMode,
  readPrefs,
  saveMode,
  savePrefs,
} from './state/settings';
import { useLibraryData } from './state/useLibraryData';
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
      : `${why} 이동 시간을 빼지 않았습니다. 상단 '출발'에서 집·직장을 지정할 수 있습니다.`;
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
  const [mode, setMode] = useState<RoomKey>(() => readMode(getStorage()));
  const [prefs, setPrefs] = useState<ListPrefs>(() => readPrefs(getStorage()));
  const [offDistricts, setOffDistricts] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [picking, setPicking] = useState<PlaceKind | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const originState = useOrigin(prefs.origin);
  const { origin, setPlace } = originState;

  const changeMode = (next: RoomKey) => {
    setMode(next);
    saveMode(getStorage(), next);
  };

  const changePrefs = useCallback((patch: Partial<ListPrefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    savePrefs(getStorage(), patch);
  }, []);

  const toggleDistrict = (district: string) =>
    setOffDistricts((prev) => {
      const next = new Set(prev);
      if (!next.delete(district)) next.add(district);
      return next;
    });

  const onPick = useCallback(
    (point: { lat: number; lng: number }) => {
      if (!picking) return;
      setPlace(picking, { name: PLACE_LABEL[picking], ...point });
      changePrefs({ origin: picking });
      setPicking(null);
    },
    [picking, setPlace, changePrefs],
  );

  const onLocate = async () => {
    if (prefs.origin !== 'current') changePrefs({ origin: 'current' });
    const p = await originState.relocate();
    if (p) setFocus({ lat: p.lat, lng: p.lng });
    else if (origin) setFocus({ lat: origin.lat, lng: origin.lng });
  };

  const allRows = useMemo(() => {
    if (data.kind !== 'ready') return [];
    return buildRows(data.libraries, {
      mode,
      now,
      ctx: { holidays: data.holidays },
      origin,
    });
  }, [data, mode, now, origin]);

  const districtRows = useMemo(
    () => filterRows(allRows, { offDistricts, query: '', filters: [] }),
    [allRows, offDistricts],
  );
  const rows = useMemo(
    () =>
      sortRows(
        filterRows(districtRows, { offDistricts, query, filters: prefs.filters }),
        prefs.sort,
      ),
    [districtRows, offDistricts, query, prefs.filters, prefs.sort],
  );

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

  const selected = rows.find((r) => r.lib.id === selectedId) ?? null;
  const openCount = rows.filter((r) => r.view.tone === 'open' || r.view.tone === 'soon').length;
  const select = useCallback((id: string) => setSelectedId(id), []);
  const suggestion = useMemo(() => {
    const s = rows.length === 0 ? soonestOpening(districtRows) : null;
    return s && { id: s.row.lib.id, text: s.text };
  }, [rows.length, districtRows]);

  return (
    <div className={styles.app}>
      <TopBar
        districts={data.kind === 'ready' ? data.districts : []}
        offDistricts={offDistricts}
        onToggleDistrict={toggleDistrict}
        mode={mode}
        onMode={changeMode}
        now={now}
        originChoice={prefs.origin}
        places={originState.places}
        onOriginChoice={(choice) => changePrefs({ origin: choice })}
        onPickPlace={setPicking}
      />
      {data.kind === 'error' ? (
        <p className={styles.message} role="alert">
          도서관 정보를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.
        </p>
      ) : (
        <div className={styles.body} data-selected={selected ? '' : undefined}>
          <LibraryList
            className={styles.list}
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
            loading={data.kind === 'loading'}
          />
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
          <DetailPanel
            className={styles.detail}
            row={selected}
            rows={rows}
            mode={mode}
            now={now}
            origin={origin}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
