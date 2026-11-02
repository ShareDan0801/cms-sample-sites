<?php
/**
 * フロントページ（トップページ）。
 * ヒーロー + 各セクション（固定コンテンツ・お知らせ・導入事例・FAQ・お問い合わせ）。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

get_header();
?>

  <!-- ======= ヒーロー ======= -->
  <section class="hero">
    <div class="hero__inner">
      <div>
        <div class="hero__eyebrow">PRECISION PRESS WORKS SINCE 1974</div>
        <h1 class="hero__title">ものづくりの先へ、<br>精度で応える。</h1>
        <p class="hero__lead">ミクロン単位の精密プレス加工から微細部品まで。半世紀にわたり培った技術で、自動車・医療・電機分野の課題を解決します。</p>
        <div class="hero__actions">
          <a href="#works" class="btn btn--primary">導入事例を見る</a>
          <a href="#contact" class="btn btn--ghost-dark">お問い合わせ</a>
        </div>
      </div>
      <div class="hero__visual">
        <b>HERO VISUAL</b>
        <small>工場外観・製品写真など</small>
      </div>
    </div>
  </section>

<?php
get_template_part('template-parts/section', 'message');
get_template_part('template-parts/section', 'company');
get_template_part('template-parts/section', 'news');
get_template_part('template-parts/section', 'works');
get_template_part('template-parts/section', 'products');
get_template_part('template-parts/section', 'faq');
get_template_part('template-parts/section', 'contact');

get_footer();
