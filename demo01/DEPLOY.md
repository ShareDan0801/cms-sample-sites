# サンプルサイト 自動デプロイ（Astro ビルド → さくらのレンタルサーバ）

このサイト（`apps/samples/demo01`）を GitHub Actions で **Astro ビルド**し、
**さくらのレンタルサーバへ FTPS で自動アップロード**します。

```
apps/samples/demo01（Astroソース）
  ─► GitHub Actions（.github/workflows/deploy-samples.yml：Astro build）
      ─► さくらのレンタルサーバ（FTPS で dist/ を公開ディレクトリへ）
```

ヘッドレス構成の要（かなめ）として、**ShareDan CMS の「GitHub Actions 連携」（FUN-026／SCR-120）**が
コンテンツ更新を契機に本ワークフローを `workflow_dispatch` で起動し、サイトを自動で再ビルド・再デプロイします。

- ワークフロー本体: [`.github/workflows/deploy-samples.yml`](../../../.github/workflows/deploy-samples.yml)

---

## トリガー

- **`workflow_dispatch`** … CMS の GitHub Actions 連携が **main** に対して起動する主トリガー。
- **push（main / `apps/samples/demo01/**`）** … 直接コミットした場合の再デプロイ。

---

## 必要な GitHub シークレット / 変数

リポジトリ（または Environment）の Settings → Secrets and variables → Actions に登録します。

| 種別 | 名前 | 例 | 用途 |
|---|---|---|---|
| Secret | `SAKURA_FTP_SERVER` | `example.sakura.ne.jp` | さくらの FTP ホスト（初期ドメイン or 独自ドメイン） |
| Secret | `SAKURA_FTP_USERNAME` | `example` | さくらの FTP アカウント |
| Secret | `SAKURA_FTP_PASSWORD` | `********` | さくらの FTP パスワード |
| Variable | `SAKURA_FTP_SERVER_DIR` | `/home/example/www/samples/` | 公開ディレクトリ（**末尾スラッシュ必須**） |
| Secret | `SAMPLES_CMS_API_KEY` | `demo-...` | （任意）お問い合わせ・プレビューの中継プロキシ（`cms-proxy.php`）用の公開APIキー。**未設定なら demo-cms のデモ用公開値**にフォールバック |
| Variable | `SAMPLES_CMS_API_ORIGIN` | `https://api.cms.sharedan.co.jp` | （任意）公開APIのオリジン。未設定なら本番公開API |
| Variable | `SAMPLES_CMS_SITE_CODE` | `demo-cms` | （任意）サイトコード（X-SITE-CODE）。未設定なら `demo-cms` |

> **お問い合わせ／メンテナンス／プレビューの通信方式：** ブラウザ → 同一オリジンの `dist/api/cms-proxy.php`（サーバー側中継）→ 公開API。
> ビルド後にワークフローが `dist/api/cms-proxy.config.php` を上記シークレット/変数から生成します（`X-API-KEY` はサーバー側にのみ置き、ブラウザには出しません）。同一オリジンのため CMS 側 CORS 設定は不要です。

- さくらは **明示的 FTPS（AUTH TLS・ポート21）** に対応しているため、ワークフローは `protocol: ftps` で接続します。
- 初回実行は全ファイルをアップロードし、2回目以降はサーバ上の同期状態ファイル
  （`.ftp-deploy-sync-state.json`）を用いて**差分のみ**転送します。
- 既存ファイルの誤削除防止のため全消し（`dangerous-clean-slate`）は無効にしています。

---

## CMS の「GitHub Actions 連携」からの起動設定（SCR-120）

テナント管理画面のサイト設定（SCR-120）→ 外部連携 → GitHub Actions 連携 に、以下を設定します
（コンテンツの公開・更新等を契機に、CMS が `workflow_dispatch` で本ワークフローを起動します）。

| 項目 | 値 |
|---|---|
| リポジトリ | `<owner>/<repo>`（本リポジトリ） |
| ブランチ（ref） | `main` |
| ワークフローファイル | `deploy-samples.yml` |
| アクセストークン（PAT） | `actions:write` 権限を付与した Personal Access Token |
| 公開時に自動で実行する | ON（連続更新は60秒デバウンス） |

> 起動方式は `workflow_dispatch` 固定です（[アーキテクチャ設計書 3.9](../../../designs/src/docs/02基本設計/01共通/アーキテクチャ設計書.md)）。

---

## このサイトの構成（Astro・対応済み）

本ワークフローは `apps/samples/demo01` で `npm ci` → `npm run build`（Astro）を実行し、`dist/` をデプロイします。
`npm run build` は **ビルド時に公開API（IF-001）からコンテンツを取得**して静的HTMLへ焼き込みます
（投稿／FAQ／代表メッセージ／製品）。構成は次のとおりです。

