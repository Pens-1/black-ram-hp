// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NOINDEX, SITE_URL } from './src/data/seo-config.ts';

// noindex の間だけ dist/_headers に X-Robots-Tag を出す（Cloudflare Pages）。フラグは src/data/seo-config.ts
/** @type {import('astro').AstroIntegration} */
const noindexHeaders = {
  name: 'noindex-headers',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      if (!NOINDEX) return;
      await writeFile(fileURLToPath(new URL('_headers', dir)), '/*\n  X-Robots-Tag: noindex, nofollow\n');
    },
  },
};

export default defineConfig({
  site: SITE_URL,
  server: { port: 4321 },
  devToolbar: { enabled: false },
  integrations: [sitemap(), noindexHeaders],
});
