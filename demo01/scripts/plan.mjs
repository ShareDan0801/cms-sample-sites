/* =========================================================================
 * demo-cms（apps/samples/demo01）— 増分ビルド計画の作成（astro build の前に実行）
 * -------------------------------------------------------------------------
 * 変更検知API（GET /api/v1/changes）を叩き、差分を `.build-plan.json` に書き出す。
 * 続く `astro build` の getStaticPaths がこの計画を読み、変更された投稿ページのみを再生成する。
 *
 * 変更検知APIが使えない（未デプロイ・ネットワーク断・権限等）場合は **フルビルドにフォールバック**する
 * （＝壊れたデプロイにしない・安全側）。この場合 as_of は書かないため complete.mjs は前進をスキップする。
 *
 * 使い方: node scripts/plan.mjs  （npm run plan / build:incremental から呼ばれる）
 * ========================================================================= */
import { fetchChanges } from '../src/lib/cms.mjs'
import { buildPlanFromChanges, writeBuildPlan } from '../src/lib/build-plan.mjs'

try {
  const feed = await fetchChanges()
  const plan = buildPlanFromChanges(feed)
  writeBuildPlan(plan)
  if (plan.mode === 'full') {
    console.log(`[plan] full build（初回 or 全体ビルド要求）: 公開中の全ページを再生成します / as_of=${plan.as_of}`)
  } else {
    console.log(
      `[plan] incremental build: 投稿 更新=${plan.postSlugsUpsert.length}件 / 削除=${plan.postSlugsDelete.length}件 / as_of=${plan.as_of}`,
    )
  }
} catch (err) {
  // 変更検知APIが使えない場合はフルビルドにフォールバック（as_of なし＝complete はスキップ）。
  console.warn(`[plan] 変更検知APIの取得に失敗したためフルビルドにフォールバックします: ${err && err.message ? err.message : err}`)
  writeBuildPlan({ mode: 'full', as_of: null, postSlugsUpsert: [], postSlugsDelete: [] })
}
