// 最小限の動き: メニュー開閉 / ヘッダー背景 / 現在地 / 動画再生 / 写真の拡大 / 入ってくる動き
// （フライヤーの開閉は <details> なので JS 不要）

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- ヘッダー ---------- */
const header = document.querySelector<HTMLElement>('[data-header]');
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- メニュー（スマホ） ---------- */
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
window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => e.matches && setMenu(false));

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

/* ---------- 照明（案C「暗転と照明」）----------
   [data-light-room] の中の [data-stage] に、1つの照明を当てる。
   PC（カーソルあり）: カーソルの位置。スマホ: スクロール位置で照明が動く。
   部屋が画面の上へ抜けるほど照明が絞られ、地も暗くなる（暗転）。
   動きを減らす設定では何もしない（CSS の決まった位置に止まった照明のまま） */
const room = document.querySelector<HTMLElement>('[data-light-room]');
if (room && !reduce.matches) {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const lights = Array.from(room.querySelectorAll<HTMLElement>('[data-stage]')).map((el) => {
    const [rx, ry] = (el.dataset.rest ?? '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
    return { el, rx, ry, x: NaN, y: NaN, r: 0, lv: 0 };
  });
  let pointer: { x: number; y: number } | null = null;
  let running = false;
  let visible = true;
  const start = performance.now();
  const smooth = (a: number, b: number, t: number) => {
    const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };

  room.addEventListener('pointermove', (e) => {
    if (finePointer.matches) pointer = { x: e.clientX, y: e.clientY };
  });
  room.addEventListener('pointerleave', () => (pointer = null));

  const frame = (now: number) => {
    const roomRect = room.getBoundingClientRect();
    // 0: 部屋が画面の一番上 → 1: 部屋が画面の上へ抜けきった
    const p = Math.min(1, Math.max(0, -roomRect.top / Math.max(1, roomRect.height)));
    const env = 1 - smooth(0.1, 0.8, p);
    const t = (now - start) / 1000;
    const vmin = Math.min(window.innerWidth, window.innerHeight);

    lights.forEach((l) => {
      const rect = l.el.getBoundingClientRect();
      if (!rect.width) return;
      let tx: number;
      let ty: number;
      if (pointer) {
        tx = pointer.x - rect.left;
        ty = pointer.y - rect.top;
      } else {
        // 休んでいる位置のまわりをゆっくり漂い、スクロールに合わせて下手（しもて）へ流れる
        tx = rect.width * (l.rx + 0.18 * Math.sin(p * Math.PI * 1.6) + 0.04 * Math.sin(t * 0.7));
        ty = rect.height * (l.ry + 0.35 * p + 0.03 * Math.cos(t * 0.9));
      }
      const tr = Math.min(520, Math.max(170, vmin * 0.55)) * env;
      if (Number.isNaN(l.x)) {
        l.x = tx;
        l.y = ty;
      }
      // 少し遅れて追いかける（照明さんの手の動き）
      l.x += (tx - l.x) * 0.1;
      l.y += (ty - l.y) * 0.1;
      l.r += (tr - l.r) * 0.06;
      l.lv += (env - l.lv) * 0.06;
      const st = l.el.style;
      st.setProperty('--lx', `${l.x.toFixed(1)}px`);
      st.setProperty('--ly', `${l.y.toFixed(1)}px`);
      st.setProperty('--r', `${l.r.toFixed(1)}px`);
      st.setProperty('--lv', l.lv.toFixed(3));
    });
    if (visible && !reduce.matches) requestAnimationFrame(frame);
    else running = false;
  };

  const run = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !reduce.matches) run();
  }).observe(room);
  run();

  reduce.addEventListener('change', () => {
    if (!reduce.matches) return;
    visible = false;
    lights.forEach((l) => ['--lx', '--ly', '--r', '--lv'].forEach((k) => l.el.style.removeProperty(k)));
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
