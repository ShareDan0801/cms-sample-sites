<!-- このバナーは mirror-samples.yml が同期時に README の先頭へ自動付与します（モノレポ側には残りません）。 -->
> ℹ️ **このリポジトリは読み取り専用のミラーです。**
> ソースは ShareDan 簡易CMS のモノレポ（`apps/samples`）にあり、`main` へのマージ時に自動同期されます。
> コードの修正提案は上流（モノレポ）へ、不具合・質問は本リポジトリの Issue へお願いします。
> ライセンスは [MIT](./LICENSE)。これは公開API（IF-001）と `@sharedan/cms-sdk` の **利用サンプル** です。

---

# サンプルサイト（apps/samples）— 速度比較用

ShareDan 簡易CMS（ヘッドレス・静的配信）と WordPress（PHP＋DBクエリ）の
**表示速度を、同一デザインで比較する**ためのサンプルサイト。

デザイン「サンプルサイト.dc.html」（Claude Design）を、コンテンツの取得方法だけを
入れ替えた 2 つの実装で用意している。

```
apps/samples/
├── demo01/ … 静的HTML版（ヘッドレス簡易CMS相当・素のHTML/CSS/JS）
└── wp/     … WordPress テーマ版（テーマ描画＋DBクエリ）
```

- **同一のデザイン・CSS・JS** を両版で共有している（`css/style.css` ≒ `wp/assets/css/theme.css`、
  `js/main.js` ≒ `wp/assets/js/main.js` は同一内容）。
- ページ内容は架空の製造業「DEMO株式会社」のコーポレートサイト。
  お知らせ・FAQ・導入事例・会社概要・代表メッセージ・お問い合わせフォームを含む。
- 上部の**デモバー**で「簡易CMS / WordPress」を切り替え、**「計測を表示」**で
  速度比較バーと各セクションのAPI計測パネルを表示できる（デザインの再現。数値は説明用）。

## 各版の位置づけ

| | apps/samples/demo01 | apps/samples/wp |
|---|---|---|
| 役割 | ヘッドレス配信側（速い）の見た目 | WordPress側（テーマ描画＋DBクエリ） |
| コンテンツ | HTMLに直接記述（静的） | カスタム投稿タイプ（DB）を WP_Query で描画 |
| 実行環境 | 任意の静的サーバ | WordPress 6.0+ / PHP 8.0+ |
| 既定モード表示 | 簡易CMS | WordPress |

実際の速度計測は、両サイトを配信して計測ツール（Lighthouse / WebPageTest 等）で
それぞれのページ読み込み時間を比較する想定。デモバーの数値は説明用の固定値。

## 2サイトの相互リンク（後から差し替え）

デモバーの「簡易CMS / WordPress」切替は、相手サイトのURLを設定すると**実際に相手サイトへ遷移**する
（未設定なら見た目の切替のみ）。公開先（例: さくらのレンタルサーバのサブドメイン）が決まったら設定する:

- 静的版: `demo01/src/pages/index.astro` 末尾の `window.SAMPLE_URLS`（Astro化済み。ビルドは `demo01/` で `npm run build`）
- WordPress版: `wp/functions.php` の `demo_sample_urls()`（wp-config定数 / フィルタ / 既定値編集）

各版のREADMEに手順あり。

詳細は各ディレクトリの README を参照:

- [apps/samples/demo01/README.md](demo01/README.md)
- [apps/samples/wp/README.md](wp/README.md)
