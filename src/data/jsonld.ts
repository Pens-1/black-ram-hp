// 構造化データ（JSON-LD）を作る関数。内容は src/data/sheet/*.json と site.ts のリンクにある事実だけ。
// 空データ・欠けた項目でも壊れない（出せないものは出さない）。JSON や Astro を import しない純粋関数なのでテストできる。

type Json = Record<string, unknown>;

export type LdLinks = { instagram: string; x: string; tiktok: string; tunecore: string };
export type LdEp = {
  title: string;
  kind?: string;
  release?: string;
  href?: string;
  /** ジャケット画像のパス（`.webp` の前まで）。ジャケットなしなら省略 */
  cover?: string;
};
export type LdLive = {
  date: string | null;
  endsAt: string | null;
  venue: string;
  title: string;
  open: string;
  start: string;
  price: string;
  acts: string[];
  ticket: string;
};
export type LdGoods = { name: string; price: string; href: string; soldOut: boolean; photo?: string };

const NAME = 'BLACK RAM';
const abs = (site: string, p: string) => (/^https?:\/\//.test(p) ? p : new URL(p, site).href);
const group = (site: string): Json => ({ '@type': 'MusicGroup', name: NAME, url: `${site}/` });

/** `<script type="application/ld+json">` の中身。`<` `>` `&` と行区切り文字をエスケープして </script> を壊せなくする */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function musicGroupLd(site: string, links: LdLinks, image?: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': `${site}/#band`,
    name: NAME,
    url: `${site}/`,
    ...(image ? { image: abs(site, image) } : {}),
    sameAs: [links.instagram, links.x, links.tiktok, links.tunecore].filter(Boolean),
  };
}

export function webSiteLd(site: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site}/#website`,
    name: NAME,
    url: `${site}/`,
    inLanguage: 'ja',
    publisher: { '@id': `${site}/#band` },
  };
}

const validDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** 曲（EP など）。作品名があるものだけ */
export function musicAlbumsLd(site: string, eps: LdEp[]): Json[] {
  return eps
    .filter((e) => e.title)
    .map((e) => ({
      '@context': 'https://schema.org',
      '@type': 'MusicAlbum',
      name: e.title,
      byArtist: group(site),
      ...(e.kind === 'EP' ? { albumReleaseType: 'https://schema.org/EPRelease' } : {}),
      ...(validDate(e.release) ? { datePublished: e.release } : {}),
      ...(e.cover ? { image: abs(site, `${e.cover}.webp`) } : {}),
      ...(e.href ? { url: e.href } : {}),
    }));
}

const hhmm = /^\d{1,2}:\d{2}$/;
const iso = (date: string, time: string) => `${date}T${time.padStart(5, '0')}:00+09:00`;
const yen = (s: string) => {
  const d = s.replace(/[,，]/g, '').match(/\d+/);
  return d ? d[0] : null;
};

/** 今後のライブ（まだ終わっていないもの）。日付が空・年なし・過去は出さない */
export function musicEventsLd(site: string, lives: LdLive[], now = new Date()): Json[] {
  return lives
    .filter((l) => l.date && l.endsAt && l.venue && now.getTime() < new Date(l.endsAt).getTime())
    .map((l) => {
      const offer: Json = {
        '@type': 'Offer',
        ...(l.ticket ? { url: l.ticket } : {}),
        ...(l.price ? { description: l.price } : {}),
      };
      return {
        '@context': 'https://schema.org',
        '@type': 'MusicEvent',
        name: l.title || `${NAME} LIVE @ ${l.venue}`,
        startDate: hhmm.test(l.start) ? iso(l.date!, l.start) : l.date,
        ...(hhmm.test(l.open) && hhmm.test(l.start) ? { doorTime: iso(l.date!, l.open) } : {}),
        location: { '@type': 'Place', name: l.venue },
        performer: [group(site), ...l.acts.filter((a) => a && a !== NAME).map((a) => ({ '@type': 'PerformingGroup', name: a }))],
        ...(l.ticket || l.price ? { offers: offer } : {}),
      };
    });
}

/** グッズ。名前があるものだけ。価格が読めるときだけ offers（売り切れ列で SoldOut / InStock） */
export function productsLd(site: string, items: LdGoods[]): Json[] {
  return items
    .filter((g) => g.name)
    .map((g) => {
      const price = yen(g.price);
      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: g.name,
        brand: { '@type': 'Brand', name: NAME },
        ...(g.photo ? { image: abs(site, `${g.photo}.webp`) } : {}),
        ...(price
          ? {
              offers: {
                '@type': 'Offer',
                price,
                priceCurrency: 'JPY',
                availability: g.soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
                ...(g.href ? { url: g.href } : {}),
              },
            }
          : {}),
      };
    });
}
