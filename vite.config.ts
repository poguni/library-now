import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소: https://{아이디}.github.io/library-now/
export default defineConfig({
  base: '/library-now/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
