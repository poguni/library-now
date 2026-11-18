// 길찾기·주소 복사·홈페이지 버튼 (PRD F8, DESIGN 5.8 .acts)
import { Copy, Link as LinkIcon, Navigation } from 'lucide-react';
import { useState } from 'react';
import {
  type Place,
  kakaoDirectionsUrl,
  naverDirectionsUrl,
  naverWebUrl,
} from '../domain/directions';
import type { Library } from '../domain/types';
import styles from './DirectionsBar.module.css';

interface Props {
  lib: Library;
  origin: Place | null;
}

/** 네이버 지도 앱 스킴은 스마트폰에서만 보여 줍니다 (F8) */
const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const APP_URL = () => `${location.origin}${import.meta.env.BASE_URL}`;

/** 앱이 없어 화면이 그대로면 1.5초 뒤 네이버 지도 웹으로 엽니다 */
function openNaverWithFallback(webUrl: string) {
  const timer = setTimeout(() => {
    if (!document.hidden) window.location.href = webUrl;
  }, 1500);
  document.addEventListener('visibilitychange', () => clearTimeout(timer), { once: true });
}

export function DirectionsBar({ lib, origin }: Props) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const to: Place = { name: lib.name, lat: lib.lat, lng: lib.lng };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lib.address);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.acts}>
        <a
          className={`${styles.btn} ${styles.pri}`}
          href={kakaoDirectionsUrl(to, origin)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Navigation size={18} strokeWidth={1.8} aria-hidden="true" />
          카카오맵으로 길찾기
        </a>
        <button type="button" className={styles.btn} aria-label="주소 복사" onClick={copy}>
          <Copy size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        {lib.homepage && (
          <a
            className={styles.btn}
            href={lib.homepage}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="홈페이지 (임시 휴관 공지 확인)"
          >
            <LinkIcon size={18} strokeWidth={1.8} aria-hidden="true" />
          </a>
        )}
      </div>
      {isPhone() && (
        <a
          className={styles.btn}
          href={naverDirectionsUrl(to, origin, APP_URL())}
          onClick={() => openNaverWithFallback(naverWebUrl(to))}
        >
          네이버 지도로 길찾기
        </a>
      )}
      <p className={styles.status} role="status">
        {copied === 'ok' && '주소를 복사했습니다.'}
        {copied === 'fail' && `복사하지 못했습니다. 주소: ${lib.address}`}
      </p>
    </div>
  );
}
