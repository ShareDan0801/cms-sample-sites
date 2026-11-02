/* =========================================================================
 * demo-cms（apps/samples/demo01）— 増分ビルド計画（build plan・FUN-037）
 * -------------------------------------------------------------------------
 * 変更検知API（src/lib/cms.mjs の fetchChanges・公開SDK cms.changes）が返した差分を、このサイトのページ生成計画へ落とし込む。
 * ビルド前に scripts/plan.mjs が `.build-plan.json` を書き、astro build 中の getStaticPaths が
 * それを読んで「どの投稿ページを再生成するか」を決める（incremental＝変更分のみ／full＝全件）。
 *
 * このデモが持つ「多数」のページは投稿詳細（/posts/news/{slug}/）のみ。トップページ（index）は
 * 常に再生成する（1ページ・一覧/FAQ/固定コンテンツの変更を反映）ため、計画では投稿だけを扱う。
 * フォーム定義（type=form）・カテゴリ（type=category）・FAQ／固定コンテンツの変更はトップ側に
 * 現れるため、投稿の増分生成とは独立に（index 常時再生成で）反映される。
 *
 * SDK に依存しない（fs/path のみ）。
 * ========================================================================= */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// src/lib/build-plan.mjs → サンプルのルート（.build-plan.json はルート直下・.gitignore 済み）。
const SAMPLE_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
export const BUILD_PLAN_PATH = join(SAMPLE_ROOT, '.build-plan.json')

/** 計画なし（素の astro build）時の既定＝全件生成（従来どおり・後方互換）。 */
const FULL_PLAN = { mode: 'full', as_of: null, postSlugsUpsert: [], postSlugsDelete: [] }

/**
 * 変更検知APIのフィードから増分ビルド計画を作る。
 *
 * @param {{as_of: string, full_resync: boolean, changes: Array<{type: string, key: string, action: string}>}} feed
 */
export function buildPlanFromChanges(feed) {
  const postSlugsUpsert = []
  const postSlugsDelete = []
  for (const change of feed.changes || []) {
    if (change.type !== 'post') continue // 投稿以外はトップページ再生成で反映（上のコメント参照）
    if (change.action === 'upsert') postSlugsUpsert.push(change.key)
    else if (change.action === 'delete') postSlugsDelete.push(change.key)
  }
  return {
    // full_resync（初回・全体ビルド要求）は全件生成。それ以外は変更分のみ。
    mode: feed.full_resync ? 'full' : 'incremental',
    as_of: feed.as_of || null,
    postSlugsUpsert,
    postSlugsDelete,
  }
}

export function writeBuildPlan(plan) {
  writeFileSync(BUILD_PLAN_PATH, JSON.stringify(plan, null, 2) + '\n')
}

/** 計画を読む。無い／壊れている場合は全件生成（full）にフォールバックする。 */
export function readBuildPlan() {
  if (!existsSync(BUILD_PLAN_PATH)) return { ...FULL_PLAN }
  try {
    const plan = JSON.parse(readFileSync(BUILD_PLAN_PATH, 'utf8'))
    return { ...FULL_PLAN, ...plan }
  } catch {
    return { ...FULL_PLAN }
  }
}
