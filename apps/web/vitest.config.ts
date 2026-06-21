import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.{ts,tsx}'],
  },
  resolve: {
    alias: { '@zanweb/shared': new URL('../../packages/shared/src', import.meta.url).pathname },
  },
});