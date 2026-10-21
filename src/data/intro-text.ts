// ホーム下部の紹介文の材料を作る純粋関数。事実はシート（曲・ライブ）の値だけ。
// 曲もライブも無いときは、その文の材料を null にする（テスト: scripts/test/intro-text.test.mjs）

export type IntroEp = { title: string; kind?: string };
export type IntroLive = { month: number; day: number; venue: string };

export type IntroParts = {
  /** 最新作（曲の先頭）。作品名が空なら null */
  latest: { kind: string; title: string } | null;
  /** 次のライブ。日付か会場が欠けていれば null */
  live: { date: string; venue: string } | null;
};

export function introParts(eps: IntroEp[], live: IntroLive | null): IntroParts {
  const first = eps[0];
  const title = first?.title?.trim() ?? '';
  const venue = live?.venue?.trim() ?? '';
  return {
    latest: title ? { kind: first!.kind?.trim() ?? '', title } : null,
    live: live && venue && live.month > 0 && live.day > 0 ? { date: `${live.month}月${live.day}日`, venue } : null,
  };
}
