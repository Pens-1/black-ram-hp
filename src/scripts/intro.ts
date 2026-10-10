/* ---------- ロード時のロゴアニメーション（案D2「ストロボとグリッチ」、全体で約2.3秒）----------
   1. 頭蓋骨は最初から薄暗く（不透明度0.3）見えている
   2. 「BLACK」→「RAM」を間を空けず書き順通りに続けて書く（0.1〜1.2秒。mask の中心線を stroke-dashoffset で伸ばす）
   3. 書き終わりで頭蓋骨がストロボで光る（閃光2回）。2回目で目と角だけグリッチでずれてパチッと合う
   4. そのままグリッチ → ロゴはヒーローの位置へ飛び、黒い幕が引いてヒーロー（動画）が出る
      飛んだ先でヒーローのロゴを書き出しなしで真下に出し（html.intro-shown）、その後に幕ごとイントロのロゴを外す
   出すかどうかは index.astro の <head> が決める（<html class="is-intro">。リロードでも毎回出す）。
   閃光は2回だけで、どの1秒間にも2回まで。画面を押す・キー・ホイールで飛ばせる */

const root = document.documentElement;
const overlay = document.querySelector<HTMLElement>('[data-intro]');

/** ヒーローのロゴを書き出し・フェードなしで出す（イントロのロゴの真下に重なり、幕を外しても途切れない） */
const handOff = () => root.classList.add('intro-shown');

const finishIntro = () => {
  root.classList.remove('is-intro');
  overlay?.remove();
};

