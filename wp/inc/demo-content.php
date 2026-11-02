<?php
/**
 * デモコンテンツ投入スクリプト。
 *
 * テーマ有効化時（after_switch_theme）に、デザイン「サンプルサイト.dc.html」と
 * 同一の内容をカスタム投稿タイプ（DB）へ一度だけ投入する。これにより、
 * WordPress 側が「テーマ描画＋DBクエリ」で実際にコンテンツを描画する状態になり、
 * ヘッドレス ShareDan CMS（静的配信）との速度比較が妥当になる。
 *
 * - 冪等: post_name / term slug で重複を避ける。オプション demo_seeded に
 *   バージョンを記録し、同一バージョンなら再投入しない。
 * - 再投入したい場合: 管理画面「ツール > DEMOサンプル」から実行できる。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

define('DEMO_SEED_VERSION', '3');

/**
 * テーマ有効化時に投入する。
 */
add_action('after_switch_theme', 'demo_seed_demo_content');

function demo_seed_demo_content() {
    if (get_option('demo_seeded') === DEMO_SEED_VERSION) {
        return;
    }

    demo_seed_terms();
    demo_seed_news();
    demo_seed_faq();
    demo_seed_works();
    demo_seed_contents();
    demo_seed_products();

    // お問い合わせフォームは Contact Form 7 前提。CF7 が有効なら専用フォームを一度だけ作成する。
    demo_ensure_cf7_form();

    // CPT のパーマリンクを有効化するためリライトルールを再生成する
    flush_rewrite_rules();

    update_option('demo_seeded', DEMO_SEED_VERSION);
}

/**
 * ターム（slug指定・冪等）を用意して term_id を返す。
 */
function demo_ensure_term($taxonomy, $slug, $name) {
    $term = get_term_by('slug', $slug, $taxonomy);
    if ($term) {
        return (int) $term->term_id;
    }
    $res = wp_insert_term($name, $taxonomy, ['slug' => $slug]);
    return is_wp_error($res) ? 0 : (int) $res['term_id'];
}

/**
 * 投稿を冪等に作成し、投稿IDを返す（同一 post_name が既にあれば作らない）。
 *
 * @param string $type カスタム投稿タイプ
 * @param string $slug post_name
 * @param array  $args wp_insert_post 追加引数
 * @return int 投稿ID（失敗時0）
 */
function demo_insert_post($type, $slug, array $args) {
    $existing = get_posts([
        'post_type'      => $type,
        'name'           => $slug,
        'post_status'    => 'any',
        'posts_per_page' => 1,
        'fields'         => 'ids',
    ]);
    if (! empty($existing)) {
        return (int) $existing[0];
    }
    $id = wp_insert_post(array_merge([
        'post_type'   => $type,
        'post_name'   => $slug,
        'post_status' => 'publish',
    ], $args));
    return is_wp_error($id) ? 0 : (int) $id;
}

/** カテゴリ（お知らせ・FAQ）を投入。 */
function demo_seed_terms() {
    foreach ([
        ['info', 'お知らせ'], ['product', '製品情報'], ['event', 'イベント'], ['press', 'プレスリリース'],
    ] as $t) {
        demo_ensure_term('news_cat', $t[0], $t[1]);
    }
    foreach ([
        ['product', '製品について'], ['quote', 'お見積り・納期'], ['support', 'アフターサポート'], ['other', 'その他'],
    ] as $t) {
        demo_ensure_term('faq_cat', $t[0], $t[1]);
    }
}

/**
 * お知らせを投入。
 * 表示日付は _news_date（'YYYY.MM.DD'）に保持し、並び順は menu_order で固定する
 * （post_date に依存しないため、実行時のサーバ日付で公開状態が変わらない）。
 */
function demo_seed_news() {
    $items = [
        ['news-mtech-2026',      '2026.07.15', 'event',   '「機械要素技術展 M-Tech 2026」出展のご案内'],
        ['news-mp-850',          '2026.07.10', 'product', '新型精密プレス機「MP-850」を発売しました'],
        ['news-recruit-renewal', '2026.06.24', 'info',    '採用サイトをリニューアルしました'],
        ['news-hq-expansion',    '2026.06.02', 'press',   '本社工場の設備増強について'],
        ['news-micro-series',    '2026.05.18', 'product', '微細加工向け新シリーズの受注を開始しました'],
        ['news-gw-2026',         '2026.04.20', 'info',    'ゴールデンウィーク期間の営業について'],
    ];
    $order = 1;
    foreach ($items as $it) {
        $id = demo_insert_post('news', $it[0], [
            'post_title' => $it[3],
            'menu_order' => $order++,
        ]);
        if ($id) {
            update_post_meta($id, '_news_date', $it[1]);
            wp_set_object_terms($id, [$it[2]], 'news_cat');
        }
    }
}

