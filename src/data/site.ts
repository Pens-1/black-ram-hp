// サイトの中身はすべてここに集める。
// 事実は PRODUCT.md / docs/site-design.md にあるものだけ。未確認の項目は空のまま（創作しない）。

import sheetLivesJson from './sheet/lives.json';
import sheetSongsJson from './sheet/songs.json';
import sheetGoodsJson from './sheet/goods.json';
import { SITE_URL, NOINDEX } from './seo-config';

export { SITE_URL, NOINDEX };

/** small: 一覧用の `-s.webp` があるか（省略時はある扱い） */
export type Img = { src: string; w: number; h: number; alt: string; small?: boolean };

/** public/ 以下の WebP。`<name>.webp`（長辺 ≤1600）と `<name>-s.webp`（長辺 ≤800）がある */
export const img = (path: string, w: number, h: number, alt: string): Img => ({ src: path, w, h, alt });

export function srcset(i: Img): string {
  const long = Math.max(i.w, i.h);
  if (long <= 800 || i.small === false) return `${i.src}.webp ${i.w}w`;
  const sw = Math.round((i.w * 800) / long);
  return `${i.src}-s.webp ${sw}w, ${i.src}.webp ${i.w}w`;
}

export const links = {
  instagram: 'https://www.instagram.com/black_______ram/',
  x: 'https://x.com/blackram0418',
  tiktok: 'https://www.tiktok.com/@blackram893',
  tunecore: 'https://www.tunecore.co.jp/artists?id=1109406',
} as const;

export const social = [
  { name: 'Instagram', icon: 'instagram', href: links.instagram, handle: 'black_______ram' },
  { name: 'X', icon: 'x', href: links.x, handle: 'blackram0418' },
  { name: 'TikTok', icon: 'tiktok', href: links.tiktok, handle: '@blackram893' },
] as const;

/** トップ内の移動（ヘッダーとメニュー） */
export const nav = [
  { id: 'music', label: 'MUSIC' },
  { id: 'live', label: 'LIVE' },
] as const;

/** 別ページ（全画面メニューから行く） */
export const pages = [
  { href: '/photo/', label: 'PHOTO' },
  { href: '/video/', label: 'VIDEO' },
  { href: '/goods/', label: 'GOODS' },
  { href: '/profile/', label: 'PROFILE' },
  { href: '/past-live/', label: 'PAST LIVE' },
] as const;

/* ---------- スプレッドシート由来（ライブ・曲・グッズ） ----------
   scripts/fetch-sheet.mjs がビルド前にシートを読み、src/data/sheet/*.json に書き出す（docs/sheet-update.md）。
   ここではその JSON を、ビルド時の日付で「次のライブ／過去のライブ」「最新作」に振り分けるだけ */

type SheetImg = { src: string; w: number; h: number; small: boolean };
type SheetLive = {
  year: number | null;
  month: number;
  day: number;
  area: string;
  venue: string;
  title: string;
  open: string;
  start: string;
  price: string;
  acts: string[];
  actTime: string;
  ticket: string;
  flyer: SheetImg | null;
};
type SheetSong = {
  title: string;
  kind: string;
  release: string;
  href: string;
  spotify: string;
  services: Service[];
  cover: SheetImg | null;
};
type SheetGoods = {
  name: string;
  price: string;
  variants: string;
  href: string;
  soldOut: boolean;
  photo: SheetImg | null;
};

const sheetLives = sheetLivesJson as SheetLive[];
const sheetSongs = sheetSongsJson as SheetSong[];
const sheetGoods = sheetGoodsJson as SheetGoods[];

// 以前から手で書いていた画像の説明（alt）。シートにない画像は内容から組み立てる
const knownAlt: Record<string, string> = {
  '/img/live/0622-gattaca':
    '6月22日 LIVE HOUSE GATTACA「天変地異」のフライヤー。出演 Festina Lente、hakumeii、龍之介 (Slipout Blank)、BLACK RAM。OPEN 18:30 START 19:00、ADV ¥2400 DOOR ¥2900',
  '/img/live/0814-kyoto-muse': '「8月14日 KYOTO MUSE」の告知画像。電車の扉に書かれた BLACK RAM の文字',
  '/img/music/rams-ball': "EP「RAM'S BALL」のジャケット。炎に包まれた手",
  '/img/music/baby-tank': 'EP「BABY TANK」のジャケット。白地に描かれた骨の手',
  '/img/music/ass-hole': 'EP「ASS HOLE」のジャケット。黒地に白い筆文字の BLACK RAM ロゴと羊の頭蓋骨',
  '/img/goods/Db_ZAHkk-q8': '地面に置かれた黒いTシャツ。胸に白いグラフィック',
};
const toImg = (i: SheetImg | null, alt: string): Img | undefined =>
  i ? { src: i.src, w: i.w, h: i.h, small: i.small, alt: knownAlt[i.src] ?? alt } : undefined;

