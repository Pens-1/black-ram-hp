// robots.txt。noindex の間は全部拒否、公開後は許可。フラグは src/data/seo-config.ts の NOINDEX
import type { APIRoute } from 'astro';
import { NOINDEX, SITE_URL } from '../data/seo-config';

export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      NOINDEX ? 'Disallow: /' : 'Allow: /',
      '',
      `Sitemap: ${SITE_URL}/sitemap-index.xml`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
