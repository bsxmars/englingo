import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { 'virtual:course': fileURLToPath(new URL('./src/test/course-fixture.ts', import.meta.url)) },
  },
  test: {
    include: ['build/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'happy-dom',
    setupFiles: ['fake-indexeddb/auto'],
  },
});
