// 출발지 고르기 (PRD F6): 현재 위치 / 집 / 직장.
// 현재 위치를 못 쓰면 집 → 직장 순서로 대신 씁니다. 둘 다 없으면 출발지 없음(이동 시간 0, F5).
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Place } from '../domain/directions';
import { type PlaceKind, type Places, readPlaces, savePlace } from './places';
import { type OriginChoice, getStorage } from './settings';

export interface Origin extends Place {
  kind: OriginChoice;
  /** 현재 위치의 오차(m). 집·직장은 null */
  accuracy: number | null;
}

interface Position {
  lat: number;
  lng: number;
  accuracy: number;
}

export type LocateError = 'denied' | 'unavailable';

export interface OriginState {
  origin: Origin | null;
  places: Places;
  /** 현재 위치를 찾는 중 */
  locating: boolean;
  /** 현재 위치를 못 쓴 이유 */
  error: LocateError | null;
  /** 현재 위치 대신 집·직장을 쓰는 중 */
  fallback: boolean;
  setPlace(kind: PlaceKind, place: Place | null): void;
  /** 현재 위치를 다시 찾습니다. 찾으면 그 위치를 돌려줍니다 */
  relocate(): Promise<Position | null>;
}

const hasGeolocation = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

function locate(): Promise<Position> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export function useOrigin(choice: OriginChoice): OriginState {
  const [places, setPlaces] = useState<Places>(() => readPlaces(getStorage()));
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<LocateError | null>(() =>
    hasGeolocation() ? null : 'unavailable',
  );

  // 현재 위치를 고른 동안 한 번 찾습니다 (상태는 결과가 온 뒤에만 바뀜)
  const wantsLocation = choice === 'current' && !position && !error;
  useEffect(() => {
    if (!wantsLocation) return;
    let alive = true;
    locate().then(
      (p) => alive && setPosition(p),
      (e: LocateError) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, [wantsLocation]);

  const relocate = useCallback(async () => {
    if (!hasGeolocation()) return null;
    try {
      const p = await locate();
      setPosition(p);
      setError(null);
      return p;
    } catch (e) {
      setError(e as LocateError);
      return null;
    }
  }, []);

  const setPlace = useCallback((kind: PlaceKind, place: Place | null) => {
    savePlace(getStorage(), kind, place);
    setPlaces((prev) => ({ ...prev, [kind]: place }));
  }, []);

  // 위치·저장값이 같으면 같은 객체를 돌려줘 화면이 불필요하게 다시 계산하지 않게 합니다
  const { origin, fallback } = useMemo((): { origin: Origin | null; fallback: boolean } => {
    if (choice !== 'current') {
      const place = places[choice];
      return { origin: place && { kind: choice, accuracy: null, ...place }, fallback: false };
    }
    if (position)
      return { origin: { kind: 'current', name: '현재 위치', ...position }, fallback: false };
    if (!error) return { origin: null, fallback: false };
    const kind: PlaceKind | null = places.home ? 'home' : places.work ? 'work' : null;
    return kind
      ? { origin: { kind, accuracy: null, ...places[kind]! }, fallback: true }
      : { origin: null, fallback: false };
  }, [choice, position, error, places]);

  return { origin, places, locating: wantsLocation, error, fallback, setPlace, relocate };
}
