/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 카카오맵 JavaScript 키. 없으면 카카오맵 선택지를 숨깁니다 (PRD 7.1) */
  readonly VITE_KAKAO_JS_KEY?: string;
}
