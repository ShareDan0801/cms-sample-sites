/* =========================================================================
 * demo-cms（apps/samples/demo01）— ビルド時データ層（SSG）
 * -------------------------------------------------------------------------
 * このサイトは「ヘッドレスCMSの静的ビルド」を体現するデモ。コンテンツ（投稿／
 * FAQ／固定コンテンツ）は **ビルド時**（astro build）に公開API（IF-001）から取得し、
 * 静的HTMLへ焼き込む（src/pages/index.astro のフロントマターで使用）。
 *
 * 投稿は種別（post type）ごとに取得する。このサイトが表示するのは既定種別「お知らせ」
 * （slug `news`・POST_TYPE）のみ。利用可能な種別は cms.postTypes.list() で取得できる。
 *
 *   投稿(お知らせ)  … GET /api/v1/posts/news
 *   FAQ          … GET /api/v1/faqs
 *   代表メッセージ … GET /api/v1/contents/top-message
 *   製品ラインアップ … GET /api/v1/contents/products
 *
 * 実行時（ブラウザ）に残すのは「フォーム送信」と「メンテナンス状態の即時反映」のみ
 * （public/js/cms.js）。それ以外はここでビルド時に確定させる。
 *
 * 一過性の失敗（5xx／429／ネットワーク断・タイムアウト）は指数バックオフで数回リトライし、
 * それでも取得できなければビルドを失敗させる（＝壊れた／空のサイトを配信しない）。恒久的な
 * 4xx（404/401/403 等の設定・権限起因）はリトライしても直らないため即失敗させる。
 * FTPS 配信は差分ミラー（既存を消さない）のため、ビルド失敗時は直前の正常サイトが残る。
 *
 * 接続先は環境変数で上書きできる（既定は本番公開API・テナント demo-cms）。
 *   PUBLIC_CMS_API_ORIGIN … 例 http://localhost:8091 / https://api.dev.cms.sharedan.co.jp
 *   PUBLIC_CMS_API_KEY / PUBLIC_CMS_SITE_CODE … 別テナントで検証する場合
 * ========================================================================= */
import { ShareDanCmsClient, renderProseMirror, extractText } from '@sharedan/cms-sdk'
import { LOCALES } from './i18n.mjs'

const ORIGIN = process.env.PUBLIC_CMS_API_ORIGIN || 'https://api.cms.sharedan.co.jp'
const API_KEY = process.env.PUBLIC_CMS_API_KEY || 'demo-cms-public-api-key-0001'
const SITE_CODE = process.env.PUBLIC_CMS_SITE_CODE || 'demo-cms'

export const cmsConfig = { origin: ORIGIN, apiKey: API_KEY, siteCode: SITE_CODE }

// このデモが表示する投稿の種別（post type）。既定種別「お知らせ」の slug。
// 他種別を出す場合はこの値を変える（cms.posts.*(POST_TYPE, …) に渡す）。
const POST_TYPE = 'news'

// デモ用のパスワード保護投稿（簡易認証・SCR-104）の閲覧パスワード。ゲートのデモ案内に表示する。
// ※ DemoCmsSeeder が同じ値で t_posts.password を設定している（変更時は両方そろえること）。
export const DEMO_POST_PASSWORD = 'demo2026'

const cms = new ShareDanCmsClient({
  baseUrl: ORIGIN,
  apiKey: API_KEY,
  siteCode: SITE_CODE,
  timeoutMs: 15000, // ビルド時の一時的な遅延に耐えるよう実行時(8s)より長めにする
})

export { renderProseMirror, extractText }

// 公開APIへの locale 付き取得は SDK の型付きリソースメソッド（posts.list(type,{locale}) 等）で行う。
// locale 引数（{locale}）は @sharedan/cms-sdk 0.7.0 以降で対応。null の locale は原文を意味し、
// SDK がクエリから省く（＝原文を返す）。

