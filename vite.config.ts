import { copyFileSync } from 'node:fs';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { course } from './build/course-plugin.ts';

// GitHub Pages serves the site at /<repo>/; `npm run build -- --base=/<repo>/` sets it.
// Pages has no SPA fallback, so 404.html is the app too: a deep link opens it and the router takes over.
const spaFallback = (): Plugin => ({
  name: 'englingo-404',
  apply: 'build',
  closeBundle() {
    copyFileSync('dist/index.html', 'dist/404.html');
  },
});

export default defineConfig({
  base: '/englingo/',
  plugins: [
    vue(),
    course('content'),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Englingo — курс английского',
        short_name: 'Englingo',
        description: 'Английский от B1 до C1: грамматика, чтение, письмо, карточки.',
        lang: 'ru',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1C9FD6',
        background_color: '#F4F6F8',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole course works offline: the shell and every lesson chunk are precached.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['404.html'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
    spaFallback(),
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) =>
          chunk.facadeModuleId?.includes('virtual:course/') ? 'assets/course/[name]-[hash].js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
