# サンプルサイト・簡易CMS（ヘッドレス）版（apps/samples/demo01）

デザイン「サンプルサイト.dc.html」を、外部フレームワーク不使用の素の HTML/CSS/JS で
実装した版。速度比較におけるヘッドレス簡易CMS（静的配信＋CDN）側にあたる。

投稿・FAQ・代表メッセージ・製品ラインアップは、**ShareDan 簡易CMS の公開API（IF-001）**
から **ビルド時**（`astro build`）に取得して静的HTMLへ焼き込む（`src/lib/cms.mjs`）。
＝ヘッドレス構成の「静的ビルド＋CDN配信」。実行時（ブラウザ）の公開API連携は、静的化できない
次の3つだけ（`js/cms.js`）:

- **メンテナンス状態の即時反映**（管理画面でON/OFFした瞬間に反映する必要があるため焼けない）
- **お問い合わせフォーム**（送信速度チェックの都度トークン・Turnstile・実送信）
- **パスワード保護投稿の unlock**（簡易認証・SCR-104。閲覧パスワードと引き換えに本文を取得）

このサイトは **多言語対応（9.10）** と **簡易認証（パスワード保護・SCR-104）** も反映している
（デザイン「サンプルサイト 多言語・簡易認証.dc.html」準拠）。詳細は下記
「[多言語対応・簡易認証](#多言語対応9.10簡易認証scr-104)」を参照。

デモバーの「管理画面の更新が、このページに反映されます」は、CMS の GitHub Actions 連携が
コンテンツ更新を契機に本サイトを再ビルド＆再デプロイすることで成立する（[DEPLOY.md](DEPLOY.md)）。

> **投稿機能（posts）**: 本サイトは「お知らせ → 投稿＋種別（post type）」の確定設計に合わせ、公開APIを
> `GET /api/v1/posts/{postType}`（既定種別 slug `news`）で取得する。SDK は npm 公開版 `@sharedan/cms-sdk`
> （ビルド時 `^0.7.0` / 実行時 esm.sh 0.7.0）。表示上の「お知らせ」節は既定種別「お知らせ」の描画。

## 構成

```
demo01/
├── src/pages/index.astro                       … トップページ（原文ja・ルート /。TopPage を描画）
├── src/pages/[locale]/index.astro              … 言語別トップ（/en/・/zh-Hant/。多言語が有効な言語だけ生成）
├── src/pages/posts/news/[slug].astro           … 投稿詳細（原文ja・公開版・SSG。全slugを焼き込む。保護中はゲート）
├── src/pages/[locale]/posts/news/[slug].astro  … 言語別の投稿詳細（/en/… ・/zh-Hant/…）
├── src/pages/preview/posts/news/index.astro    … 投稿プレビュー（下書き版・実行時SDK取得。CMSのプレビューURLの受け口）
├── src/components/TopPage.astro                … トップページ本体（言語別で共通。ビルド時にAPI取得→描画）
├── src/components/PostPage.astro               … 投稿詳細本体（言語別で共通。保護中はパスワードゲート）
├── src/components/SiteHeader.astro             … 共通ヘッダー（ナビ＋言語切替）
├── src/components/SiteFooter.astro             … 共通フッター
├── src/components/LangSwitcher.astro           … 言語切替（対応言語ページへの <a> リンク）
├── src/lib/cms.mjs                             … ビルド時データ層（@sharedan/cms-sdk で公開APIを locale 付き取得）
├── src/lib/i18n.mjs                            … 多言語設定（対応言語 LOCALES）＋サイト定型文言の翻訳辞書
├── src/lib/post-article.mjs                    … 投稿記事本体＋パスワードゲートの共有レンダラ（詳細ページとプレビューで共通）
├── public/api/cms-proxy.php                    … 公開APIのサーバー側中継（鍵秘匿・フォーム送信／unlock／プレビュー）
├── public/css/style.css                        … 共通デザインCSS（WordPress版 assets/css/theme.css と同一内容）
├── public/js/main.js                           … 共通インタラクション（WordPress版と同一内容）
├── public/js/cms.js                            … 実行時のみ：メンテ即時反映＋フォーム送信＋パスワードゲート unlock（この簡易CMS版のみ・ESモジュール）
├── astro.config.mjs                            … Astro 設定（output:'static'）
├── package.json                                … build:'astro build' → dist/（依存に @sharedan/cms-sdk ^0.7.0）
└── dist/                                       … ビルド生成物（gitignore・デプロイ対象）
```

`public/css/style.css` と `public/js/main.js` は WordPress テーマ版（`apps/samples/wp/assets/`）と
**同一内容**。デザインを 1:1 で一致させるため、両版で共有している（更新時は両方を同期）。
`public/js/cms.js` は公開API接続をこの版だけに閉じるための専用ファイル（WordPress版では読み込まない）。

> コンテンツはビルド時に確定するため、公開APIが取得できなければ**ビルドを失敗させる**
> （＝空・壊れたサイトを配信しない）。FTPS配信は差分ミラーで既存を消さないため、直前の正常サイトが残る。

Astro で静的ビルドし、GitHub Actions からさくらのレンタルサーバへ自動デプロイする（[DEPLOY.md](DEPLOY.md)）。

## 表示方法

Astro プロジェクトとして開発サーバ／ビルドで確認する。

```sh
cd apps/samples/demo01
npm ci                       # 初回のみ
npm run dev                  # → http://localhost:4321/
# もしくは本番同等（dist/ を生成して配信）
npm run build && npm run preview
```

> 従来の素の静的サーバ確認は、ビルド後に `cd dist && python3 -m http.server 8200` で同等に行える。

## インタラクション（js/main.js）

サーバが描画済みの DOM を操作するだけの実装（WordPress版と共有できる理由）。

- **デモバー**: 「簡易CMS / WordPress」切替、「再読み込み」（計測値を微増）、
  「計測を表示」（速度比較バー・各セクションのAPI計測パネルの表示ON/OFF）
- **投稿（お知らせ）/ FAQ**: カテゴリタブで絞り込み（`data-cat` の表示切替）
- **FAQ**: アコーディオン（1件だけ開く）
- **お問い合わせ**: `cms.js` が公開APIからフォーム定義を取得して描画し、実際に送信する
  （API未接続時は静的フォーム＝送信完了表示のみのデモ動作にフォールバック）

初期状態はデザインに合わせて、モード=簡易CMS・計測表示OFF・絞り込みなし・先頭FAQを開いた状態。

## ビルド時のAPI取得＝SSG（src/lib/cms.mjs → index.astro）

`src/lib/cms.mjs` が npm公開の **`@sharedan/cms-sdk`**（依存に追加）経由で公開API（IF-001）を
呼び出し、`src/pages/index.astro` のフロントマター（＝ビルド時に Node で実行）でHTMLへ焼き込む:

| セクション | エンドポイント | 取得タイミング |
|---|---|---|
| 投稿（既定種別 お知らせ） | `GET /api/v1/posts/news` | **ビルド時** |
| FAQ | `GET /api/v1/faqs` | **ビルド時** |
| 代表メッセージ | `GET /api/v1/contents/top-message` | **ビルド時** |
| 製品ラインアップ | `GET /api/v1/contents/products`（テーブル→横スライドのカード） | **ビルド時** |
| メンテナンス状態 | `GET /api/v1/maintenance` | 実行時（`js/cms.js`） |
| お問い合わせ | `GET /api/v1/forms/contact` ＋ `POST /api/v1/forms/contact/submissions` | 実行時（`js/cms.js`） |

会社概要（表）と導入事例（一覧）は該当するコンテンツ（`company-profile` / `works`）が
このテナントに無い（404）ため、静的表示のまま。カテゴリ絞り込み・件数更新・製品カルーセルは、
サーバ描画済みDOMに対して `js/main.js`（共有）が動作する。

### 接続設定

**ビルド時**（`src/lib/cms.mjs`）は環境変数で上書きできる。既定は本番公開API・テナント `demo-cms`
（backend `DemoCmsSeeder` の固定値）:

| 環境変数 | 既定値 | 用途 |
|---|---|---|
| `PUBLIC_CMS_API_ORIGIN` | `https://api.cms.sharedan.co.jp` | 別環境へ向ける（例 `http://localhost:8091`） |
| `PUBLIC_CMS_API_KEY` | `demo-cms-public-api-key-0001` | `X-API-KEY`（`m_tenants.api_key`） |
| `PUBLIC_CMS_SITE_CODE` | `demo-cms` | `X-SITE-CODE`（`m_sites.code`） |

```sh
# 例: ローカルCMS（apps/backend, Docker WEB_PORT）のコンテンツでビルドする
PUBLIC_CMS_API_ORIGIN=http://localhost:8091 npm run build
```

**実行時**（`public/js/cms.js` のメンテ確認・フォーム送信）の接続先は、`src/pages/index.astro`
末尾の `window.SHAREDAN_CMS`（`origin`/`apiKey`/`siteCode`）で指定する。`origin: null` は自動判定
（localhost→`http://localhost:8091` / それ以外→公開API）。さくら等の静的ホストから**別オリジンの
実CMS**へ繋ぐ場合は `origin` にCMSのURLを指定する（CMS側でCORS許可が必要）。

### 参照データ（シード）

`demo-cms` テナント／サイトと、上記セクションのコンテンツは backend のシーダーが投入する:

- シーダー: `apps/backend/laravel/database/seeders/Init/DemoCmsSeeder.php`
- `make init` / `make fresh`（`InitSeeder` 経由）でマスタと一緒に自動投入される（冪等）。
- 単体投入: `docker compose exec web php artisan db:seed --class="Database\Seeders\Init\DemoCmsSeeder"`
- このシーダーは多言語オプション（対象言語 en／zh-Hant）とパスワード保護ゲートを有効化し、閲覧パスワード付きの
  お知らせ（slug `mp-850-spec-partners`・パスワード `demo2026`）を1件投入する。言語別コンテンツは自動翻訳
  （Amazon Translate・FUN-034）で生成されるため、翻訳が未生成の環境では原文（日本語）にフォールバックする。

お問い合わせフォームは Cloudflare Turnstile の**公式テストキー**（常に成功）＋送信速度・ハニーポット・
レートリミットで保護され、どの環境でも送信が通る。本番鍵に差し替える場合は管理画面のフォーム編集から設定する。

## 多言語対応（9.10）・簡易認証（SCR-104）

デザイン「サンプルサイト 多言語・簡易認証.dc.html」を反映した 2 機能。

### 多言語対応（言語別の静的ビルド）

- 対応言語は `src/lib/i18n.mjs` の `LOCALES`（既定: 日本語 `ja`＝原文／英語 `en`／繁体字中国語 `zh-Hant`）。
  言語切替は **ビルド時に言語別の静的ページ**（`/`＝ja・`/en/`・`/zh-Hant/`）を生成し、ヘッダーの
  言語スイッチャー（`LangSwitcher`）からの **ページ遷移**（`<a>` リンク）で行う＝実行時の再取得なし。
- API駆動のコンテンツ（投稿・FAQ・代表メッセージ・製品）は公開APIの `?locale=` 付き取得で言語別に焼き込む。
  API化していないサイト定型文言（ナビ・ヒーロー・会社概要・導入事例・フォーム・フッター等）は
  `i18n.mjs` の翻訳辞書で言語別に描画する（デモバー／計測バーは ShareDan のデモ用オーバーレイのため日本語固定）。
- **graceful degradation**: ビルド時にテナントの多言語設定を公開APIへ問い合わせ、実際に有効な言語だけ生成する
  （`resolveAvailableLocales`）。多言語オプションが無効／未対応の言語は自動的に外れ、日本語のみのサイトとして成立する。
- 指定言語の訳が未生成で原文（日本語）を表示している記事には、本文冒頭に「原文表示中」の注記を出す
  （公開APIの `translation_available:false`・要件「未入力言語公開＝原文」）。繁体字ページは中国語フォント
  （Noto Sans/Serif TC）で表示する。

### 簡易認証（投稿のパスワード保護）

- お知らせ一覧では、保護投稿（公開APIの `is_password_protected:true`）に「要パスワード」タグ（鍵アイコン）を表示する。
- 保護投稿の詳細は、公開API個別取得で本文が `null` で返るため **パスワードゲート** を描画する（`post-article.mjs`）。
  閲覧者がパスワードを入力すると、実行時（`js/cms.js`）に `cms.posts.unlock('news', slug, password)`
  （`POST /api/v1/posts/news/{slug}/unlock`）で本文を取得してゲートを本文へ差し替える。
  パスワード誤り=401・試行超過=429 はゲート内にメッセージ表示する。unlock の本文は原文で返るため、
  非原文ページでは「原文表示中」の注記を添える。
- デモ体験用に、ゲートにはデモ用パスワード（`demo2026`・`DemoCmsSeeder` と一致）を表示する。
- 実行時の unlock／フォーム送信／メンテナンス取得は、鍵を秘匿するため同一オリジンの中継プロキシ
  `public/api/cms-proxy.php` 経由で行う（`/unlock` の許可とクエリ（`?locale=`）透過を含む）。

### SDK バージョンについて

- **ビルド時**（`npm ci` → `astro build`）は npm 公開版 `@sharedan/cms-sdk`（`package.json` の `^0.7.0`）を使う。
  `locale` 引数対応（型付き `{locale}`）の型付きリソースメソッドで取得する
  （`cms.posts.list(type, { locale })`／`cms.posts.get(type, slug, { locale })`／`cms.faqs.list({ locale })`／
  `cms.contents.get(key, { locale })`）。`locale` が null／未指定のときは原文（日本語）を返す。
- **実行時**は esm.sh の `@sharedan/cms-sdk@0.7.0` を読み込み、フォーム（`cms.forms.get('contact', { locale })`）・
  メンテナンス（`cms.maintenance.get({ locale })`）・unlock（`cms.posts.unlock('news', slug, password)`）を型付きで呼ぶ。
- **前提**: `{locale}` 対応は 0.7.0 以降。ビルド時 `npm ci` も実行時 esm.sh も **npm に 0.7.0 が公開されていること**が必要。
  未公開だと `npm ci`（`deploy-samples`）および esm.sh の読み込みが失敗する。

## 投稿詳細ページとプレビュー（プレビュー機能 REQ-021 / FUN-027・028）

投稿（既定種別 お知らせ）は一覧（トップの `#news`）に加えて、**詳細ページ**と、その詳細ページと
同じ見た目で未公開の下書きを確認する**プレビューページ**を持つ。記事本体のマークアップは
`src/lib/post-article.mjs`（`renderPostArticle`）に集約し、公開版とプレビュー版で
**完全に同一**にしている（プレビュー要件 §10/§12 の「同じViewで表示」）。

| ページ | ファイル | データ源 | 取得タイミング |
|---|---|---|---|
| 投稿詳細（公開版） | `src/pages/posts/news/[slug].astro` | `GET /api/v1/posts/news/{slug}`（公開版 `t_posts`） | **ビルド時**（SSG。全slugを列挙して焼き込む） |
| 投稿プレビュー（下書き版） | `src/pages/preview/posts/news/index.astro` | `cms.posts.getPreview('news', slug, token)` ＝ `GET /api/v1/posts/news/{slug}/preview`（下書き版 `t_post_drafts`） | **実行時**（ブラウザでSDK取得。トークンは実行時にしか決まらない） |

- トップの投稿一覧の各項目は `/posts/news/{slug}/` の詳細ページへリンクする。
- プレビューは**静的ホスティング**（さくら・`output:'static'`）に適合させるため、**slug も token もクエリ**で受け、
  ブラウザ側で `cms.posts.getPreview('news', slug, token)`（`X-PREVIEW-TOKEN` ヘッダ）を叩いて描画する。
  トークン不正・期限切れ・失効・不存在はいずれも **404**（存在秘匿・SDKの `isNotFound`）で、要件 §13 の案内文を表示する。
  プレビューページは `noindex,nofollow`（要件 §8）で、解析タグ（GTM）は載せない（要件 §7.4）。

### CMS に設定するプレビューURL（種別ごと・`m_post_types.preview_url`）

サイト設定（SCR-120）の「プレビューURL（投稿）」で、投稿の**種別ごと**に次のテンプレートを設定する
（`{SLUG}` / `{PREVIEW_TOKEN}` は CMS がプレビュー実行時に置換する。
このデモは既定種別「お知らせ」（`news`）に設定し、パスに `posts/news` を固定する）:

```text
https://demo-cms.sharedan.biz/preview/posts/news/?slug={SLUG}&token={PREVIEW_TOKEN}
```

> **なぜパスではなくクエリか**: 静的ビルドでは未公開の新規投稿（まだ公開一覧に出ない slug）の
> 詳細HTMLを事前生成できない。プレビューは単一ページ `/preview/posts/news/` が任意 slug をクエリで受けて
> クライアント側で取得するため、サーバ側 rewrite 無しのさくら静的配信でも成立する。
> このテンプレートは HTTPS・`{SLUG}`・`{PREVIEW_TOKEN}` を含み許可外プレースホルダを持たないため、
> backend のプレビューURLテンプレート保存時バリデーション（SCR-120）を通る。

### 実機確認（プレビュー）

プレビューの成功表示にはライブ backend と実トークンが必要:

```sh
# 1) ローカル backend を起動し、demo-cms シードを投入（apps/backend）
# 2) 編集中投稿に対しプレビュー用トークンを発行（テナントAPI）:
#      POST /api/tenant/v1/posts/news/{id}/preview-token → { token: "pv_...", ... }
# 3) 静的サイトをビルド＆配信し、次を開く（origin は window.SHAREDAN_CMS で自動判定）:
#      http://localhost:4321/preview/posts/news/?slug=<slug>&token=<pv_...>
PUBLIC_CMS_API_ORIGIN=http://localhost:8091 npm run build && npm run preview
```

> 公開APIキー（`X-API-KEY`）はクライアントに露出するが、公開API仕様上そもそも閲覧専用で許容
> （トップの `window.SHAREDAN_CMS` と同じ）。プレビューの秘匿性はキーではなく**ワンタイムの
> プレビュートークン**（`pv_...`・24時間・失効可）に依存する。
>
> プレビューページは SDK `@sharedan/cms-sdk`（`npm ci` の node_modules・`^0.7.0`）の
> `cms.posts.getPreview('news', slug, token)` で取得する（Astro/Vite がバンドルする）。

## 比較先サイトへのリンク（後から差し替え）

デモバーの「簡易CMS / WordPress」切替は、**相手サイトのURLが設定されていれば実際にそのサイトへ遷移**する。
未設定（空）なら遷移せず、見た目の切替のみ（ローカル確認用のフォールバック）。

`src/pages/index.astro` 末尾の以下のブロックを、公開先のURLに差し替える:

```html
<script>
  window.SAMPLE_URLS = {
    cms: '', // 簡易CMS（この静的サイト）側のURL 例: 'https://fast.example.com/'
    wp: '',  // WordPress 側のURL              例: 'https://wp.example.com/'
  }
</script>
```

自分自身のモード（この静的版は `cms`）を押しても遷移しない。相手モード（`wp`）を押したときだけ、
設定済みの `wp` のURLへ遷移する。

## 自動デプロイ（Astro → さくらのレンタルサーバ）

このサイトを Astro でビルドし、GitHub Actions からさくらのレンタルサーバへ FTPS で自動デプロイする
構成（CMS の GitHub Actions 連携が `workflow_dispatch` で起動）について、手順・必要シークレット・
CMS連携の設定は [DEPLOY.md](DEPLOY.md) を参照。ワークフロー本体は `.github/workflows/deploy-samples.yml`。
