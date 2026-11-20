// 화면 테스트 (CLAUDE.md: 1440×900·390×844, 테마 3종 확인)
import { defineConfig } from '@playwright/test';

const PORT = 5174;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/library-now/`,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    // 위치는 테스트 브라우저 안에서만 쓰는 가짜 좌표 (신도림역 근처)
    geolocation: { latitude: 37.5088, longitude: 126.8913, accuracy: 30 },
    permissions: ['geolocation'],
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/library-now/`,
    reuseExistingServer: !process.env.CI,
    // 실제 키 대신 가짜 키: 카카오맵 선택지가 보이고, SDK 요청은 테스트에서 막습니다
    env: { VITE_KAKAO_JS_KEY: 'e2e-fake-key' },
  },
});
