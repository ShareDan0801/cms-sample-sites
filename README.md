<!-- このバナーは mirror-samples.yml が同期時に README の先頭へ自動付与します（モノレポ側には残りません）。 -->
> ℹ️ **このリポジトリは読み取り専用のミラーです。**
> ソースは ShareDan 簡易CMS のモノレポ（`apps/samples`）にあり、`main` へのマージ時に自動同期されます。
> コードの修正提案は上流（モノレポ）へ、不具合・質問は本リポジトリの Issue へお願いします。
> ライセンスは [MIT](./LICENSE)。これは公開API（IF-001）と `@sharedan/cms-sdk` の **利用サンプル** です。

---

# ShareDan 簡易CMS サンプルサイト集

ShareDan 簡易CMS（ヘッドレス）の**公開API** と **`@sharedan/cms-sdk`** を使って、
実際のWebサイトをどう構築するかを示す参考用サンプル集。

今後、CMS を適用したサンプルを順次追加していく。

## サンプル一覧

```
.
├── demo01/ … 静的HTML版（ヘッドレス）。Astro + @sharedan/cms-sdk で公開APIからビルド時にコンテンツ取得。
│             ※ wp/ との表示速度を同一デザインで比較する目的で作成したサイト。
└── wp/     … WordPress テーマ版（テーマ描画＋DBクエリ）。
              ※ demo01 との表示速度を同一デザインで比較するための対照サイト。
```

| ディレクトリ | 実装 | ShareDan 簡易CMS 連携 |
|---|---|---|
| demo01 | Astro（静的HTML/CSS/JS） | 公開API + `@sharedan/cms-sdk`（ビルド時SSG＋一部実行時） |
| wp | WordPress テーマ（PHP + DB） | なし（速度比較の対照版） |

各サンプルの詳細・セットアップは、それぞれの README を参照:

- [demo01/README.md](demo01/README.md)
- [wp/README.md](wp/README.md)

## demo01 と wp について（速度比較の経緯）

`demo01` と `wp` は、**ヘッドレス簡易CMS（静的配信）と WordPress（PHP＋DBクエリ）の
表示速度を、同一デザインで比較する**目的で作成したペア。

- ページ内容は架空の製造業「DEMO株式会社」のコーポレートサイト
  （お知らせ・FAQ・導入事例・会社概要・代表メッセージ・お問い合わせフォーム）。
- **同一のデザイン・CSS・JS** を両版で共有している
  （`demo01/public/css/style.css` ≒ `wp/assets/css/theme.css`、
  `demo01/public/js/main.js` ≒ `wp/assets/js/main.js` は同一内容）。
- 上部の**デモバー**で「簡易CMS / WordPress」を切り替え、「計測を表示」で
  速度比較バーと各セクションのAPI計測パネルを表示できる（数値は説明用の固定値）。
- 実際の速度計測は、両サイトを配信して計測ツール（Lighthouse / WebPageTest 等）で
  それぞれのページ読み込み時間を比較する想定。

### 2サイトの相互リンク（後から差し替え）

デモバーの「簡易CMS / WordPress」切替は、相手サイトのURLを設定すると**実際に相手サイトへ遷移**する
（未設定なら見た目の切替のみ）。公開先のドメインが決まったら設定する:

- 静的版: `demo01/src/pages/index.astro` 末尾の `window.SAMPLE_URLS`（Astro化済み。ビルドは `demo01/` で `npm run build`）
- WordPress版: `wp/functions.php` の `demo_sample_urls()`（wp-config定数 / フィルタ / 既定値編集）