const pad2 = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export type Live = {
  /** 公演日 YYYY-MM-DD（日本時間）。年が分からない古いライブは null */
  date: string | null;
  month: number;
  day: number;
  /** 曜日（年が分かるときだけ） */
  weekday: string;
  /** この時刻を過ぎたら終わった扱い（公演日の翌日 0 時、日本時間）。年なしは null（過去扱い） */
  endsAt: string | null;
  area: string;
  venue: string;
  title: string;
  open: string;
  start: string;
  price: string;
  acts: string[];
  /** BLACK RAM の出演時間（空なら出さない） */
  actTime: string;
  /** チケット・予約のリンク（空ならボタンを出さない） */
  ticket: string;
  /** フライヤーに書かれている情報（過去のライブでフライヤーと一緒に出す） */
  details: string[];
  flyer?: Img;
};

function toLive(l: SheetLive): Live {
  const date = l.year ? `${l.year}-${pad2(l.month)}-${pad2(l.day)}` : null;
  // 公演日の翌日 0 時（日本時間）。Date.UTC は月末の繰り上がりを処理する
  const next = date ? new Date(Date.UTC(l.year!, l.month - 1, l.day + 1)) : null;
  const endsAt = next
    ? `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}T00:00:00+09:00`
    : null;
  const weekday = l.year ? WEEKDAYS[new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay()] : '';
  const label = `${l.month}月${l.day}日 ${l.venue}${l.title ? `「${l.title}」` : ''}`;
  return {
    ...l,
    date,
    weekday,
    endsAt,
    details: [
      l.acts.join(' / '),
      [l.open && `OPEN ${l.open}`, l.start && `START ${l.start}`].filter(Boolean).join(' / '),
      l.price,
    ].filter(Boolean),
    flyer: toImg(l.flyer, `${label}のフライヤー`),
  };
}

/** そのライブが終わったか（ビルド時の判定。表示時は main.ts がもう一度判定する）。年なしは過去扱い */
export const liveEnded = (l: Live, now = new Date()) => !l.endsAt || now.getTime() >= new Date(l.endsAt).getTime();

const allLives = sheetLives.map(toLive);
const buildTime = new Date();

/** 次のライブ: まだ終わっていない（公演日の翌日 0 時より前）うち一番近いもの。なければ null（「次のライブは近日発表」） */
export const nextLive: Live | null =
  allLives.filter((l) => !liveEnded(l, buildTime)).sort((a, b) => a.date!.localeCompare(b.date!))[0] ?? null;

/**
 * 過去のライブ（/past-live/）。新しい順: 年が分かるものを日付の新しい順、その後に年なし（月日の新しい順）。
 * 次のライブは日付が過ぎると、表示時にこのページの先頭にも出る（PastLive.astro）
 */
export const pastLives: Live[] = allLives
  .filter((l) => liveEnded(l, buildTime))
  .sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date || b.date) return a.date ? -1 : 1;
    return b.month - a.month || b.day - a.day;
  });

export type Service = { name: string; href: string };
export type Ep = {
  title: string;
  cover: Img;
  /** 作品の種類（EP など。シートの値） */
  kind?: string;
  /** 発売日 YYYY-MM-DD（シートの値。空なら省略） */
  release?: string;
  /** ジャケットがシートにあるか（なければ cover はロゴの代わり） */
  hasCover?: boolean;
  /** linkco.re（全配信サービスの一覧） */
  href?: string;
  /** Spotify のアルバムID（埋め込みプレーヤー用） */
  spotify?: string;
  services?: Service[];
};

// ジャケットが空のときはロゴで代わりにする（ヒーローの「聴く」がジャケットを必ず使うため）
const noCover = (title: string): Img => ({ src: '/logo/logo-full', w: 1200, h: 1166, small: false, alt: `「${title}」（ジャケットなし）` });

/**
 * 曲。先頭が最新作（LATEST、大きく出す）。
 * 発売日の新しい順。発売日が空のものは行の上ほど新しい扱いで、発売日のあるものの後ろに置く
 */
