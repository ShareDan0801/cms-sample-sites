/* =========================================================================
 * demo-cms（apps/samples/demo01）— 投稿詳細「記事本体」の共有レンダラ
 * -------------------------------------------------------------------------
 * 投稿詳細の記事HTMLを組み立てる唯一の場所。次の2箇所から同じ関数を呼び、
 * 公開版とプレビュー版で **まったく同じマークアップ** を保証する（プレビュー要件 §10/§12）:
 *
 *   (A) 公開詳細ページ   … src/pages/posts/news/[slug].astro（ビルド時＝SSG。公開API `GET /api/v1/posts/news/{slug}`）
 *   (B) プレビューページ … src/pages/preview/posts/news/index.astro（実行時＝ブラウザ。
 *                          プレビューAPI `GET /api/v1/posts/news/{slug}/preview` の下書き版）
 *
 * 入力 `post` は公開API/プレビューAPIの PostDetail（レスポンス形状は同一）。本文（body）は
 * ProseMirror JSON なので、呼び出し側が渡す `renderProseMirror` でHTML化する
 * （ビルド時=ローカルSDK、実行時=SDK。どちらも同じ実装なので出力は一致する）。
 *
 * パスワード保護（簡易認証・SCR-104）: 保護中の投稿は公開API個別取得で本文が null になる
 * （`is_password_protected=true`）。その場合は本文の代わりに「パスワードゲート」を描画し、
 * 実行時（public/js/cms.js）が閲覧者の入力を受けて `cms.posts.unlock()` で本文を取得・差し替える。
 * ========================================================================= */
import { uiFor } from './i18n.mjs'

/** カテゴリ slug → チップ配色クラス（css/style.css・TopPage.astro と一致させる）。 */
export const POST_CHIP_CLASS = {
  event: 'chip--event',
  product: 'chip--product',
  info: 'chip--info',
  press: 'chip--press',
}

/** published_at（ISO8601）を YYYY.MM.DD へ。TZずれ回避のため文字列先頭を使う（index.astro と同一）。 */
export function fmtDate(iso) {
  return iso ? String(iso).slice(0, 10).replace(/-/g, '.') : ''
}

/** HTML属性・テキスト用の最小エスケープ（renderProseMirror と同一方針）。 */
export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 鍵アイコン（ゲート見出し用）とチェックアイコン（認証後バナー用）のSVG。
const LOCK_SVG =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>'

/**
 * パスワードゲート（簡易認証・SCR-104）のHTMLを組み立てる。
 *
 * 実行時（public/js/cms.js）が `[data-pw-gate]` を拾って入力欄を配線し、`cms.posts.unlock()` で
 * 本文を取得してゲートを本文へ差し替える。ゲート要素の data-* に必要な情報（種別・slug・言語・
 * 戻り先）を載せ、実行時メッセージ（誤り／試行超過／失敗／認証後／再ロック等）は
 * `window.SHAREDAN_I18N.gate` から読む。
 *
 * @param {object} ui uiFor(locale) の gate 文言
 * @param {{ postType?: string, slug?: string, apiLocale?: string|null, backHref?: string|null, backLabel?: string, demoPassword?: string|null }} opts
 */
export function renderPasswordGate(ui, opts = {}) {
  const g = (ui && ui.gate) || uiFor('ja').gate
  const postType = opts.postType || 'news'
  const dataAttrs =
    ` data-pw-gate data-post-type="${esc(postType)}" data-post-slug="${esc(opts.slug || '')}"` +
    ` data-locale="${esc(opts.apiLocale || '')}"` +
    (opts.backHref ? ` data-back-href="${esc(opts.backHref)}" data-back-label="${esc(opts.backLabel || '')}"` : '')

  const parts = []
  parts.push(`<div class="pw-gate"${dataAttrs}>`)
  parts.push(`<div class="pw-gate__icon">${LOCK_SVG}</div>`)
  parts.push(`<div class="pw-gate__title">${esc(g.title)}</div>`)
  parts.push(`<p class="pw-gate__lead">${esc(g.lead)}</p>`)
  parts.push('<form class="pw-gate__form" data-pw-form>')
  parts.push(`<label class="pw-gate__label" for="pw-gate-input">${esc(g.pwLabel)}</label>`)
  parts.push('<div class="pw-gate__box">')
  parts.push(
    `<input id="pw-gate-input" type="password" class="pw-gate__input" data-pw-input placeholder="${esc(g.pwPh)}" autocomplete="off" autocapitalize="off" spellcheck="false">`,
  )
  parts.push(`<button type="button" class="pw-gate__toggle" data-pw-toggle>${esc(g.show)}</button>`)
  parts.push('</div>')
  parts.push('<div class="pw-gate__error" data-pw-error hidden></div>')
  parts.push(`<button type="submit" class="pw-gate__submit" data-pw-submit>${esc(g.submit)}</button>`)
  parts.push(`<div class="pw-gate__hint">${esc(g.hint)}</div>`)
  parts.push('</form>')
  parts.push('</div>')

  // デモ用パスワードの案内（デモサイトの体験用。opts.demoPassword 指定時のみ）。
  if (opts.demoPassword) {
    parts.push(
      `<div class="pw-gate__demo">${esc(g.demoLabel)}<code>${esc(opts.demoPassword)}</code></div>`,
    )
  }
  return parts.join('')
}

