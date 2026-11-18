// public/data/*.json 불러오기. 앱은 실행 중 외부 API를 부르지 않습니다.
import { useEffect, useState } from 'react';
import type { HolidayMap } from '../domain/schedule';
import type { HolidaysFile, LibrariesFile, Library } from '../domain/types';

export interface MetaFile {
  generatedAt: string;
  districts: string[];
  baseDates: string[];
  holidayYears: number[];
  sources: { name: string; provider: string; license: string | null }[];
}

export type DataState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      libraries: Library[];
      districts: string[];
      holidays: HolidayMap;
      meta: MetaFile;
    };

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
}

async function load(): Promise<DataState> {
  const [libs, meta] = await Promise.all([
    getJson<LibrariesFile>('libraries.json'),
    getJson<MetaFile>('meta.json'),
  ]);
  const years = await Promise.all(
    meta.holidayYears.map((y) => getJson<HolidaysFile>(`holidays-${y}.json`)),
  );
  const holidays = new Map(years.flatMap((f) => f.holidays.map((h) => [h.date, h.name] as const)));
  const districts = [...meta.districts].sort((a, b) => a.localeCompare(b, 'ko'));
  return { kind: 'ready', libraries: libs.libraries, districts, holidays, meta };
}

export function useLibraryData(): DataState {
  const [state, setState] = useState<DataState>({ kind: 'loading' });
  useEffect(() => {
    let alive = true;
    load()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState({ kind: 'error' }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
