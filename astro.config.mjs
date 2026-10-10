// @ts-check
import { defineConfig } from 'astro/config';

// 公開先は未定。決まったら SITE_URL（例: https://example.com）を渡すと og:image などが絶対URLになる
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  server: { port: 4321 },
});