function run(el: HTMLElement): Promise<void> {
  const logo = el.querySelector<SVGSVGElement>('[data-intro-logo]')!;
  const skull = el.querySelector<SVGGElement>('[data-intro-skull]')!;
  const parts = Array.from(el.querySelectorAll<SVGGElement>('[data-intro-part]'));
  const flash = el.querySelector<HTMLElement>('[data-intro-flash]')!;
  const splitR = document.querySelector('[data-split-r]');
  const splitB = document.querySelector('[data-split-b]');
  const target = document.querySelector<HTMLElement>('.hero .logo img');
  const anims: Animation[] = [];
  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  el.style.animation = 'none'; // CSS の保険を外す（ここからは JS が責任を持つ）

  // 筆の中心線: 長さに比例した時間で、書き順通りに続けて伸ばす。
  // 1画の緩急: 入りで溜め（20%の時間で6%）→ 送り・払いは速く（60%で84%）→ 止めで落とす（20%で10%）
  // BLACK と RAM は1つの流れとして書く（BLACK の最後の画から RAM の最初の画へも筆を離す間だけ）
  const write = (from: number, to: number) => {
    const paths = (['black', 'ram'] as const).flatMap((k) =>
      Array.from(el.querySelectorAll<SVGPathElement>(`[data-intro-stroke="${k}"]`)),
    );
    const lens = paths.map((p) => p.getTotalLength());
    const n = paths.length;
    const span = to - from;
    // 画間の間と各画の最小時間も予算に含め、最後の画がちょうど to で終わるようにする。
    // 間は最大40ms・全体の2割まで、最小は60ms（画数が多くて収まらなければ平均の半分まで下げ、長短の差を残す）
    const gap = n > 1 ? Math.min(40, (span * 0.2) / (n - 1)) : 0; // 筆を離す間
    const avail = span - gap * (n - 1); // 書いている時間の合計
    const minDur = Math.min(60, (avail / n) * 0.5);
    // 長さ比例で配り、最小に満たない画は最小に固定して残りを配り直す（合計は常に avail）
    const durs = new Array<number>(n).fill(0);
    const fixed = new Set<number>();
    for (;;) {
      const free = lens.reduce((a, l, i) => (fixed.has(i) ? a : a + l), 0);
      const per = free > 0 ? (avail - minDur * fixed.size) / free : 0;
      let changed = false;
      lens.forEach((l, i) => {
        durs[i] = fixed.has(i) ? minDur : l * per;
        if (durs[i] < minDur) {
          fixed.add(i);
          changed = true;
        }
      });
      if (!changed) break;
    }
    let t = from;
    paths.forEach((p, i) => {
      const len = lens[i] + 1;
      p.style.strokeDasharray = `${len} ${len}`;
      p.style.strokeDashoffset = `${len}`;
      const dur = durs[i];
      anims.push(
        p.animate(
          [
            { strokeDashoffset: len, offset: 0, easing: 'cubic-bezier(.45,0,.55,1)' },
            { strokeDashoffset: len * 0.94, offset: 0.2, easing: 'cubic-bezier(.55,0,.35,1)' },
            { strokeDashoffset: len * 0.1, offset: 0.8, easing: 'cubic-bezier(.2,.6,.35,1)' },
            { strokeDashoffset: 0, offset: 1 },
          ],
          { duration: dur, delay: t, fill: 'both' },
        ),
      );
      t += dur + gap;
    });
  };

  // 閃光（Bone の面を 0 → 0.6 → 0、200ms）
  const strobe = (ms: number) =>
    anims.push(
      flash.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.15 }, { opacity: 0 }], {
        duration: 200,
        delay: ms,
        easing: 'ease-out',
      }),
    );

  // グリッチ: RGB ずれ（Hero の #rgb-split）を一瞬かける
  const rgb = (ms: number, dur: number, dx: number) =>
    at(ms, () => {
      splitR?.setAttribute('dx', String(-dx));
      splitB?.setAttribute('dx', String(dx));
      el.classList.add('is-glitch');
      at(dur, () => el.classList.remove('is-glitch'));
    });

  const step = { easing: 'steps(1, end)' };

  write(100, 1200);

  // 頭蓋骨のストロボ: 薄暗い（0.3）まま待ち、1250ms の閃光で光って少し落ち、1600ms の閃光で点灯
  // （閃光は 0.35秒差の2回だけ＝1秒に2回まで）
  const S1 = 1250;
  const S2 = 1600;
  const SK = 1700; // 頭蓋骨のキーフレームの長さ
  strobe(S1);
  strobe(S2);
  anims.push(
    skull.animate(
      [
        { opacity: 0.3, offset: 0 },
        { opacity: 0.3, offset: (S1 - 10) / SK },
        { opacity: 1, offset: (S1 + 5) / SK },
        { opacity: 0.9, offset: (S1 + 100) / SK },
        { opacity: 0.45, offset: (S1 + 170) / SK },
        { opacity: 0.45, offset: (S2 - 5) / SK },
        { opacity: 1, offset: (S2 + 5) / SK },
        { opacity: 1, offset: 1 },
      ],
      { duration: SK, fill: 'forwards', easing: 'linear' },
    ),
  );
  // 目と角だけずれて、パチッと合う
  parts.forEach((p, i) => {
    const s = i === 0 ? 1 : -1;
    const j = () => `translate(${Math.round(rand(22, 48)) * s}px, ${Math.round(rand(-10, 10))}px)`;
    anims.push(
      p.animate([{ transform: j(), ...step }, { transform: j(), ...step }, { transform: j(), ...step }, { transform: 'none' }], {
        duration: 200,
        delay: S2,
        fill: 'backwards',
      }),
    );
  });
  rgb(S2, 160, 24);

  // そのままグリッチ → ヒーローの位置へ飛ぶ → 幕が引く
  return new Promise<void>((done) => {
    const events = ['pointerdown', 'keydown', 'wheel', 'touchmove'];
    const resolve = () => {
      events.forEach((t) => window.removeEventListener(t, skip));
      done();
    };
    at(1780, () => {
      const from = logo.getBoundingClientRect();
      const to = target?.getBoundingClientRect();
      const onScreen = to && to.width > 0 && to.bottom > 0 && to.top < window.innerHeight;
      const end = onScreen
        ? `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`
        : 'none';
      const jit = () => `translate(${Math.round(rand(-28, 28))}px, ${Math.round(rand(-8, 8))}px) scale(${rand(1.02, 1.08).toFixed(3)})`;
      rgb(0, 240, 32);
      anims.push(
        logo.animate(
          [
            { transform: jit(), ...step },
            { transform: jit(), ...step },
            { transform: end, ...step },
            { transform: end },
          ],
          { duration: 240, fill: 'forwards' },
        ),
      );
      // グリッチが収まり、ヒーローのロゴと同じ位置・大きさに重なったら、下にヒーローのロゴを出しておく
      at(260, handOff);
      at(200, () => {
        const fade = el.animate([{ backgroundColor: getComputedStyle(el).backgroundColor }, { backgroundColor: 'transparent' }], {
          duration: 320,
          easing: 'ease-out',
          fill: 'forwards',
        });
        anims.push(fade);
        // 幕が引いたら、真下のヒーローのロゴへ溶かして渡す（SVG と img の描き方の差で明るさが跳ねないように）
        const melt = () => {
          const a = logo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear', fill: 'forwards' });
          anims.push(a);
          a.finished.then(() => resolve(), () => resolve());
        };
        fade.finished.then(melt, () => resolve());
      });
    });

    // 押す・キー・ホイールで飛ばす
    const skip = () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
      el.classList.remove('is-glitch');
      handOff();
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.then(
        () => resolve(),
        () => resolve(),
      );
    };
    events.forEach((t) => window.addEventListener(t, skip, { once: true, passive: true }));
    el.classList.add('is-run');
  });
}

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const running = !!overlay && root.classList.contains('is-intro') && !reduce;

/** ロゴアニメーションが終わったら（出さないときはすぐ）解決する */
export const introDone: Promise<void> = running
  ? run(overlay).then(
      () => (handOff(), finishIntro()),
      () => (handOff(), finishIntro()),
    )
  : Promise.resolve(finishIntro());

/** ロゴアニメーションを出しているか（ヒーローのストロボを後ろへずらすのに使う） */
export const introRunning = running;
