// 데스크탑 3단 배치 기본형 (PRD 8.2, M1): 상단 바 / 목록 · 지도 · 상세
import { useCallback, useMemo, useState } from 'react';
import styles from './App.module.css';
import { DetailPanel } from './components/DetailPanel';
import { LibraryList } from './components/LibraryList';
import { MapView } from './components/MapView';
import { TopBar } from './components/TopBar';
import type { LibraryRow } from './components/types';
import { TONE_ORDER, describeClosedRule, presentStatus } from './domain/present';
import { getStatus } from './domain/status';
import type { RoomKey } from './domain/types';
import type { MapMarker } from './map/types';
import { getStorage, readMode, saveMode } from './state/settings';
import { useLibraryData } from './state/useLibraryData';
import { useNow } from './state/useNow';

const OTHER: Record<RoomKey, RoomKey> = { lending: 'reading', reading: 'lending' };

export default function App() {
  const data = useLibraryData();
  const now = useNow();
  const [mode, setMode] = useState<RoomKey>(() => readMode(getStorage()));
  const [offDistricts, setOffDistricts] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const changeMode = (next: RoomKey) => {
    setMode(next);
    saveMode(getStorage(), next);
  };

  const toggleDistrict = (district: string) =>
    setOffDistricts((prev) => {
      const next = new Set(prev);
      if (!next.delete(district)) next.add(district);
      return next;
    });

  const allRows = useMemo<LibraryRow[]>(() => {
    if (data.kind !== 'ready') return [];
    const ctx = { holidays: data.holidays };
    return data.libraries
      .map((lib) => ({
        lib,
        view: presentStatus(getStatus(lib, mode, now, ctx), mode),
        other: presentStatus(getStatus(lib, OTHER[mode], now, ctx), OTHER[mode]),
        ruleText: describeClosedRule(lib.closed),
      }))
      .sort(
        (a, b) =>
          TONE_ORDER[a.view.tone] - TONE_ORDER[b.view.tone] ||
          a.lib.name.localeCompare(b.lib.name, 'ko'),
      );
  }, [data, mode, now]);

  const rows = useMemo(() => {
    const q = query.replace(/\s+/g, '');
    return allRows.filter(
      (r) => !offDistricts.has(r.lib.district) && r.lib.name.replace(/\s+/g, '').includes(q),
    );
  }, [allRows, offDistricts, query]);

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

  const selected = rows.find((r) => r.lib.id === selectedId) ?? null;
  const openCount = rows.filter((r) => r.view.tone === 'open' || r.view.tone === 'soon').length;
  const select = useCallback((id: string) => setSelectedId(id), []);

  return (
    <div className={styles.app}>
      <TopBar
        districts={data.kind === 'ready' ? data.districts : []}
        offDistricts={offDistricts}
        onToggleDistrict={toggleDistrict}
        mode={mode}
        onMode={changeMode}
        now={now}
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
          />
          <DetailPanel
            className={styles.detail}
            row={selected}
            rows={rows}
            mode={mode}
            now={now}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