```
apps/samples/demo01/
├── package.json / package-lock.json         … Astro＋@sharedan/cms-sdk（build:'astro build' → dist/）
├── astro.config.mjs                          … 静的ビルド設定（output:'static'）
├── src/pages/index.astro                     … トップページ（フロントマターでビルド時にAPI取得→サーバ描画）
├── src/pages/posts/news/[slug].astro         … 投稿詳細ページ（既定種別 お知らせ・公開版・SSG。全slugをビルド時に焼き込む）
├── src/pages/preview/posts/news/index.astro  … 投稿プレビュー（下書き版・実行時SDK取得・noindex）
├── src/lib/cms.mjs                           … ビルド時データ層（@sharedan/cms-sdk で公開APIを取得）
├── src/lib/post-article.mjs                  … 投稿記事本体の共有レンダラ（詳細ページとプレビューで共通）
├── public/css/style.css                      … 共通デザインCSS（Astro が dist/ へそのままコピー）
├── public/js/main.js                         … 共通インタラクション
├── public/js/cms.js                          … 実行時のみ：メンテ即時反映＋フォーム送信（ESM・esm.sh 経由）
└── dist/                                     … ビルド生成物（gitignore・デプロイ対象）
```

- コンテンツはビルド時に確定するため、公開APIが取得できなければ**ビルドを失敗**させます（空・壊れたサイトを配信しない）。
  接続先はビルド時の環境変数 `PUBLIC_CMS_API_ORIGIN` / `PUBLIC_CMS_API_KEY` / `PUBLIC_CMS_SITE_CODE` で上書き可（既定は本番公開API・`demo-cms`）。
- `index.astro` 内の `<script>`／`<style>` は **`is:inline`** を付与し、Astro のバンドル・スコープ化を行わず
  **元の挙動をそのまま保持**する（GTM・起動時可視制御・接続設定・`main.js`／`cms.js` 読み込み）。
- 静的アセットは絶対パス（`/css/style.css`・`/js/main.js`・`/js/cms.js`）で参照し、`public/` から配信する。

## 増分SSG（変更検知API・差分更新・FUN-037／IF-013）

大量コンテンツのサイトでも、**前回ビルド以降に変更があったページだけを再生成**して配信できます。サイト単位の
「最終ビルド日時」は CMS 側（`m_sites.last_built_at`）が保持し、公開SDK `cms.changes` 経由で差分を取得します。

本ワークフローは `npm run build` の代わりに **`npm run build:incremental`** を実行します。流れは次のとおりです。

1. **計画**（`npm run plan` → `scripts/plan.mjs`）：`GET /api/v1/changes` で差分を取得し、`.build-plan.json` に
   「全体ビルドか増分か・更新/削除された投稿 slug・`as_of`」を書き出す。
2. **ビルド**（`astro build`）：`getStaticPaths` が `.build-plan.json` を読み、**増分なら変更（upsert）された投稿
   ページのみ**を再生成する（トップページは一覧/FAQ/固定コンテンツの変更反映のため常に再生成）。`full_resync`
   （初回・カテゴリ/タグ変更・手動ビルド）のときは全件再生成。
3. **アップロード**（FTPS `mirror --reverse`）：差分ファイルのみ転送（既存は削除しない）。
4. **削除**（`scripts/print-deleted-paths.mjs` → lftp `rm -r -f`）：非公開化・削除された投稿ページをサーバーから取り除く。
5. **完了通知**（`npm run complete` → `scripts/complete.mjs`）：デプロイ成功後にのみ `POST /api/v1/changes/complete`
   で最終ビルド日時を前進させる（失敗時はスキップ＝次回に同じ差分を再取得）。

| スクリプト | 役割 |
|---|---|
| `npm run build:incremental` | `plan` → `astro build`（本番で使用） |
| `npm run plan` | 差分を取得して `.build-plan.json` を作成 |
| `npm run complete` | デプロイ成功後に最終ビルド日時を前進 |
| `npm run print-deleted-paths` | 削除された投稿ページのサーバー相対パスを列挙（デプロイの rm 用） |

- **フォールバック**：変更検知APIが使えない（未デプロイ・ネットワーク断・権限等）場合、`plan` は自動的に
  **フルビルド**へフォールバックします（`.build-plan.json` に `as_of` を書かないため `complete` もスキップ）。
  ＝壊れた/空のサイトを配信しません。
- `npm run build`（素の全件ビルド）は従来どおり使えます（`.build-plan.json` が無ければ全件生成）。
- 差分配信APIは公開SDK（`@sharedan/cms-sdk`）の `cms.changes.fetch()` / `cms.changes.complete()` を利用します
  （`src/lib/cms.mjs`）。

**ローカル確認**

```sh
cd apps/samples/demo01
npm ci                 # 初回のみ（依存取得）
npm run dev            # 開発サーバ（http://localhost:4321）
# もしくは本番同等の生成物を確認
npm run build && npm run preview
```

> 従来の「素の静的サーバで開く」確認は、ビルド後の `dist/` を配信すれば同等に行えます
> （例: `cd dist && python3 -m http.server 8200`）。
