# サンプルサイト・WordPress テーマ版（apps/samples/wp）

デザイン「サンプルサイト.dc.html」を WordPress テーマとして実装したもの。
速度比較における WordPress 側（**テーマ描画＋DBクエリ**）にあたる。

お知らせ・FAQ・導入事例をカスタム投稿タイプ（DB）から `WP_Query` で描画し、
代表メッセージ・会社概要も固定コンテンツ（`content` 投稿タイプ）から取得する。
これにより「PHP＋DB」の実負荷を再現し、ヘッドレス簡易CMS（静的配信）との比較が妥当になる。

## 動作要件

- WordPress 6.0 以上
- PHP 8.0 以上
- **Contact Form 7**（お問い合わせフォーム用）… 有効化すると実送信できるフォームになる。
  未有効時はデザイン再現の静的フォーム（送信は完了表示のみ）にフォールバックする。

## インストール

1. この `wp/` ディレクトリを、WordPress の `wp-content/themes/` 配下に配置する
   （例: `wp-content/themes/demo/`）。
2. 管理画面「外観 > テーマ」から **「DEMOサンプル（ShareDan 速度比較用）」** を有効化する。
3. 有効化時に、デザインと同一のデモコンテンツが**自動投入**される（`after_switch_theme`）。
4. 「設定 > 表示設定」でホームページの表示を確認（`front-page.php` がトップに使われる）。

再投入したい場合は、管理画面 **「ツール > DEMOサンプル」** から手動で実行できる
（既存分は重複しない）。

### ローカルで手早く動かす

`wp-env`（@wordpress/env）を使うと WordPress を即席で起動できる。

```sh
# 例: このテーマを themes にマウントして起動
npx @wordpress/env start
# 起動後、wp-admin からテーマを有効化 → デモコンテンツが投入される
```

Local by Flywheel / Docker の WordPress 公式イメージなどでも同様に、
`wp-content/themes/` に置いて有効化するだけで動作する。

## 構成

```
wp/
├── style.css                      … テーマヘッダー定義
├── functions.php                  … テーマ設定・アセット読み込み・表示ヘルパー
├── header.php                     … デモバー・速度比較バー・サイトヘッダー
├── footer.php                     … フッター
├── front-page.php                 … トップページ（ヒーロー＋各セクション）
├── index.php                      … フォールバック
├── inc/
│   ├── cpt.php                    … カスタム投稿タイプ・タクソノミー登録
│   └── demo-content.php           … デモコンテンツ投入（有効化時／手動）
├── template-parts/
│   ├── section-message.php        … 代表メッセージ（content: top-message）
│   ├── section-company.php        … 会社概要（content: company-profile）
│   ├── section-news.php           … お知らせ（news + news_cat）
│   ├── section-works.php          … 導入事例（works）
│   ├── section-faq.php            … FAQ（faq + faq_cat）
│   └── section-contact.php        … お問い合わせ（Contact Form 7 のショートコード／未有効時は静的）
└── assets/
    ├── css/theme.css              … 共通デザインCSS（静的HTML版と同一）
    └── js/main.js                 … 共通インタラクション（静的HTML版と同一）
```

`assets/css/theme.css` と `assets/js/main.js` は静的HTML版（`apps/samples/demo01/`）と
**同一内容**。デザインを 1:1 で一致させるため共有している（更新時は両方を同期）。

## 投入されるコンテンツ

| 投稿タイプ | 内容 | 件数 | 分類 |
|---|---|---|---|
| `news`（お知らせ） | タイトル＋表示日（`_news_date`） | 6 | `news_cat`: お知らせ/製品情報/イベント/プレスリリース |
| `faq`（FAQ） | タイトル=質問、本文=回答 | 6 | `faq_cat`: 製品について/お見積り・納期/アフターサポート/その他 |
| `works`（導入事例） | タイトル＋説明、分類は `_works_cat` | 3 | — |
| `content`（固定） | `top-message`（代表メッセージ）/ `company-profile`（会社概要） | 2 | — |

一覧はデザインに合わせ `menu_order` で並び順を固定。カテゴリ絞り込みは静的HTML版と同様、
全件を描画したうえで `main.js`（`data-cat` の表示切替）で行う。

## 比較先サイトへのリンク（後から差し替え）

デモバーの「簡易CMS / WordPress」切替は、**相手サイトのURLが設定されていれば実際にそのサイトへ遷移**する
（未設定なら見た目の切替のみ）。URLは `functions.php` の `demo_sample_urls()` が返し、
`window.SAMPLE_URLS` として出力される。**main.js を編集せず**に、次のいずれかで後から設定できる:

```php
// 1. wp-config.php に定数を定義（最も手軽）
define('DEMO_CMS_URL', 'https://fast.example.com/');
define('DEMO_WP_URL',  'https://wp.example.com/');

// 2. フィルタで上書き（子テーマ・プラグイン等）
add_filter('demo_sample_urls', fn($u) => [
    'cms' => 'https://fast.example.com/',
    'wp'  => 'https://wp.example.com/',
]);
```

3. もしくは `functions.php` の `demo_sample_urls()` の既定値を直接編集。

このWordPress版自身のモード（`wp`）を押しても遷移しない。相手モード（`cms`）を押したときだけ遷移する。

## お問い合わせフォーム（Contact Form 7）

WordPress 側のフォームは **Contact Form 7（CF7）前提**。CF7 が有効なとき、
`inc/demo-content.php` の `demo_ensure_cf7_form()` がデザインに合わせたマークアップの
専用フォームを一度だけ作成し（投稿ID を `demo_cf7_form_id` オプションに記録）、
`section-contact.php` がそのショートコードを描画する。実際に PHP でメール送信・入力検証が
行われるため、「WordPress＝テーマ描画＋DB＋PHP処理」の速度・負荷を素直に再現できる。

- CF7 の作成タイミングはテーマ有効化時と管理画面アクセス時（`admin_init`）の両方。
  どちらの順（テーマ→CF7 / CF7→テーマ）でも一度だけ作成される。
- CF7 のコントロールをデザインに合わせるための最小限の補正CSSは `section-contact.php` に
  インラインで持たせている（共有 `assets/css/theme.css` は静的HTML版と byte 一致で保つため）。
- 送信先メールアドレスはサイトの管理者メール（`admin_email`）。宛先・自動返信は CF7 の
  「メール」タブから調整できる。Turnstile / reCAPTCHA を使う場合は CF7 のアドオン／設定で追加する。
- **CF7 未有効時**は、デザイン再現の静的フォームにフォールバック（送信は `main.js` の完了表示のみ）。

## 補足

- デモバーの「簡易CMS / WordPress」切替や速度比較の数値は、デザイン再現のための表示用。
  実際の速度計測は、配信した両サイトを計測ツールで比較する想定。
