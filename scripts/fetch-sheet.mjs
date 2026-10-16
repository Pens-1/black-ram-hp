// ビルド前（npm run build の prebuild）に Google スプレッドシートを読み、src/data/sheet/*.json に書き出す。
// - シート ID は環境変数 SHEET_ID（手元は .env に書く。公開リポジトリには載せない）。シートは「リンクを知っている全員が閲覧可」にしておく
// - 取得・読み取りに失敗したシートは JSON を書き換えない（コミット済みの前回分でビルドを続ける）
// - 不正な行は飛ばし、何行目をなぜ飛ばしたかをログに出す。「メモ」列は読まない（サイトに出さない）
// - 画像列: /img/... はそのまま。Google ドライブの共有リンクはダウンロードして public/img/sheet/<ファイルID>.webp に変換
// テスト・手元確認用: SHEET_CSV_DIR=<dir> で <dir>/<シート名>.csv を読む。SHEET_OUT_DIR で書き出し先を変える
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));
const PUBLIC = join(ROOT, 'public');
const SHEET_IMG = '/img/sheet';

/* ---------- CSV ---------- */

/** RFC 4180 の CSV を2次元配列にする（"" のエスケープ、セル内改行、CRLF に対応） */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/* ---------- 見出し ---------- */

// 見出しは括弧書き（「（/区切り）」など）を除いて名前で引く。列の並べ替え・括弧の書き換えに強くする
const baseName = (h) => h.replace(/[（(].*$/, '').trim().toLowerCase();

const SHEETS = {
  ライブ: {
    file: 'lives.json',
    required: ['date', 'venue'],
    columns: {
      date: '日付',
      area: '地域',
      venue: '会場',
      title: 'イベント名',
      open: 'OPEN',
      start: 'START',
      price: '料金',
      acts: '出演',
      actTime: 'BLACK RAMの出演時間',
      ticket: 'チケット・予約のリンク',
      image: '画像',
    },
  },
  曲: {
    file: 'songs.json',
    required: ['title'],
    columns: {
      title: '作品名',
      kind: '種類',
      release: '発売日',
      image: 'ジャケット画像',
      linkcore: 'linkco.re',
      spotify: 'Spotify',
      apple: 'Apple Music',
      youtube: 'YouTube Music',
      line: 'LINE MUSIC',
      amazon: 'Amazon Music',
    },
  },
  グッズ: {
    file: 'goods.json',
    required: ['name'],
    columns: {
      name: '商品名',
      price: '値段',
      variants: 'サイズ・色',
      image: '写真',
      href: '買うリンク',
      soldOut: '売り切れ',
    },
  },
};

const SERVICES = [
  ['spotify', 'Spotify'],
  ['apple', 'Apple Music'],
  ['youtube', 'YouTube Music'],
  ['line', 'LINE MUSIC'],
  ['amazon', 'Amazon Music'],
];

/** 見出し行から { キー: 列番号 } を作る。必須列がなければ例外（シートの取り違えもここで気づく） */
function indexColumns(sheetName, header) {
  const spec = SHEETS[sheetName];
  const names = header.map(baseName);
  const index = {};
  for (const [key, label] of Object.entries(spec.columns)) {
    const i = names.indexOf(baseName(label));
    if (i >= 0) index[key] = i;
  }
  const missing = spec.required.filter((k) => index[k] === undefined).map((k) => spec.columns[k]);
  if (missing.length) throw new Error(`見出し「${missing.join('」「')}」がない（見出しの行: ${header.join(' | ')}）`);
  return index;
}

/* ---------- 値の検証 ---------- */

/** 'YYYY-MM-DD' → {year, month, day}、'M/D' → {year: null, month, day}。それ以外・ありえない日付は null */
export function parseDate(s) {
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  let year = null;
  let month;
  let day;
  if (m) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = /^(\d{1,2})\/(\d{1,2})$/.exec(s))) [month, day] = [Number(m[1]), Number(m[2])];
  else return null;
  const d = new Date(Date.UTC(year ?? 2024, month - 1, day)); // 年なしはうるう年で 2/29 を許す
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return { year, month, day };
}

const isUrl = (s) => /^https?:\/\/[^\s]+$/i.test(s);

/** Spotify のアルバム URL から埋め込み用の ID を取り出す（open.spotify.com/intl-ja/album/<id> も可） */
export function spotifyAlbumId(url) {
  return /open\.spotify\.com\/(?:intl-[a-z-]+\/)?album\/([A-Za-z0-9]{22})/.exec(url)?.[1] ?? null;
}

/** 売り切れ列: 空、または「×」「なし」などの否定以外が入っていれば売り切れ */
const soldOut = (s) => s !== '' && !/^(×|x|ｘ|-|－|なし|no|false|0)$/i.test(s);

/* ---------- 画像 ---------- */

