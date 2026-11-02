// @ts-check
import { defineConfig } from 'astro/config'

/**
 * サンプルサイト（ヘッドレス静的版）の Astro 設定。
 *
 * コンテンツ（投稿／FAQ／固定コンテンツ）は **ビルド時**に公開API（IF-001）から取得し
 * （src/lib/cms.mjs → src/pages/index.astro フロントマター）、静的HTMLへ焼き込む。
 * 実行時のAPI連携はメンテナンス即時反映とフォーム送信のみ（public/js/cms.js）。
 * よって SSR/アダプタは不要（既定の output: 'static'）。ビルド生成物は dist/ に出力し、
 * GitHub Actions（.github/workflows/deploy-samples.yml）がさくらのレンタルサーバへ FTPS で配信する。
 *
 * 接続先はビルド時の環境変数で上書きできる（既定は本番公開API・テナント demo-cms）:
 *   PUBLIC_CMS_API_ORIGIN / PUBLIC_CMS_API_KEY / PUBLIC_CMS_SITE_CODE
 */
export default defineConfig({
  // sitemap 等の絶対URL生成に使用（公開URL）。
  site: 'https://demo-cms.sharedan.biz',
})
