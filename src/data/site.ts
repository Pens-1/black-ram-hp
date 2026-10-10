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

export const nav = [
  { id: 'live', label: 'LIVE' },
  { id: 'music', label: 'MUSIC' },
  { id: 'video', label: 'VIDEO' },
  { id: 'goods', label: 'GOODS' },
  { id: 'profile', label: 'PROFILE' },
  { id: 'contact', label: 'CONTACT' },
] as const;

/** 告知。内容が未確認なので空。0件ならセクションごと出さない */
export const news: { date: string; text: string; href?: string }[] = [];

export type Live = {
  /** 月/日。年は未確認なので持たない */
  month: number;
  day: number;
  venue: string;
  title?: string;
  /** フライヤーに書かれている情報（フライヤー画像のテキスト代替も兼ねる） */
  details?: string[];
  flyer?: Img;
  /** 今後の公演なら true、終わった公演なら false */
  upcoming: boolean;
};

// 年が未確認のため、終わったかどうかはデータで手動管理する。
// 設計書（docs/site-design.md）で「今後の予定」に挙がっている2件を upcoming にしている。
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
    upcoming: false,
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
    upcoming: false,
  },
];

export type Ep = { title: string; cover: Img; href?: string };

// 先頭が最新作（大きく出す）。ASS HOLE の配信リンクと EP の順番は未確認
export const eps: Ep[] = [
  {
    title: "RAM'S BALL",
    cover: img('/img/music/rams-ball', 400, 400, "EP「RAM'S BALL」のジャケット。炎に包まれた手"),
    href: 'https://linkco.re/3CcSGHyp',
  },
  {
    title: 'BABY TANK',
    cover: img('/img/music/baby-tank', 400, 400, 'EP「BABY TANK」のジャケット。白地に描かれた骨の手'),
    href: 'https://linkco.re/tM5cbf6t',
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
} satisfies Record<string, Stage>;

export const meta = {
  title: 'BLACK RAM',
  description: 'BLACK RAM 公式サイト。ライブ予定、音源、映像、写真、グッズ。',
  ogImage: '/og.jpg',
};
