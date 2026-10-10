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
