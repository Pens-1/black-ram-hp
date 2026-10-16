// 最小限の動き: ロゴアニメーション / メニュー開閉 / ヘッダー背景 / 現在地 / 次のライブの切り替え / 埋め込みプレーヤー / 動画再生 / ストロボ / 写真の拡大 / 入ってくる動き
// （フライヤーの開閉は <details> なので JS 不要）
import { introDone, introRunning } from './intro';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- ヘッダー ---------- */
const header = document.querySelector<HTMLElement>('[data-header]');
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- 全画面メニュー（スマホ・PC 共通） ---------- */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
const menuLabel = document.querySelector<HTMLElement>('[data-menu-label]');

function setMenu(open: boolean) {
  if (!menuBtn || !menu || !header) return;
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  if (menuLabel) menuLabel.textContent = open ? 'メニューを閉じる' : 'メニューを開く';
  header.classList.toggle('is-open', open);
  document.body.classList.toggle('is-locked', open);
}

menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
menu?.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuBtn?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuBtn.focus();
  }
});

/* ---------- 今いるセクションに下線 ---------- */
const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'));
const sections = Array.from(new Set(navLinks.map((a) => a.dataset.nav)))
  .map((id) => (id ? document.getElementById(id) : null))
  .filter((s): s is HTMLElement => !!s);

if (sections.length) {
  const current = new Map<string, boolean>();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => current.set(e.target.id, e.isIntersecting));
      const active = sections.find((s) => current.get(s.id));
      navLinks.forEach((a) => {
        if (active && a.dataset.nav === active.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => io.observe(s));
}

/* ---------- 次のライブ: 日付が過ぎたら「次のライブは近日発表」に切り替える ----------
   ビルド時にも判定しているが、ビルドし直さなくても表示時の日付で切り替わるようにする */
const now = Date.now();
const passed = (iso?: string) => !!iso && now >= new Date(iso).getTime();
const nextLive = document.querySelector<HTMLElement>('[data-next-live]');
if (nextLive && passed(nextLive.dataset.ends)) {
  nextLive.hidden = true;
  const empty = document.querySelector<HTMLElement>('[data-next-empty]');
  if (empty) empty.hidden = false;
}
// 過去のライブのページ: 終わった次のライブを先頭に出す
document.querySelectorAll<HTMLElement>('[data-past-from]').forEach((el) => {
  if (passed(el.dataset.pastFrom)) el.hidden = false;
});

/* ---------- 埋め込みプレーヤー（Spotify）: 押すまで読み込まない ----------
   「聴く」は Spotify へのリンク。JS があれば、その場で埋め込みを読み込んで開く */
function openEmbed(btn: HTMLAnchorElement) {
  const ep = btn.closest<HTMLElement>('[data-ep]');
  const slot = ep?.querySelector<HTMLElement>('[data-player]');
  const id = btn.dataset.embed;
  if (!ep || !slot || !id) return false;
  if (!ep.classList.contains('is-embedded')) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://open.spotify.com/embed/album/${encodeURIComponent(id)}?utm_source=generator&theme=0`;
    iframe.title = `${btn.dataset.embedTitle ?? ''}（Spotify プレーヤー）`;
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    if (btn.hasAttribute('data-embed-compact')) iframe.height = '152';
    slot.append(iframe);
    ep.classList.add('is-embedded');
  }
  return true;
}
document.querySelectorAll<HTMLAnchorElement>('[data-embed]').forEach((btn) =>
  btn.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // 新しいタブで開きたいときはそのまま
    if (openEmbed(btn)) {
      e.preventDefault();
      btn.closest('[data-ep]')?.querySelector('iframe')?.focus();
    }
  }),
);
// ヒーローの「聴く」: MUSIC の最新作へ移り、プレーヤーを読み込む（移動はリンクの既定の動き）
document.querySelector('[data-listen]')?.addEventListener('click', () => {
  const first = document.querySelector<HTMLAnchorElement>('#ep-latest [data-embed]');
  if (first) openEmbed(first);
});

/* ---------- ヒーロー動画（動きを減らす設定ではポスターのまま） ---------- */
const heroVideo = document.querySelector<HTMLVideoElement>('[data-hero-video]');
function syncHero(initial = false) {
  if (!heroVideo) return;
  if (reduce.matches) {
    if (initial) return;
    heroVideo.pause();
    heroVideo.load(); // ポスター表示に戻す
  } else {
    heroVideo.play().catch(() => {
      /* 自動再生できない環境ではポスターのまま */
    });
  }
}
syncHero(true);
reduce.addEventListener('change', () => syncHero());

