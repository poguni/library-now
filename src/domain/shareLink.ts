// 링크 공유 (PRD F17): 주소에 선택한 도서관과 이용 모드를 담습니다.
// 위치·출발지는 담지 않습니다.
import type { RoomKey } from './types';

export interface ShareState {
  lib: string | null;
  mode: RoomKey | null;
}

/** 예: https://poguni.github.io/library-now/?lib=guro-01&mode=reading */
export function shareUrl(appUrl: string, lib: string, mode: RoomKey): string {
  const params = new URLSearchParams({ lib, mode });
  return `${appUrl}?${params.toString()}`;
}

/** 모르는 모드 값은 무시합니다. 도서관 id가 맞는지는 데이터를 불러온 뒤 화면에서 판단합니다. */
export function parseShare(search: string): ShareState {
  const params = new URLSearchParams(search);
  const lib = params.get('lib')?.trim() || null;
  const raw = params.get('mode');
  const mode = raw === 'lending' || raw === 'reading' ? raw : null;
  return { lib, mode };
}
