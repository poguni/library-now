// 화면 너비 구간 (DESIGN 4.1). 배치가 크게 달라지는 스마트폰·데스크탑 구분에 씁니다.
import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

export const PHONE_QUERY = '(max-width: 767px)';
export const DESKTOP_QUERY = '(min-width: 1200px)';