// リトライ設定: 一過性エラーに対して最大 RETRY_ATTEMPTS 回試行し、失敗ごとに
// RETRY_BASE_MS * 2^(n-1) ミリ秒（1s → 2s → 4s）待つ。最悪でも約7s の追加待機に収まる。
const RETRY_ATTEMPTS = 4
const RETRY_BASE_MS = 1000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// リトライすべき「一過性」の失敗か判定する。
//   ・HTTP 5xx / 429（サーバ側・レート制限）… 時間をおけば直りうる → リトライ
//   ・status を持たない失敗（ネットワーク断・タイムアウト・abort）… 同上 → リトライ
//   ・HTTP 4xx（404/401/403/400/422 等の設定・権限起因）… 再試行しても直らない → 即失敗
function isTransient(err) {
  const status = err && typeof err.status === 'number' ? err.status : null
  if (status === null) return true
  return status >= 500 || status === 429
}

// 一過性の失敗を指数バックオフでリトライして factory を実行する。リトライを使い切る／恒久的な
// 失敗は **元の例外をそのまま** 投げる（status/code を保持＝呼び出し側が locale 400 等を判定できる）。
async function attempt(label, factory) {
  let lastErr
  for (let attemptNo = 1; attemptNo <= RETRY_ATTEMPTS; attemptNo++) {
    try {
      return await factory()
    } catch (err) {
      lastErr = err
      if (attemptNo >= RETRY_ATTEMPTS || !isTransient(err)) break
      const wait = RETRY_BASE_MS * 2 ** (attemptNo - 1)
      const reason = err && err.message ? err.message : String(err)
      console.warn(
        `[build] ${label} の取得に失敗（試行 ${attemptNo}/${RETRY_ATTEMPTS}）— ${wait}ms 後に再試行: ${reason}`,
      )
      await sleep(wait)
    }
  }
  throw lastErr
}

// 取得失敗時に「どのエンドポイントで落ちたか」を明示してビルドを止めるためのラッパ。
// 一過性の失敗は指数バックオフでリトライし、リトライを使い切るとビルドを失敗させる。
// factory は試行ごとに新しい Promise を生成する関数（Promise は再実行できないため）。
async function must(label, factory) {
  try {
    return await attempt(label, factory)
  } catch (err) {
    const detail = err && err.message ? err.message : String(err)
    throw new Error(
      `[build] 公開APIの取得に失敗しました (${label}) origin=${ORIGIN} site=${SITE_CODE}: ${detail}`,
    )
  }
}

// 「指定言語が利用できない」エラーか（多言語オプション無効／未設定・未対応言語＝公開APIが 400 / E001008）。
// これはテナント設定の問題でビルドの異常ではないため、その言語だけスキップして原文サイトを成立させる。
function isLocaleUnavailable(err) {
  return !!err && err.status === 400 && err.code === 'E001008'
}

// ビルド時に実際に生成できる言語コードを確定する（多言語オプション・9.10）。
// 候補言語（i18n.mjs の LOCALES）を公開APIへ軽く問い合わせ、利用できる言語だけ残す。
// 原文（ja）は常に含む。1ビルド内で一度だけ評価する（メモ化）。
let availableLocalesPromise = null
export function resolveAvailableLocales() {
  if (!availableLocalesPromise) {
    availableLocalesPromise = (async () => {
      const codes = ['ja']
      for (const locale of LOCALES) {
        if (!locale.apiLocale) continue // ja（原文）は無条件に対応
        try {
          const res = await attempt(`locale probe ${locale.apiLocale}`, () =>
            cms.posts.list(POST_TYPE, { perPage: 1, locale: locale.apiLocale }),
          )
          // 多言語が有効な公開APIは locale 指定時のレスポンスに translation_available を必ず含める
          // （訳あり=true／原文フォールバック=false）。多言語未対応の旧APIは locale を無視して 200 を
          // 返し、このフィールドが付かない。その有無で「この言語を生成してよいか」を判定する。
          const item = res && res.items && res.items[0]
          const honored = !!item && Object.prototype.hasOwnProperty.call(item, 'translation_available')
          if (honored) {
            codes.push(locale.code)
          } else {
            console.warn(
              `[build] 言語 ${locale.apiLocale} は多言語が有効化されていない（または旧API）ためスキップします（原文のみ生成）`,
            )
          }
        } catch (err) {
          if (isLocaleUnavailable(err)) {
            console.warn(
              `[build] 言語 ${locale.apiLocale} は多言語設定が無効／未対応のためスキップします（この言語ページは生成しません）`,
            )
            continue
          }
          throw err // 一過性でない実エラー（恒久的な 5xx 等）はビルドを止める
        }
      }
      return codes
    })()
  }
  return availableLocalesPromise
}