/** FAQ（タイトル=質問、本文=回答）を投入。並び順は menu_order で固定。 */
function demo_seed_faq() {
    $items = [
        ['faq-estimate', 'quote',   '見積もりの依頼方法を教えてください', 'お問い合わせフォームまたはお電話で承ります。図面をお持ちの場合はフォームから添付いただくと、より正確なお見積りが可能です。通常2営業日以内にご返答いたします。'],
        ['faq-material', 'product', '対応可能な材質を教えてください', 'ステンレス・アルミ・銅合金・各種特殊鋼に対応しています。難削材や複合材のご相談も承りますので、まずは図面をお送りください。'],
        ['faq-leadtime', 'quote',   '納期はどのくらいかかりますか', '試作品は図面確定から2〜3週間、量産品は仕様と数量により1〜2か月が目安です。お急ぎの場合は個別にご相談ください。'],
        ['faq-smalllot', 'product', '小ロット（1個から）の依頼は可能ですか', '試作・少量生産にも対応しています。量産化を見据えた工程設計もあわせてご提案いたします。'],
        ['faq-support',  'support', '保守部品の供給期間はどのくらいですか', '標準製品については、製造終了後10年間の保守部品供給を保証しております。特注品については、納入時の仕様書に記載の供給期間をご確認ください。'],
        ['faq-visit',    'other',   '工場見学は可能ですか', '事前予約制で承っております。お問い合わせフォームより、ご希望日と人数をお知らせください。'],
    ];
    $order = 1;
    foreach ($items as $it) {
        $id = demo_insert_post('faq', $it[0], [
            'post_title'   => $it[2],
            'post_content' => $it[3],
            'menu_order'   => $order++,
        ]);
        if ($id) {
            wp_set_object_terms($id, [$it[1]], 'faq_cat');
        }
    }
}

/** 導入事例を投入（カテゴリ表記は _works_cat メタ、説明は本文）。 */
function demo_seed_works() {
    $items = [
        ['works-ev-terminal', '自動車部品', 'EV向け精密端子の量産化を実現', '±5μmの公差要求に対し、専用金型と検査工程の内製化で歩留まり99.6%を達成しました。'],
        ['works-endoscope',   '医療機器',   '内視鏡用微細部品の試作から量産まで', '短納期の試作要求に対応し、設計段階からの並走で開発期間を40%短縮しました。'],
        ['works-heat-plate',  '電機・電子', '高放熱プレート、月産20万枚体制へ', '設備増強と自動搬送ラインの導入で、需要増に応える供給体制を構築しました。'],
    ];
    $order = 1;
    foreach ($items as $it) {
        $id = demo_insert_post('works', $it[0], [
            'post_title'   => $it[2],
            'post_content' => $it[3],
            'menu_order'   => $order++,
        ]);
        if ($id) {
            update_post_meta($id, '_works_cat', $it[1]);
        }
    }
}

