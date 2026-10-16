// サイトの中身はすべてここに集める。
// 事実は PRODUCT.md / docs/site-design.md にあるものだけ。未確認の項目は空のまま（創作しない）。

export type Img = { src: string; w: number; h: number; alt: string };

/** public/ 以下の WebP。`<name>.webp`（長辺 ≤1600）と `<name>-s.webp`（長辺 ≤800）がある */
export const img = (path: string, w: number, h: number, alt: string): Img => ({ src: path, w, h, alt });

export function srcset(i: Img): string {
  const long = Math.max(i.w, i.h);
  if (long <= 800) return `${i.src}.webp ${i.w}w`;
  const sw = Math.round((i.w * 800) / long);
  return `${i.src}-s.webp ${sw}w, ${i.src}.webp ${i.w}w`;
}

export const links = {
  instagram: 'https://www.instagram.com/black_______ram/',
  x: 'https://x.com/blackram0418',
  tiktok: 'https://www.tiktok.com/@blackram__',
  tunecore: 'https://www.tunecore.co.jp/artists?id=1109406',
} as const;

export const social = [
  { name: 'Instagram', icon: 'instagram', href: links.instagram, handle: 'black_______ram' },
  { name: 'X', icon: 'x', href: links.x, handle: 'blackram0418' },
  { name: 'TikTok', icon: 'tiktok', href: links.tiktok, handle: '@blackram__' },
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

/** 次のライブ（PRODUCT.md「次のライブ」の確定情報だけ。チケット予約方法・出演順・フライヤーは未確認なので持たない） */
export const nextLive = {
  /** 公演日（日本時間） */
  date: '2026-10-20',
  /** この時刻を過ぎたら「次のライブは近日発表」に切り替える（日本時間の翌日 0 時） */
  endsAt: '2026-10-21T00:00:00+09:00',
  month: 10,
  day: 20,
  weekday: '火',
  area: '梅田',
  venue: 'ODYSSEY',
  title: 'VOLTAGE',
  open: '17:30',
  start: '18:00',
  price: 'ADV/DOOR ¥2,500（＋1D ¥700）',
  acts: ['BLACK RAM', "Neo'n'eat", 'bloom in zero', 'Skade', 'PANdeMIX'],
};

/** 次のライブが終わったか（ビルド時の判定。表示時は main.ts がもう一度判定する） */
export const nextLiveEnded = (now = new Date()) => now.getTime() >= new Date(nextLive.endsAt).getTime();

export type Live = {
  /** 月/日。年は未確認なので持たない */
  month: number;
  day: number;
  venue: string;
  title?: string;
  /** フライヤーに書かれている情報（フライヤー画像のテキスト代替も兼ねる） */
  details?: string[];
  flyer?: Img;
};

// 過去のライブ（/past-live/）。年が未確認なので月日だけ。古い順に並べ、ページでは新しい順に出す
// 次のライブ（nextLive）は日付が過ぎると、このページの先頭にも出る
export const lives: Live[] = [
  {
    month: 6,
    day: 22,
    venue: 'GATTACA',
    title: '天変地異',
    details: [
      'Festina Lente / hakumeii / 龍之介 (Slipout Blank) / BLACK RAM',
      'OPEN 18:30 / START 19:00',
      'ADV ¥2400 / DOOR ¥2900',
    ],
    flyer: img(
      '/img/live/0622-gattaca',
      1200,
      1600,
      '6月22日 LIVE HOUSE GATTACA「天変地異」のフライヤー。出演 Festina Lente、hakumeii、龍之介 (Slipout Blank)、BLACK RAM。OPEN 18:30 START 19:00、ADV ¥2400 DOOR ¥2900',
    ),
  },
  {
    month: 8,
    day: 14,
    venue: 'KYOTO MUSE',
    flyer: img(
      '/img/live/0814-kyoto-muse',
      1526,
      1600,
      '「8月14日 KYOTO MUSE」の告知画像。電車の扉に書かれた BLACK RAM の文字',
    ),
  },
];

export type Service = { name: string; href: string };
export type Ep = {
  title: string;
  cover: Img;
  /** linkco.re（全配信サービスの一覧） */
  href?: string;
  /** Spotify のアルバムID（埋め込みプレーヤー用） */
  spotify?: string;
  services?: Service[];
};

// 配信URLは linkco.re の各ページのストアリンク（tunecore.co.jp/to/<store>/<id>）をたどって確認したもの（PRODUCT.md）
const services = (id: number, spotify: string, apple: string, youtube: string): Service[] => [
  { name: 'Spotify', href: `https://open.spotify.com/album/${spotify}` },
  { name: 'Apple Music', href: apple },
  { name: 'YouTube Music', href: youtube },
  { name: 'LINE MUSIC', href: `https://www.tunecore.co.jp/to/line/${id}` },
  { name: 'Amazon Music', href: `https://www.tunecore.co.jp/to/amazon_music/${id}` },
];

// 先頭が最新作（大きく出す）。ASS HOLE の配信リンクと EP の順番は未確認
export const eps: Ep[] = [
  {
    title: "RAM'S BALL",
    cover: img('/img/music/rams-ball', 400, 400, "EP「RAM'S BALL」のジャケット。炎に包まれた手"),
    href: 'https://linkco.re/3CcSGHyp',
    spotify: '6mcCk4SAouwsYp4cj9z692',
    services: services(
      1726936,
      '6mcCk4SAouwsYp4cj9z692',
      'https://music.apple.com/jp/album/rams-ball-single/6809121654',
      'https://music.youtube.com/playlist?list=OLAK5uy_nzqhtBYsp06Ly0y6DgxTSTPmwADggNwM0',
    ),
  },
  {
    title: 'BABY TANK',
    cover: img('/img/music/baby-tank', 400, 400, 'EP「BABY TANK」のジャケット。白地に描かれた骨の手'),
    href: 'https://linkco.re/tM5cbf6t',
    spotify: '7cgggJee3zl2h7IODPjS9p',
    services: services(
      1807275,
      '7cgggJee3zl2h7IODPjS9p',
      'https://music.apple.com/jp/album/baby-tank-single/6776646587',
      'https://music.youtube.com/playlist?list=OLAK5uy_lPjwJIhKskSOvItgZ2u8nEhS-tL1s4UTE',
    ),
  },
  {
    title: 'ASS HOLE',
    cover: img('/img/music/ass-hole', 400, 400, 'EP「ASS HOLE」のジャケット。黒地に白い筆文字の BLACK RAM ロゴと羊の頭蓋骨'),
  },
];

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

// 物販。購入方法は未確認なので、写真だけ出す
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
  title: 'BLACK RAM',
  description: 'BLACK RAM 公式サイト。音源、次のライブ、SNS。',
  ogImage: '/og.jpg',
};