export const eps: Ep[] = sheetSongs
  .map((s, row) => ({ s, row }))
  .sort((a, b) => {
    if (a.s.release && b.s.release) return b.s.release.localeCompare(a.s.release) || a.row - b.row;
    if (a.s.release || b.s.release) return a.s.release ? -1 : 1;
    return a.row - b.row;
  })
  .map(({ s }) => {
    const cover = toImg(s.cover, `${s.kind ? `${s.kind}` : ''}「${s.title}」のジャケット`) ?? noCover(s.title);
    return {
      title: s.title,
      cover,
      kind: s.kind || undefined,
      release: s.release || undefined,
      hasCover: !!s.cover,
      href: s.href || undefined,
      spotify: s.spotify || undefined,
      services: s.services.length ? s.services : undefined,
    };
  });

export type GoodsItem = {
  name: string;
  price: string;
  variants: string;
  href: string;
  soldOut: boolean;
  photo?: Img;
};

/** グッズの商品（/goods/）。値段もリンクもない商品は名前だけ出す */
export const goodsItems: GoodsItem[] = sheetGoods.map((g) => ({ ...g, photo: toImg(g.photo, `${g.name}の写真`) }));

export type Video = { src: string; poster: string; w: number; h: number; label: string };

export const videos: Video[] = [
  { src: '/video/reel-DaWx4pxxqvu.mp4', poster: '/video/reel-DaWx4pxxqvu.webp', w: 720, h: 1280, label: 'スタジオで演奏するメンバーの縦動画' },
  { src: '/video/reel-DXrVEDGEdfb.mp4', poster: '/video/reel-DXrVEDGEdfb.webp', w: 720, h: 1280, label: 'カメラをのぞき込むメンバーとスタジオの様子の縦動画' },
  { src: '/video/reel-DX6GmLdRm4f.mp4', poster: '/video/reel-DX6GmLdRm4f.webp', w: 716, h: 1274, label: '夜の屋外と車内で撮られた縦動画' },
];

export const hero = {
  video: '/video/hero.mp4',
  poster: '/video/reel-DaWx4pxxqvu.webp',
};

const muse = 'KYOTO MUSE でのライブ。';
export const photos: Img[] = [
  img('/img/photo/DcHOFc4E20Q-s6', 1600, 1066, `${muse}緑の照明に浮かぶ「KYOTO MUSE 1990 - 2026」の看板の前でドラムを叩くメンバー`),
  img('/img/photo/DcHOFc4E20Q-s7', 1200, 1600, `${muse}紫の照明の中、マイクに向かいながらギターを弾くメンバー`),
  img('/img/photo/DcHOFc4E20Q-s9', 1600, 1066, `${muse}緑に光る看板を背に歌うボーカル`),
  img('/img/photo/DcHOFc4E20Q-s11', 1200, 1600, `${muse}ベースを弾く手元のアップ`),
  img('/img/photo/DcHOFc4E20Q-s17', 1600, 1118, `${muse}紫の照明に照らされたステージ全体`),
  img('/img/photo/DcHOFc4E20Q-s12', 1200, 1600, `${muse}緑の照明の中でギターを弾くメンバー`),
  img('/img/photo/Dc3l2V7MfRr', 1600, 1078, 'モノクロのライブ写真。スポットライトの下でドラムを叩くメンバー'),
  img('/img/photo/DcHOFc4E20Q-s2', 1200, 1600, '赤い照明の中、マイクに向かってギターを弾くメンバー'),
  img('/img/photo/DcHOFc4E20Q-s15', 1600, 1600, `${muse}紫の照明の中でギターを弾くメンバー`),
  img('/img/photo/Dc3gl8ksScU', 1200, 1600, 'セピア色のライブ写真。逆光のステージでギターを弾くメンバー'),
  img('/img/photo/DcHOFc4E20Q-s10', 1600, 1066, `${muse}斜めに写る看板とシンバル、紫の照明`),
  img('/img/photo/DcHOFc4E20Q-s16', 1200, 1600, `${muse}緑の看板の光に照らされて歌うボーカル`),
  img('/img/photo/Dc3gSJhsLx-', 1200, 1600, '青い照明の中でベースを弾くメンバー'),
  img('/img/photo/DcHOFc4E20Q', 1600, 1066, `${muse}緑の照明が差し込むステージで赤いギターを弾くメンバー`),
  img('/img/photo/DcHOFc4E20Q-s13', 1600, 1066, `${muse}緑の照明に包まれたドラムセットと看板`),
  img('/img/photo/DcHOFc4E20Q-s18', 1200, 1600, 'ライトが並ぶステージで、ギターを置いて客席に背を向けて立つメンバー'),
];

