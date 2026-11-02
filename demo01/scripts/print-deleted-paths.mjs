/* =========================================================================
 * demo-cms（apps/samples/demo01）— 削除された投稿ページのサーバー相対パスを列挙
 * -------------------------------------------------------------------------
 * 増分デプロイで、非公開化・削除された投稿のページをサーバーから取り除くために使う。
 * FTPS のミラー（mirror --reverse）は既存ファイルを削除しないため、削除分は明示的に rm する必要がある。
 * このスクリプトは `.build-plan.json` の削除 slug を、各言語の公開ディレクトリ相対パス（ディレクトリ）へ
 * 変換して1行ずつ標準出力する（Astro の build.format=directory＝ /posts/news/{slug}/index.html）。
 *
 *   ja（原文）      … posts/news/{slug}
 *   en             … en/posts/news/{slug}
 *   zh-Hant        … zh-Hant/posts/news/{slug}
 *
 * デプロイ workflow 側がこの出力を読み、lftp で `rm -r -f <path>` する（存在しなければ無害）。
 * 使い方: node scripts/print-deleted-paths.mjs  （npm run print-deleted-paths から呼ばれる）
 * ========================================================================= */
import { readBuildPlan } from '../src/lib/build-plan.mjs'
import { LOCALES } from '../src/lib/i18n.mjs'

const plan = readBuildPlan()
const lines = []
for (const slug of plan.postSlugsDelete || []) {
  for (const locale of LOCALES) {
    const prefix = locale.path ? `${locale.path}/` : ''
    lines.push(`${prefix}posts/news/${slug}`)
  }
}

process.stdout.write(lines.length ? lines.join('\n') + '\n' : '')
