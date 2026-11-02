<?php
/**
 * カスタム投稿タイプ・タクソノミーの登録。
 *
 * ヘッドレス ShareDan CMS の「お知らせ / FAQ / 導入事例 / 固定コンテンツ」を、
 * WordPress 側でも DB 駆動で再現するための投稿タイプ群。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

add_action('init', function () {

    // ---- お知らせ（news） ----
    register_post_type('news', [
        'label'        => 'お知らせ',
        'public'       => true,
        'has_archive'  => true,
        'menu_icon'    => 'dashicons-megaphone',
        'menu_position' => 5,
        'supports'     => ['title', 'editor', 'excerpt', 'page-attributes'],
        'rewrite'      => ['slug' => 'news'],
        'show_in_rest' => true,
    ]);
    register_taxonomy('news_cat', 'news', [
        'label'        => 'お知らせカテゴリ',
        'public'       => true,
        'hierarchical' => true,
        'show_in_rest' => true,
        'show_admin_column' => true,
        'rewrite'      => ['slug' => 'news-category'],
    ]);

    // ---- 導入事例（works） ----
    register_post_type('works', [
        'label'        => '導入事例',
        'public'       => true,
        'has_archive'  => true,
        'menu_icon'    => 'dashicons-portfolio',
        'menu_position' => 6,
        'supports'     => ['title', 'editor', 'thumbnail', 'page-attributes'],
        'rewrite'      => ['slug' => 'works'],
        'show_in_rest' => true,
    ]);

    // ---- FAQ（faq）：タイトル=質問、本文=回答 ----
    register_post_type('faq', [
        'label'        => 'FAQ',
        'public'       => true,
        'has_archive'  => false,
        'menu_icon'    => 'dashicons-editor-help',
        'menu_position' => 7,
        'supports'     => ['title', 'editor', 'page-attributes'],
        'rewrite'      => ['slug' => 'faq'],
        'show_in_rest' => true,
    ]);
    register_taxonomy('faq_cat', 'faq', [
        'label'        => 'FAQカテゴリ',
        'public'       => true,
        'hierarchical' => true,
        'show_in_rest' => true,
        'show_admin_column' => true,
        'rewrite'      => ['slug' => 'faq-category'],
    ]);

    // ---- 固定コンテンツ（content）：代表メッセージ・会社概要 ----
    register_post_type('content', [
        'label'        => '固定コンテンツ',
        'public'       => false,
        'show_ui'      => true,
        'menu_icon'    => 'dashicons-media-text',
        'menu_position' => 8,
        'supports'     => ['title', 'editor'],
        'show_in_rest' => true,
    ]);

    // ---- 製品ラインアップ（product）：型番・分類・仕様はメタ、説明は本文 ----
    register_post_type('product', [
        'label'        => '製品',
        'public'       => true,
        'has_archive'  => true,
        'menu_icon'    => 'dashicons-cart',
        'menu_position' => 9,
        'supports'     => ['title', 'editor', 'page-attributes'],
        'rewrite'      => ['slug' => 'product'],
        'show_in_rest' => true,
    ]);
});