/** 一覧用の小さい画像（`-s.webp` がなければ元の大きさ） */
export const thumb = (i: Img) => `${i.src}${i.small === false ? '' : '-s'}.webp`;

// 物販の写真（/goods/ の演出用）。商品名・値段・買うリンクはスプレッドシート（goodsItems）
export const goods: Img[] = [
  img('/img/goods/Db_ZAHkk-q8', 1600, 1600, '地面に置かれた黒いTシャツ。胸に白いグラフィック'),
  img('/img/goods/Db_ZAHkk-q8-s2', 1114, 1114, '黒いTシャツを着て中指を立てるメンバー'),
  img('/img/goods/Db_ZAHkk-q8-s8', 1179, 1178, 'モノクロ写真。Tシャツを着てしゃがむメンバー'),
  img('/img/goods/Db_ZAHkk-q8-s7', 1600, 1600, '青みがかった光の中のTシャツのグラフィック'),
  img('/img/goods/Db_ZAHkk-q8-s9', 1180, 1179, '夜の緑の光の中、Tシャツを着て立つメンバー'),
  img('/img/goods/Db_ZAHkk-q8-s6', 908, 907, '暗がりでTシャツを着て立つメンバー'),
];

// プロフィール。メンバー名・パート・紹介文は未確認なので空
export const profile = {
  main: img('/img/profile/artist', 500, 500, 'BLACK RAM のアーティスト写真。夜、車のフロントガラス越しにこちらを見るメンバー3人'),
  sub: [
    img('/img/profile/DXPX72-kd3w-s1', 1200, 1600, '夜の屋外で並んで立つ、革ジャンを着たメンバー3人'),
    img('/img/profile/DXR9TnlExqb-s1', 1440, 1080, '車の後部座席に乗り込んだメンバー3人'),
    img('/img/profile/DXqDKvfkczL-s1', 1440, 1080, '金網越しにこちらへ手を伸ばすメンバー3人'),
  ],
  members: [] as { name: string; part: string }[],
  text: '',
};

/**
 * 案C「暗転と照明」: 各セクションの地に敷く写真。
 * dark = scripts/make-stage.py で作った暗い白黒（網点・粒子）、lit = 照明が当たった部分に出す元のカラー写真
 */
export type Stage = { dark: string; lit: Img };
const pick = (list: Img[], src: string): Img => {
  const found = list.find((i) => i.src === src);
  if (!found) throw new Error(`写真が見つからない: ${src}`);
  return found;
};
export const stages = {
  // ファーストビュー（PC）の地: KYOTO MUSE の緑の照明
  hero: { dark: '/img/stage/live-s9', lit: pick(photos, '/img/photo/DcHOFc4E20Q-s9') },
  // ヒーローより下: スクロールに合わせて照明が流れ、当たった所だけ色が出る（main.ts「照明」）
  music: { dark: '/img/stage/live-s7', lit: pick(photos, '/img/photo/DcHOFc4E20Q-s7') },
  sns: { dark: '/img/stage/live-s13', lit: pick(photos, '/img/photo/DcHOFc4E20Q-s13') },
  video: { dark: '/img/stage/live-s17', lit: pick(photos, '/img/photo/DcHOFc4E20Q-s17') },
  goods: { dark: '/img/stage/goods', lit: pick(goods, '/img/goods/Db_ZAHkk-q8') },
  profile: { dark: '/img/stage/profile', lit: pick(profile.sub, '/img/profile/DXPX72-kd3w-s1') },
} satisfies Record<string, Stage>;

/** NEXT LIVE の反転面（Bone）に刷り込む、紙に刷ったコピーの写真（make-stage.py の PRINTS） */
export const print = { ...pick(photos, '/img/photo/Dc3l2V7MfRr'), src: '/img/stage/print-drum', alt: '' };

/** 文字の窓（巨大な文字・ロゴの形で切り抜く）に入れるカラー写真 */
export const windows = {
  live: pick(photos, '/img/photo/DcHOFc4E20Q-s6'),
  footer: pick(photos, '/img/photo/DcHOFc4E20Q-s9'),
};

export const meta = {
  title: 'BLACK RAM（京都のバンド）公式サイト',
  /** og:site_name・JSON-LD の name */
  name: 'BLACK RAM',
  description: 'BLACK RAM（京都のバンド）の公式サイト。EPをその場で聴ける。次のライブ、SNS。',
  ogImage: '/og.jpg',
  ogImageAlt: 'BLACK RAM のロゴ',
};