/**
 * 投稿詳細の「記事本体」HTML文字列を組み立てる（`<article class="article">…</article>`）。
 *
 * ページ側の共通部品（ヘッダー／フッター／プレビューバナー等）は含めず、記事そのものだけを返す。
 * これにより公開ページ(A)とプレビュー(B)で記事の見た目を完全に共通化する。
 *
 * 保護中（`is_password_protected=true` かつ `body` が null）はパスワードゲートを描画する。
 * 指定言語の訳が無く原文を表示している場合（`translation_available===false`）は注記を本文冒頭に出す。
 *
 * @param {object} post 公開API/プレビューAPIの PostDetail
 * @param {(node: unknown) => string} renderProseMirror 本文（ProseMirror JSON）をHTML化する関数
 * @param {{ backHref?: string|null, backLabel?: string, ui?: object, apiLocale?: string|null, demoPassword?: string|null }} [options]
 * @returns {string} 記事本体のHTML
 */
export function renderPostArticle(post, renderProseMirror, options = {}) {
  const p = post || {}
  const ui = options.ui || uiFor('ja')
  const category = p.category || null
  const chipClass = (category && POST_CHIP_CLASS[category.slug]) || 'chip--info'
  const categoryName = (category && category.name) || ui.article.fallbackCat
  const dateText = fmtDate(p.published_at)
  const tags = Array.isArray(p.tags) ? p.tags : []
  const relatedUrls = Array.isArray(p.related_urls) ? p.related_urls : []
  const eyecatch = p.eyecatch_image || null
  // 保護中は本文が null で返る（公開API個別取得）。ゲートを出して実行時に unlock させる。
  const gated = !!p.is_password_protected && p.body == null

  const parts = []
  parts.push('<article class="article">')

  // 記事ヘッダー: 日付 + カテゴリチップ / タイトル / タグ
  parts.push('<header class="article__head">')
  parts.push('<div class="article__meta">')
  if (dateText) {
    parts.push(`<time class="article__date" datetime="${esc(p.published_at)}">${esc(dateText)}</time>`)
  }
  parts.push(`<span class="chip ${chipClass}">${esc(categoryName)}</span>`)
  parts.push('</div>')
  parts.push(`<h1 class="article__title">${esc(p.title)}</h1>`)
  if (tags.length) {
    const tagItems = tags.map((tag) => `<li class="tag">#${esc(tag)}</li>`).join('')
    parts.push(`<ul class="article__tags">${tagItems}</ul>`)
  }
  parts.push('</header>')

  if (gated) {
    // 保護中：本文の代わりにパスワードゲート（実行時に unlock → 本文へ差し替え）
    parts.push(
      renderPasswordGate(ui, {
        postType: options.postType || 'news',
        slug: p.slug,
        apiLocale: options.apiLocale || '',
        backHref: options.backHref || null,
        backLabel: options.backLabel,
        demoPassword: options.demoPassword || null,
      }),
    )
    parts.push('</article>')
    return parts.join('')
  }

  // アイキャッチ画像（設定時のみ）
  if (eyecatch && eyecatch.url) {
    parts.push(
      `<figure class="article__eyecatch"><img src="${esc(eyecatch.url)}" alt="${esc(p.title)}"${
        eyecatch.width ? ` width="${esc(eyecatch.width)}"` : ''
      }${eyecatch.height ? ` height="${esc(eyecatch.height)}"` : ''} loading="lazy"></figure>`,
    )
  }

  // 翻訳フォールバック注記（指定言語の訳が無く原文を表示している場合・要件 9.10）。
  if (p.translation_available === false) {
    parts.push(`<div class="article__fallback-note">${esc(ui.fallbackNote)}</div>`)
  }

  // 本文（ProseMirror → HTML）
  parts.push(`<div class="article__body">${renderProseMirror(p.body)}</div>`)

  // 関連リンク（設定時のみ。管理側で設定した順序のまま）
  if (relatedUrls.length) {
    const links = relatedUrls
      .filter((r) => r && r.url)
      .map((r) => {
        const label = r.label != null && r.label !== '' ? r.label : r.url
        return `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a></li>`
      })
      .join('')
    if (links) {
      parts.push('<section class="article__related">')
      parts.push(`<h2 class="article__related-title">${esc(ui.article.related)}</h2>`)
      parts.push(`<ul class="article__related-list">${links}</ul>`)
      parts.push('</section>')
    }
  }

  // 一覧へ戻る導線（backHref 指定時のみ。プレビューでは通常出さない）
  if (options.backHref) {
    const backLabel = options.backLabel || ui.article.back
    parts.push(`<a class="article__back" href="${esc(options.backHref)}">${esc(backLabel)}</a>`)
  }

  parts.push('</article>')
  return parts.join('')
}