/* ---------- ストロボ（案D2「ストロボとグリッチ」: ほぼ白黒）----------
   ファーストビュー [data-strobe] は白黒のまま。ロックのテンポ（BPM 150〜180、拍ごとに揺らぎ）で
   RGB ずれ・コマ飛びのグリッチを刻み、ときどき閃光を入れる。休み・食い気味の裏拍・連打を混ぜて規則的にしない。
   色（緑・紫・青）は閃光の一瞬だけ、光の当たった部分に薄く差す。
   光過敏への配慮: 閃光はどの1秒間にも2回まで（1秒に3回以上は出さない）。
   動きを減らす設定・画面外・タブが裏のときは止める */
const strobe = document.querySelector<HTMLElement>('[data-strobe]');
const flash = strobe?.querySelector<HTMLElement>('[data-strobe-flash]');
const tint = strobe?.querySelector<HTMLElement>('[data-strobe-tint]');
const splitR = strobe?.querySelector('[data-split-r]');
const splitB = strobe?.querySelector('[data-split-b]');
if (strobe && flash && tint) {
  const colors = ['rgb(40 230 110)', 'rgb(176 64 255)', 'rgb(40 110 255)'];
  const MAX_FLASH_PER_SEC = 2;
  const flashes: number[] = [];
  let color = -1;
  let timer = 0;
  let glitchTimer = 0;
  let active = false;
  let inView = true;
  // ロゴアニメーション中は止めておく（閃光が重ならないように、終わってから刻み始める）
  let held = introRunning;
  let beat = 400; // 1拍の長さ（ms）。小節ごとに BPM を揺らす
  let count = 0; // 小節内の拍（0〜3）
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const chance = (p: number) => Math.random() < p;

  // グリッチ: ずれ幅・型・長さを毎回変える
  const glitch = (strong = false) => {
    const dx = Math.round(strong ? rand(26, 40) : rand(12, 28));
    splitR?.setAttribute('dx', String(-dx));
    splitB?.setAttribute('dx', String(dx));
    const ms = Math.round(strong ? rand(180, 240) : rand(90, 170));
    strobe.style.setProperty('--gd', `${ms}ms`);
    strobe.classList.remove('is-glitch', 'is-glitch-b');
    void strobe.offsetWidth; // アニメーションを頭から
    strobe.classList.add(chance(0.5) ? 'is-glitch' : 'is-glitch-b');
    clearTimeout(glitchTimer);
    glitchTimer = window.setTimeout(() => strobe.classList.remove('is-glitch', 'is-glitch-b'), ms);
  };

  // 直近1秒の閃光が上限に達していないか
  const canFlash = (now: number) => {
    while (flashes.length && now - flashes[0] >= 1000) flashes.shift();
    return flashes.length < MAX_FLASH_PER_SEC;
  };

  // 閃光＋差し色（一瞬・薄く。同じ色は続けない）。上限なら false
  const flashHit = () => {
    const now = performance.now();
    if (!canFlash(now)) return false;
    flashes.push(now);
    color = (color + 1 + Math.floor(Math.random() * (colors.length - 1))) % colors.length;
    strobe.style.setProperty('--tint', colors[color]);
    strobe.style.setProperty('--bx', `${Math.round(rand(15, 85))}%`);
    flash.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.15 }, { opacity: 0 }], {
      duration: 200,
      easing: 'ease-out',
    });
    tint.animate([{ opacity: 0 }, { opacity: 0.4, offset: 0.2 }, { opacity: 0 }], {
      duration: 360,
      easing: 'ease-out',
    });
    return true;
  };

  // 1拍ごとに「休み / グリッチ / 閃光＋強いグリッチ」を決める。頭拍は強め、たまに裏拍の追い打ち
  const tick = () => {
    if (!active) return;
    if (count === 0) beat = 60000 / rand(150, 180);
    const down = count === 0 || count === 2;
    const r = Math.random();
    if (r < (down ? 0.22 : 0.12) && flashHit()) glitch(true);
    else if (r < (down ? 0.75 : 0.5)) glitch(chance(0.3));
    // 裏拍に食い込む追い打ち（グリッチだけ）
    if (chance(0.2)) window.setTimeout(() => active && glitch(), beat * rand(0.45, 0.6));
    count = (count + 1) % 4;
    // 小節の終わりで、たまに1小節ほど休む（息継ぎ）
    const rest = count === 0 && chance(0.25) ? beat * rand(2, 4) : 0;
    clearTimeout(timer);
    timer = window.setTimeout(tick, beat * rand(0.9, 1.1) + rest);
  };

  const reset = () => {
    clearTimeout(timer);
    clearTimeout(glitchTimer);
    strobe.classList.remove('is-glitch', 'is-glitch-b');
    count = 0;
  };

  const start = (ms: number) => {
    clearTimeout(timer);
    timer = window.setTimeout(tick, ms);
  };

  const sync = () => {
    const should = !reduce.matches && inView && !document.hidden && !held;
    if (should === active) return;
    active = should;
    if (active) start(rand(300, 700));
    else reset();
  };

  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    sync();
  }).observe(strobe);
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
  // 最初の一撃はロゴが書き終わるころ（ロゴアニメーションを出したときは、それが終わってから）
  if (!reduce.matches && !held) {
    active = true;
    start(1500);
  }
  introDone.then(() => {
    held = false;
    sync();
  });
}

