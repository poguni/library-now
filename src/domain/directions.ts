// 길찾기 링크 생성은 이 파일 한 곳에 모읍니다 (PRD F8, 7.2).
// 출발지 좌표는 사용자가 링크를 누를 때만 외부로 나갑니다.
import type { LatLng } from './travel';

export interface Place extends LatLng {
  name: string;
}

/** 쉼표와 슬래시는 카카오맵 링크의 구분자라 이름에서 뺍니다 */
const kakaoName = (name: string) => encodeURIComponent(name.replace(/[,/]/g, ' ').trim());
const kakaoPoint = (p: Place) => `${kakaoName(p.name)},${p.lat},${p.lng}`;

/** 카카오맵 웹 길찾기. 스마트폰에 앱이 있으면 앱으로 열림 */
export function kakaoDirectionsUrl(to: Place, from: Place | null): string {
  return from
    ? `https://map.kakao.com/link/from/${kakaoPoint(from)}/to/${kakaoPoint(to)}`
    : `https://map.kakao.com/link/to/${kakaoPoint(to)}`;
}

/** 네이버 지도 앱 대중교통 길찾기 (스마트폰 전용). appname은 앱 주소 */
export function naverDirectionsUrl(to: Place, from: Place | null, appName: string): string {
  const q = new URLSearchParams();
  if (from) {
    q.set('slat', String(from.lat));
    q.set('slng', String(from.lng));
    q.set('sname', from.name);
  }
  q.set('dlat', String(to.lat));
  q.set('dlng', String(to.lng));
  q.set('dname', to.name);
  q.set('appname', appName);
  return `nmap://route/public?${q.toString()}`;
}

/** 네이버 지도 앱이 없을 때 대신 여는 웹 검색 */
export function naverWebUrl(to: Place): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(to.name)}`;
}