/**
 * ページ描画に必要なコンテンツをビルド時に一括取得する。
 * 4リクエストを並行し、（リトライを尽くしても）いずれか失敗すればビルドを失敗させる。
 *
 * @param {string|null} [apiLocale] 取得言語（多言語オプション・9.10）。null＝原文（日本語）。
 *   対象言語の公開版が無いコンテンツは原文を返し `translation_available:false` を含む。
 */
export async function fetchSiteContent(apiLocale = null) {
  const suffix = apiLocale ? ` [${apiLocale}]` : ''
  const [posts, faqs, topMessage, products] = await Promise.all([
    must('posts/news' + suffix, () => cms.posts.list(POST_TYPE, { perPage: 50, locale: apiLocale })),
    must('faqs' + suffix, () => cms.faqs.list({ locale: apiLocale })),
    must('contents/top-message' + suffix, () => cms.contents.get('top-message', { locale: apiLocale })),
    must('contents/products' + suffix, () => cms.contents.get('products', { locale: apiLocale })),
  ])
  return {
    posts: (posts && posts.items) || [],
    faqs: (faqs && faqs.items) || [],
    topMessage,
    products,
  }
}

/**
 * 公開中の投稿（既定種別 お知らせ）を全件（全ページ）取得する（詳細ページ [slug].astro の getStaticPaths 用）。
 * 1ページ最大件数で取得し、meta.last_page まで順にページを辿って全 PostSummary を集める。
 * いずれかのページ取得に失敗すれば（リトライを尽くしても）ビルドを失敗させる。
 */
export async function fetchAllPosts(apiLocale = null) {
  const PER_PAGE = 100
  const suffix = apiLocale ? ` [${apiLocale}]` : ''
  const first = await must('posts/news (page 1)' + suffix, () =>
    cms.posts.list(POST_TYPE, { perPage: PER_PAGE, page: 1, locale: apiLocale }),
  )
  const items = [...((first && first.items) || [])]
  const lastPage = (first && first.meta && first.meta.last_page) || 1
  for (let page = 2; page <= lastPage; page++) {
    const res = await must(`posts/news (page ${page})` + suffix, () =>
      cms.posts.list(POST_TYPE, { perPage: PER_PAGE, page, locale: apiLocale }),
    )
    items.push(...((res && res.items) || []))
  }
  return items
}

/**
 * 投稿詳細（本文あり）を slug 指定で取得する（公開版 `GET /api/v1/posts/news/{slug}`）。
 * ビルド時に各 slug の詳細を焼き込むために使う。取得失敗時はビルドを失敗させる。
 */
export async function fetchPostDetail(slug, apiLocale = null) {
  const suffix = apiLocale ? ` [${apiLocale}]` : ''
  return must(`posts/news/${slug}` + suffix, () => cms.posts.get(POST_TYPE, slug, { locale: apiLocale }))
}

/* =========================================================================
 * 変更検知API（増分SSG向け差分配信・FUN-037／IF-013）— 公開SDK cms.changes を利用
 * -------------------------------------------------------------------------
 * 前回ビルド以降に変更があった公開コンテンツの差分を取得し（fetchChanges）、変更分のみ再生成する
 * 増分ビルドに使う。ビルド成功後に最終ビルド日時を前進させる（completeBuild）。詳細は scripts/plan.mjs・
 * scripts/complete.mjs・src/lib/build-plan.mjs を参照。
 * ========================================================================= */

/**
 * サイトの最終ビルド日時以降の差分フィードを取得する（GET /api/v1/changes）。watermark は進めない（冪等）。
 * 返り値 { as_of, full_resync, changes[] }。取得失敗時はビルド失敗として投げる（plan.mjs がフルビルドへフォールバック）。
 */
export async function fetchChanges() {
  return must('changes', () => cms.changes.fetch())
}

/**
 * ビルド成功を通知し最終ビルド日時を前進させる（POST /api/v1/changes/complete）。
 * builtAsOf は直前の fetchChanges() が返した as_of。必ずデプロイ成功後に呼ぶこと（失敗時は呼ばない＝差分を取りこぼさない）。
 */
export async function completeBuild(builtAsOf) {
  return must('changes/complete', () => cms.changes.complete(builtAsOf))
}