/** 固定コンテンツ（代表メッセージ・会社概要）を投入。 */
function demo_seed_contents() {
    // 代表メッセージ
    $msg_id = demo_insert_post('content', 'top-message', [
        'post_title'   => '代表メッセージ',
        'post_content' => "<p>DEMO株式会社は、1974年の創業以来、精密プレス加工ひと筋に技術を磨いてまいりました。ミクロン単位の精度が求められる自動車部品から、医療機器の微細部品まで、私たちの技術は幅広い分野で活躍しています。</p>\n<p>近年、製造業を取り巻く環境は大きく変化しています。私たちはこの変化を好機と捉え、設備投資と人材育成の両輪で、より高度なものづくりに挑戦し続けます。</p>",
    ]);
    if ($msg_id) {
        update_post_meta($msg_id, '_heading_line1', '変化を好機に、');
        update_post_meta($msg_id, '_heading_line2', 'より高度なものづくりへ。');
        update_post_meta($msg_id, '_rep_role', '代表取締役社長');
        update_post_meta($msg_id, '_rep_name', '湊 宏一郎');
    }

    // 会社概要（項目リスト）
    $company_id = demo_insert_post('content', 'company-profile', [
        'post_title' => '会社概要',
    ]);
    if ($company_id) {
        update_post_meta($company_id, '_rows', [
            ['label' => '会社名',     'value' => 'DEMO株式会社'],
            ['label' => '設立',       'value' => '1974年4月'],
            ['label' => '代表者',     'value' => '代表取締役社長　湊 宏一郎'],
            ['label' => '所在地',     'value' => '〒146-0093　東京都大田区矢口3-12-8<br><small>第二工場：埼玉県川口市領家5-2-14</small>'],
            ['label' => '従業員数',   'value' => '86名（2026年4月現在）'],
            ['label' => '事業内容',   'value' => '精密プレス加工／金型設計・製作／微細部品の試作・量産'],
            ['label' => '主要取引先', 'value' => '自動車部品メーカー、医療機器メーカー、電機メーカー各社'],
        ]);
    }

}

/**
 * 製品ラインアップ（product CPT）を投入。デザインの products（横スライド）に対応する。
 * タイトル=製品名、本文=説明。型番・分類・仕様・新着フラグはメタ。並び順は menu_order で固定。
 */
function demo_seed_products() {
    // [slug, 型番, 分類, 製品名, 説明, 仕様項目, 仕様値, 新着(空でなければNEW)]
    $items = [
        ['product-mp-850', 'MP-850', 'プレス機', '精密プレス機 MP-850', '最大加圧力850kN。サーボ制御で薄板の高精度成形に対応します。', '最大加圧力', '850 kN', '1'],
        ['product-mp-500', 'MP-500', 'プレス機', '精密プレス機 MP-500', '中量生産向けの標準機。段取り替えの短縮機構を標準装備。', '最大加圧力', '500 kN', ''],
        ['product-ds-24', 'DS-24', '金型', '順送金型 DSシリーズ', '多工程を一体化した順送型。摩耗部のみの交換で長期運用が可能です。', '対応板厚', '0.1–2.0 mm', ''],
        ['product-mt-07', 'MT-07', '微細部品', '微細端子 MTシリーズ', '医療機器・コネクタ向けの微細プレス部品。公差±5μmで量産します。', '公差', '± 5 μm', '1'],
        ['product-hp-32', 'HP-32', '放熱部品', '高放熱プレート HP-32', 'アルミ／銅合金の薄板成形。パワー半導体の放熱設計に対応。', '板厚', '0.3–1.2 mm', ''],
        ['product-in-90', 'IN-90', '検査', '画像検査ユニット IN-90', 'インライン全数検査。寸法と外観を同一工程で判定します。', '検査速度', '90 個/分', ''],
    ];
    $order = 1;
    foreach ($items as $it) {
        $id = demo_insert_post('product', $it[0], [
            'post_title'   => $it[3],
            'post_content' => $it[4],
            'menu_order'   => $order++,
        ]);
        if ($id) {
            update_post_meta($id, '_code', $it[1]);
            update_post_meta($id, '_tag', $it[2]);
            update_post_meta($id, '_spec_label', $it[5]);
            update_post_meta($id, '_spec', $it[6]);
            update_post_meta($id, '_is_new', $it[7]);
        }
    }
}

/* =========================================================================
 * お問い合わせフォーム（Contact Form 7 前提）
 * -------------------------------------------------------------------------
 * WordPress でのフォームは Contact Form 7（CF7）で実装する前提とする。CF7 が
 * 有効なら、デザインに合わせたマークアップの専用フォームを一度だけ作成し、
 * その投稿IDを demo_cf7_form_id に記録する。テンプレート（section-contact.php）は
 * このIDのショートコードを描画する。CF7 未有効時はデザイン再現の静的フォームに
 * フォールバックする。
 *
 * 作成タイミングはテーマ有効化時（demo_seed_demo_content）と管理画面アクセス時
 * （admin_init）の両方。どちらの順（テーマ→CF7 / CF7→テーマ）でも一度だけ作成される。
 * ========================================================================= */
add_action('admin_init', 'demo_ensure_cf7_form');