/** WebP のヘッダから幅・高さを読む（VP8 / VP8L / VP8X） */
export function webpSize(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/** public/<src>.webp の情報。small は一覧用の <src>-s.webp があるか */
function localImage(src) {
  const file = join(PUBLIC, `${src}.webp`);
  if (!existsSync(file)) return null;
  const size = webpSize(readFileSync(file));
  if (!size) return null;
  return { src, ...size, small: existsSync(join(PUBLIC, `${src}-s.webp`)) };
}

/** Google ドライブの共有リンクからファイル ID を取り出す */
export function driveId(url) {
  if (!/^https:\/\/(drive|docs)\.google\.com\//.test(url)) return null;
  return /\/d\/([\w-]{20,})/.exec(url)?.[1] ?? /[?&]id=([\w-]{20,})/.exec(url)?.[1] ?? null;
}

/** 長辺 1600 の <dest>.webp と長辺 800 の <dest>-s.webp を作る（ffmpeg → だめなら Pillow） */
export function toWebp(input, dest) {
  const sizes = [
    [1600, 80, `${dest}.webp`],
    [800, 76, `${dest}-s.webp`],
  ];
  try {
    for (const [max, q, out] of sizes) {
      const vf = `scale='if(gt(iw,ih),min(${max},iw),-2)':'if(gt(iw,ih),-2,min(${max},ih))'`;
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', vf, '-frames:v', '1', '-c:v', 'libwebp', '-quality', String(q), out], { stdio: 'pipe' });
    }
    return;
  } catch {
    // ffmpeg がない・読めない → Pillow で試す
  }
  const py = [
    'import sys',
    'from PIL import Image, ImageOps',
    'im = ImageOps.exif_transpose(Image.open(sys.argv[1])).convert("RGB")',
    'for m, q, out in ((1600, 80, sys.argv[2]), (800, 76, sys.argv[3])):',
    '    c = im.copy(); c.thumbnail((m, m)); c.save(out, "WEBP", quality=q)',
  ].join('\n');
  execFileSync('python3', ['-I', '-c', py, input, sizes[0][2], sizes[1][2]], { stdio: 'pipe' });
}

async function driveImage(id, where, log) {
  const src = `${SHEET_IMG}/${id}`;
  const cached = localImage(src);
  if (cached) return cached; // ファイル ID でキャッシュ。あれば再変換しない
  const tmp = mkdtempSync(join(tmpdir(), 'sheet-img-'));
  try {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, { signal: AbortSignal.timeout(30_000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) throw new Error(`ダウンロードできない（HTTP ${res.status} ${type}）。共有が「リンクを知っている全員」か確認`);
    const input = join(tmp, 'in');
    writeFileSync(input, Buffer.from(await res.arrayBuffer()));
    mkdirSync(join(PUBLIC, SHEET_IMG), { recursive: true });
    const dest = join(PUBLIC, src);
    try {
      toWebp(input, dest);
    } catch (e) {
      rmSync(`${dest}.webp`, { force: true });
      rmSync(`${dest}-s.webp`, { force: true });
      throw new Error(`WebP に変換できない（ffmpeg か python3 + Pillow が必要）: ${String(e.message).split('\n')[0]}`);
    }
    const img = localImage(src);
    if (!img) throw new Error('変換後の WebP が読めない');
    log(`  ${where}: 画像を保存 ${src}.webp（${img.w}×${img.h}）`);
    return img;
  } catch (e) {
    log(`  ${where}: 画像なしで続行（ドライブのファイル ${id}: ${e.message}）`);
    return null;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** 画像列の値 → { src, w, h, small } | null（失敗しても止めない） */
async function resolveImage(value, where, log) {
  if (!value) return null;
  if (value.startsWith('/img/')) {
    const src = value.replace(/\.webp$/i, '');
    if (!/^\/img\/[\w\-./]+$/.test(src) || src.includes('..')) {
      log(`  ${where}: 画像のパス「${value}」が使えないので画像なしで続行`);
      return null;
    }
    const img = localImage(src);
    if (!img) log(`  ${where}: public${src}.webp がないので画像なしで続行`);
    return img;
  }
  const id = driveId(value);
  if (id) return driveImage(id, where, log);
  log(`  ${where}: 画像「${value}」は /img/... でも Google ドライブのリンクでもないので画像なしで続行`);
  return null;
}

/* ---------- シートごとの行の読み取り ---------- */

/**
 * CSV の中身を検証して、サイト用のデータに直す。
 * @returns {Promise<{ items: object[], skipped: string[] }>} skipped は「N行目: 理由」
 * 見出しが合わないときは例外（呼び出し側で前回の JSON を使う）
 */
export async function readSheet(sheetName, csv, log = console.log) {
  const rows = parseCsv(csv.replace(/^﻿/, ''));
  if (!rows.length) throw new Error('空のシート');
  const col = indexColumns(sheetName, rows[0]);
  const items = [];
  const skipped = [];
  for (let r = 1; r < rows.length; r++) {
    const line = r + 1; // スプレッドシートの行番号（1行目が見出し）
    const get = (key) => (col[key] === undefined ? '' : (rows[r][col[key]] ?? '').trim());
    if (rows[r].every((c) => c.trim() === '')) continue; // 空行
    const skip = (why) => skipped.push(`${line}行目: ${why}`);
    const where = `${sheetName} ${line}行目`;

    if (sheetName === 'ライブ') {
      const dateText = get('date');
      const venue = get('venue');
      if (!dateText) { skip('日付が空'); continue; }
      if (!venue) { skip('会場が空'); continue; }
      const date = parseDate(dateText);
      if (!date) { skip(`日付「${dateText}」が 2026-10-20 か 6/22 の形ではない`); continue; }
      const ticket = get('ticket');
      if (ticket && !isUrl(ticket)) log(`  ${where}: チケットのリンク「${ticket}」が URL ではないので出さない`);
      items.push({
        ...date,
        area: get('area'),
        venue,
        title: get('title'),
        open: get('open'),
        start: get('start'),
        price: get('price'),
        acts: get('acts').split(/[/／]/).map((a) => a.trim()).filter(Boolean),
        actTime: get('actTime'),
        ticket: isUrl(ticket) ? ticket : '',
        flyer: await resolveImage(get('image'), where, log),
      });
    } else if (sheetName === '曲') {
      const title = get('title');
      if (!title) { skip('作品名が空'); continue; }
      const releaseText = get('release');
      const release = releaseText ? parseDate(releaseText) : null;
      if (releaseText && !release) { skip(`発売日「${releaseText}」が 2026-10-20 か 6/22 の形ではない`); continue; }
      const services = [];
      for (const [key, name] of SERVICES) {
        const href = get(key);
        if (!href) continue;
        if (isUrl(href)) services.push({ name, href });
        else log(`  ${where}: ${name} の「${href}」が URL ではないので出さない`);
      }
      const spotifyUrl = get('spotify');
      const spotify = spotifyUrl ? spotifyAlbumId(spotifyUrl) : null;
      if (spotifyUrl && !spotify) log(`  ${where}: Spotify のアルバム URL ではないのでプレーヤーは出さない（リンクだけ出す）`);
      const linkcore = get('linkcore');
      items.push({
        title,
        kind: get('kind'),
        release: release?.year ? `${release.year}-${String(release.month).padStart(2, '0')}-${String(release.day).padStart(2, '0')}` : '',
        href: isUrl(linkcore) ? linkcore : '',
        spotify: spotify ?? '',
        services,
        cover: await resolveImage(get('image'), where, log),
      });
    } else {
      const name = get('name');
      if (!name) { skip('商品名が空'); continue; }
      const href = get('href');
      if (href && !isUrl(href)) log(`  ${where}: 買うリンク「${href}」が URL ではないので出さない`);
      items.push({
        name,
        price: get('price'),
        variants: get('variants'),
        href: isUrl(href) ? href : '',
        soldOut: soldOut(get('soldOut')),
        photo: await resolveImage(get('image'), where, log),
      });
    }
  }
  return { items, skipped };
}

/* ---------- 取得と書き出し ---------- */

async function loadCsv(sheetName) {
  const dir = process.env.SHEET_CSV_DIR;
  if (dir) return readFileSync(join(resolve(dir), `${sheetName}.csv`), 'utf8');
  const id = process.env.SHEET_ID;
  if (!id) throw new Error('環境変数 SHEET_ID が未設定');
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!type.includes('csv')) throw new Error(`CSV ではない応答（${type}）。シートの共有設定を確認`);
  return res.text();
}

export async function main({ log = console.log } = {}) {
  const outDir = resolve(process.env.SHEET_OUT_DIR || join(ROOT, 'src/data/sheet'));
  mkdirSync(outDir, { recursive: true });
  log(`[sheet] ${process.env.SHEET_CSV_DIR ? `ローカルの CSV（${process.env.SHEET_CSV_DIR}）` : 'スプレッドシート'} を読む`);
  let failed = 0;
  for (const [sheetName, spec] of Object.entries(SHEETS)) {
    const out = join(outDir, spec.file);
    try {
      const { items, skipped } = await readSheet(sheetName, await loadCsv(sheetName), log);
      for (const s of skipped) log(`  ${sheetName} ${s} → 飛ばした`);
      writeFileSync(out, `${JSON.stringify(items, null, 2)}\n`);
      log(`[sheet] ${sheetName}: ${items.length}件${skipped.length ? `（${skipped.length}行飛ばした）` : ''} → ${spec.file}`);
    } catch (e) {
      failed++;
      const keep = existsSync(out) ? '前回の JSON をそのまま使う' : 'JSON がないので空で作る';
      if (!existsSync(out)) writeFileSync(out, '[]\n');
      log(`[sheet] ${sheetName}: 読めなかった（${e.message}）→ ${keep}`);
    }
  }
  return failed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 失敗してもビルドは止めない（前回の JSON で作る）
  await main().catch((e) => console.log(`[sheet] 想定外のエラー（${e.message}）→ 前回の JSON で続行`));
}
