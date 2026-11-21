// 길찾기·주소 복사·홈페이지 버튼 (PRD F8, DESIGN 5.8 .acts)
import { Copy, Link as LinkIcon, Navigation, Share2 } from 'lucide-react';
import { useState } from 'react';
import {
  type Place,
  kakaoDirectionsUrl,
  naverDirectionsUrl,
  naverWebUrl,
} from '../domain/directions';
import { shareUrl } from '../domain/shareLink';
import type { Library, RoomKey } from '../domain/types';
import styles from './DirectionsBar.module.css';

interface Props {
  lib: Library;
  origin: Place | null;
  mode: RoomKey;
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

export function DirectionsBar({ lib, origin, mode }: Props) {
  const [copied, setCopied] = useState<'ok' | 'fail' | 'link' | 'linkFail' | null>(null);
  const to: Place = { name: lib.name, lat: lib.lat, lng: lib.lng };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lib.address);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };

  // 링크 공유 (F17): 스마트폰은 공유 창, 그 밖에는 주소 복사
  const link = shareUrl(APP_URL(), lib.id, mode);
  const share = async () => {
    if (isPhone() && navigator.share) {
      try {
        await navigator.share({ title: lib.name, url: link });
      } catch {
        // 사용자가 공유 창을 닫음
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied('link');
    } catch {
      setCopied('linkFail');
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
        <button
          type="button"
          className={styles.btn}
          aria-label="주소 복사"
          data-tip="주소 복사"
          onClick={copy}
        >
          <Copy size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.btn}
          aria-label="이 도서관 링크 공유"
          data-tip="링크 공유"
          data-tip-pos={lib.homepage ? undefined : 'end'}
          onClick={share}
        >
          <Share2 size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        {lib.homepage && (
          <a
            className={styles.btn}
            href={lib.homepage}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="홈페이지(임시 휴관 공지 확인)"
            data-tip="홈페이지(임시 휴관 공지)"
            data-tip-pos="end"
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
        {copied === 'link' && '링크를 복사했습니다.'}
        {copied === 'linkFail' && `복사하지 못했습니다. 링크: ${link}`}
      </p>
    </div>
  );
}