/**
 * Contact Form 7 の専用フォームを（未作成なら）作成する。冪等。
 */
function demo_ensure_cf7_form() {
    if (! class_exists('WPCF7_ContactForm')) {
        return; // Contact Form 7 が未有効
    }
    if (get_option('demo_cf7_form_id')) {
        return; // 作成済み
    }

    $form = WPCF7_ContactForm::get_template(['title' => 'DEMO お問い合わせ']);
    $props = $form->get_properties();

    $props['form'] = demo_cf7_form_template();
    // 送信通知メール（サイト管理者宛）。項目名は form テンプレートの CF7 タグ名に対応。
    $props['mail'] = array_merge((array) $props['mail'], [
        'subject' => '[_site_title] お問い合わせ',
        'body'    => "お問い合わせを受け付けました。\n\n"
            . "会社名: [your-company]\n"
            . "お名前: [your-name]\n"
            . "メールアドレス: [your-email]\n"
            . "電話番号: [your-tel]\n"
            . "お問い合わせ種別: [inquiry-type]\n\n"
            . "お問い合わせ内容:\n[your-message]\n\n"
            . "-- \n[_site_title] ([_site_url])",
    ]);

    $form->set_properties($props);
    $form->save();

    update_option('demo_cf7_form_id', (int) $form->id());
}

/**
 * CF7 フォームテンプレート（デザインのマークアップ＋CF7フォームタグ）を返す。
 * デザインのクラス（field / form-row2 / consent 等）で囲み、CSS を再現する。
 *
 * @return string
 */
function demo_cf7_form_template() {
    return <<<'CF7'
<div class="form cf7-form">
  <div class="form-row2">
    <div class="field">
      <label>会社名 <span class="req">*</span></label>
      [text* your-company placeholder "株式会社ヤマト電子"]
    </div>
    <div class="field">
      <label>お名前 <span class="req">*</span></label>
      [text* your-name placeholder "大西 亮"]
    </div>
  </div>
  <div class="form-row2">
    <div class="field">
      <label>メールアドレス <span class="req">*</span></label>
      [email* your-email placeholder "onishi@example.co.jp"]
    </div>
    <div class="field">
      <label>電話番号</label>
      [tel your-tel placeholder "03-5555-0182"]
    </div>
  </div>
  <div class="field">
    <label>お問い合わせ種別 <span class="req">*</span></label>
    [select* inquiry-type include_blank "お見積り" "技術相談" "採用について" "その他"]
  </div>
  <div class="field">
    <label>お問い合わせ内容 <span class="req">*</span></label>
    [textarea* your-message placeholder "ご相談内容をご記入ください。図面がある場合は下記より添付いただけます。"]
  </div>
  <div class="field">
    <label>図面・仕様書の添付</label>
    [file your-file limit:10mb filetypes:pdf|jpg|jpeg|png]
    <div class="field-hint">PDF / JPG / PNG・1件10MBまで</div>
  </div>
  <label class="consent">
    [acceptance acceptance-1] 個人情報の取り扱いに同意します [/acceptance]
  </label>
  [submit class:form-submit "送信する"]
</div>
CF7;
}

/**
 * 手動での再投入用（管理画面「ツール > DEMOサンプル」）。
 * 開発時に投入内容をやり直したいときに使う。
 */
add_action('admin_menu', function () {
    add_management_page('DEMOサンプル', 'DEMOサンプル', 'manage_options', 'demo-seed', 'demo_seed_admin_page');
});

function demo_seed_admin_page() {
    if (! current_user_can('manage_options')) {
        return;
    }
    if (isset($_POST['demo_reseed']) && check_admin_referer('demo_reseed')) {
        delete_option('demo_seeded');
        demo_seed_demo_content();
        echo '<div class="notice notice-success"><p>デモコンテンツを投入しました。</p></div>';
    }
    echo '<div class="wrap"><h1>DEMOサンプル</h1>';
    echo '<p>デザイン「サンプルサイト」と同一のデモコンテンツ（お知らせ・FAQ・導入事例・固定コンテンツ）を投入します。既存分は重複しません。</p>';
    echo '<form method="post">';
    wp_nonce_field('demo_reseed');
    echo '<p><button type="submit" name="demo_reseed" value="1" class="button button-primary">デモコンテンツを投入 / 再投入</button></p>';
    echo '</form></div>';
}
