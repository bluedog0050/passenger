import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { buildCsp } from './src/lib/csp';

// 內容安全政策（CSP）：外部主機定義在 src/lib/csp.ts。
// 只在正式打包時加入，因為開發伺服器需要即時更新的 inline 程式。
const CSP = buildCsp();

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  base: '/passenger/',
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '行人地獄',
        short_name: '行人地獄',
        description: '回報人行道路況，幫助台灣行人安心走在馬路上。',
        lang: 'zh-Hant-TW',
        start_url: '/passenger/',
        scope: '/passenger/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#F57C00',
        background_color: '#FFFFFF',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 只預先快取 App 本身；地圖圖磚不快取（遵守 OSM 使用政策、避免佔用手機空間）
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
});
