// 由 public/icon.svg 產生 PWA 需要的 PNG 圖示。用法：node scripts/gen-icons.mjs
// 需要 Playwright（本機或雲端環境已安裝的 Chromium）。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync('public/icon.svg', 'utf8');
const targets = [
  { file: 'public/icon-192.png', size: 192, pad: 0, round: true },
  { file: 'public/icon-512.png', size: 512, pad: 0, round: true },
  // maskable：四周留安全邊界、滿版底色，讓 Android 可以裁成各種形狀
  { file: 'public/icon-512-maskable.png', size: 512, pad: 0.12, round: false },
  // iOS 會自動加圓角，所以給滿版方形
  { file: 'public/apple-touch-icon.png', size: 180, pad: 0, round: false },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const body = t.round ? svg : svg.replace('rx="112"', 'rx="0"');
  const inner = t.size * (1 - t.pad * 2);
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:${t.round ? 'transparent' : '#F57C00'};display:flex;align-items:center;justify-content:center;width:${t.size}px;height:${t.size}px">
      <div style="width:${inner}px;height:${inner}px">${body.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  );
  await page.screenshot({ path: t.file, omitBackground: t.round });
  console.log('wrote', t.file);
}
await browser.close();
