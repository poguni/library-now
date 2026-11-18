// 현재 시각. 매 분 정각에 다시 계산하고, 화면이 보이지 않을 때는 멈춥니다 (DESIGN 6).
import { useEffect, useState } from 'react';

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    const tick = () => {
      setNow(new Date());
      schedule();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
      else clearTimeout(timer);
    };
    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return now;
}
