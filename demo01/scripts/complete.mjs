/* =========================================================================
 * demo-cms（apps/samples/demo01）— ビルド完了通知（デプロイ成功後に実行）
 * -------------------------------------------------------------------------
 * 直前の計画（.build-plan.json）の as_of を使って、サイトの最終ビルド日時を前進させる
 * （POST /api/v1/changes/complete・FUN-037）。次回ビルドはこの時刻以降の差分だけになる。
 *
 * **必ずデプロイ成功後に呼ぶこと。** ビルド/デプロイが失敗したときに呼ばないことで、失敗分の差分を
 * 取りこぼさず次回に再取得できる（冪等）。as_of が無い（計画なしのフルビルド＝APIフォールバック）
 * 場合は前進をスキップする。
 *
 * 使い方: node scripts/complete.mjs  （npm run complete から呼ばれる）
 * ========================================================================= */
import { completeBuild } from '../src/lib/cms.mjs'
import { readBuildPlan } from '../src/lib/build-plan.mjs'

const plan = readBuildPlan()

if (!plan.as_of) {
  console.log('[complete] as_of がない（計画なしのフルビルド）ため、最終ビルド日時の前進はスキップします。')
  process.exit(0)
}

try {
  const res = await completeBuild(plan.as_of)
  console.log(`[complete] 最終ビルド日時を前進しました（built_as_of=${plan.as_of}）`, res)
} catch (err) {
  // 完了通知の失敗はデプロイ自体の成功を覆さない（次回ビルドで同じ差分を再取得＝冪等）。
  console.error(`[complete] 完了通知に失敗しました（次回ビルドで同じ差分を再取得します）: ${err && err.message ? err.message : err}`)
  process.exitCode = 1
}
