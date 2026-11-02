<?php
/**
 * DEMOサンプル（ShareDan 速度比較用）テーマ関数
 *
 * ヘッドレス ShareDan CMS（静的配信）との速度比較用に、あえて WordPress の
 * 「テーマ描画＋DBクエリ」で同一デザインを描画するサンプルテーマ。
 *
 * - お知らせ / FAQ / 導入事例 … カスタム投稿タイプ（DB）を WP_Query で描画
 * - 代表メッセージ / 会社概要   … 固定コンテンツ（content 投稿タイプ）から取得
 * - デザイン・CSS・JS は静的HTML版（apps/samples/demo01）と同一のものを共有
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

define('DEMO_VERSION', '1.0.0');

require get_template_directory() . '/inc/cpt.php';
require get_template_directory() . '/inc/demo-content.php';

/**
 * テーマの基本設定。
 */
add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('automatic-feed-links');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);
});

/**
 * スタイル・スクリプトの読み込み。
 * CSS / JS は静的HTML版と同一ファイル（assets/以下）を使い、デザインを完全一致させる。
 */
add_action('wp_enqueue_scripts', function () {
    // Google Fonts（デザイン指定: Noto Sans JP / Noto Serif JP / JetBrains Mono）
    wp_enqueue_style(
        'demo-fonts',
        'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;900&family=Noto+Serif+JP:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap',
        [],
        null
    );

    // 共通デザインCSS（apps/samples/demo01/css/style.css と同一）
    wp_enqueue_style(
        'demo-theme',
        get_theme_file_uri('assets/css/theme.css'),
        ['demo-fonts'],
        DEMO_VERSION
    );

    // テーマヘッダー用の style.css（WordPress の作法として読み込む）
    wp_enqueue_style('demo-style', get_stylesheet_uri(), ['demo-theme'], DEMO_VERSION);

    // 共通インタラクション（apps/samples/demo01/js/main.js と同一）
    wp_enqueue_script(
        'demo-main',
        get_theme_file_uri('assets/js/main.js'),
        [],
        DEMO_VERSION,
        true
    );

    // 比較先サイトのURLを main.js の直前に出力する（モード切替ボタンの遷移先）。
    // 未設定（空）なら遷移せず見た目の切替のみ。差し替え方法は demo_sample_urls() を参照。
    wp_add_inline_script(
        'demo-main',
        'window.SAMPLE_URLS = ' . wp_json_encode(demo_sample_urls()) . ';',
        'before'
    );
}, 20);

/**
 * 比較先サイト（ShareDan CMS版 / WordPress版）のURLを返す。
 *
 * 後から差し替える方法（いずれか）:
 *   1. wp-config.php に定数を定義:
 *        define('DEMO_CMS_URL', 'https://fast.example.com/');
 *        define('DEMO_WP_URL',  'https://wp.example.com/');
 *   2. フィルタで上書き:
 *        add_filter('demo_sample_urls', fn($u) => ['cms' => '...', 'wp' => '...']);
 *   3. 下記の既定値を直接編集。
 *
 * @return array{cms:string,wp:string}
 */
function demo_sample_urls() {
    $defaults = [
        'cms' => defined('DEMO_CMS_URL') ? DEMO_CMS_URL : 'https://demo-cms.sharedan.biz/',
        'wp'  => defined('DEMO_WP_URL') ? DEMO_WP_URL : 'https://demo-wp.sharedan.biz/',
    ];

    /**
     * @param array{cms:string,wp:string} $defaults
     */
    return apply_filters('demo_sample_urls', $defaults);
}

/**
 * お知らせカテゴリの slug からチップ表示（CSS修飾クラス）を返す。
 * デザインのカテゴリ配色に対応。
 *
 * @param string $slug news_cat のスラッグ
 * @return string チップ用のCSS修飾クラス
 */
function demo_news_chip_class($slug) {
    $map = [
        'event'   => 'chip--event',
        'product' => 'chip--product',
        'info'    => 'chip--info',
        'press'   => 'chip--press',
    ];
    return isset($map[$slug]) ? $map[$slug] : 'chip--info';
}

/**
 * 投稿に紐づく最初のタームを返す（無ければ null）。
 *
 * @param int    $post_id  投稿ID
 * @param string $taxonomy タクソノミー名
 * @return WP_Term|null
 */
function demo_first_term($post_id, $taxonomy) {
    $terms = get_the_terms($post_id, $taxonomy);
    if (is_wp_error($terms) || empty($terms)) {
        return null;
    }
    return $terms[0];
}
