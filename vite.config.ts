import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BASE = '/library-now/';

// GitHub Pages 주소: https://{아이디}.github.io/library-now/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    // 홈 화면 설치·오프라인 보기 (PRD F15)
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '지금 열린 도서관',
        short_name: '열린 도서관',
        description: '지금 문 연 도서관과 지금 가면 몇 시간 이용할 수 있는지를 지도로 보여 줍니다.',
        lang: 'ko',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        theme_color: '#22392d',
        background_color: '#f4eee2',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 앱 화면과 도서관·공휴일 JSON을 미리 저장합니다 (새 버전 배포 시 함께 바뀜)
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        navigateFallback: 'index.html',
        // 지도 타일(tile.openstreetmap.org)은 OSM 정책에 따라 저장하지 않습니다.
        // 여기에 없는 주소는 서비스 워커가 손대지 않고 그대로 네트워크로 보냅니다.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