/* ---------- 動画カード: 押すとその場で音ありで再生 ---------- */
const reels = Array.from(document.querySelectorAll<HTMLElement>('[data-reel]'));
reels.forEach((frame) => {
  const video = frame.querySelector('video');
  const btn = frame.querySelector<HTMLButtonElement>('[data-reel-play]');
  if (!video || !btn) return;
  btn.addEventListener('click', () => {
    reels.forEach((other) => {
      if (other !== frame) other.querySelector('video')?.pause();
    });
    video.muted = false;
    video.controls = true;
    frame.classList.add('is-playing');
    video.play().catch(() => {
      frame.classList.remove('is-playing');
    });
    video.focus();
  });
  video.addEventListener('pause', () => {
    if (video.ended) {
      video.controls = false;
      frame.classList.remove('is-playing');
      btn.focus();
    }
  });
});

/* ---------- 写真の拡大（Esc・スワイプで閉じる、左右で前後） ---------- */
const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
const thumbs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-photo]'));
if (dialog && thumbs.length) {
  const lbImg = dialog.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const lbAlt = dialog.querySelector<HTMLElement>('[data-lb-alt]')!;
  const lbCount = dialog.querySelector<HTMLElement>('[data-lb-count]')!;
  let index = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number) => {
    index = (i + thumbs.length) % thumbs.length;
    const t = thumbs[index];
    const alt = t.querySelector('img')?.alt ?? '';
    lbImg.src = t.dataset.full ?? '';
    lbImg.alt = alt;
    lbAlt.textContent = alt;
    lbCount.textContent = `${index + 1} / ${thumbs.length}`;
  };

  const close = () => {
    dialog.close();
  };

  thumbs.forEach((t, i) =>
    t.addEventListener('click', () => {
      opener = t;
      show(i);
      dialog.showModal();
      document.body.classList.add('is-locked');
    }),
  );
  dialog.addEventListener('close', () => {
    document.body.classList.remove('is-locked');
    lbImg.removeAttribute('src');
    opener?.focus();
  });
  dialog.querySelector('[data-lb-close]')?.addEventListener('click', close);
  dialog.querySelector('[data-lb-prev]')?.addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-lb-next]')?.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
  // 写真の外側（余白）を押したら閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || (e.target as HTMLElement).classList.contains('lb-figure')) close();
  });

  // スワイプ: 縦に大きく動かしたら閉じる、横なら前後
  let sx = 0;
  let sy = 0;
  dialog.addEventListener(
    'touchstart',
    (e) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    },
    { passive: true },
  );
  dialog.addEventListener(
    'touchend',
    (e) => {
      if (e.touches.length > 0) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) close();
      else if (Math.abs(dx) > 60) show(dx < 0 ? index + 1 : index - 1);
    },
    { passive: true },
  );
}

/* ---------- 入ってくる動き ---------- */
const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal]');
if (reduce.matches || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('is-in'));
} else {
  const ro = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          ro.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  revealEls.forEach((el) => ro.observe(el));
}
