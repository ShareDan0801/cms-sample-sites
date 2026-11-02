<?php
/**
 * ヘッダー：デモバー・速度比較バー・サイトヘッダー。
 * デザイン「サンプルサイト.dc.html」の上部を WordPress 化したもの。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <?php if (($_SERVER['HTTP_HOST'] ?? '') === 'demo-wp.sharedan.biz') : ?>
  <!-- Google Tag Manager（本番ホストのみ有効化） -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-PRHD3BMS');</script>
  <!-- End Google Tag Manager -->
  <?php endif; ?>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- 速度比較用のデモサイト。検索エンジンにはインデックスさせない -->
  <meta name="robots" content="noindex, nofollow">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php if (($_SERVER['HTTP_HOST'] ?? '') === 'demo-wp.sharedan.biz') : ?>
<!-- Google Tag Manager (noscript)（本番ホストのみ有効化） -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PRHD3BMS"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
<?php endif; ?>

  <!-- ======= デモ用バー ======= -->
  <div class="demo-bar">
    <div class="demo-bar__left">
      <span class="demo-bar__title">ShareDan <span>CMS</span> デモサイト</span>
      <span class="demo-bar__sep"></span>
      <span class="demo-bar__note">管理画面の更新が、このページに反映されます</span>
    </div>
    <div class="demo-bar__right">
      <span class="demo-bar__label">同じデザインで比較</span>
      <div class="mode-switch">
        <button type="button" class="mode-btn" data-mode="cms">ShareDan CMS</button>
        <button type="button" class="mode-btn is-active" data-mode="wp">WordPress</button>
      </div>
      <button type="button" class="ghost-btn" data-reload>再読み込み</button>
      <button type="button" class="api-btn" data-toggle-api>計測を表示 <span data-api-label>OFF</span></button>
    </div>
  </div>

  <!-- ======= 速度比較バー（計測を表示ONのとき） ======= -->
  <div class="speed-bar">
    <div class="speed-bar__inner">
      <div class="speed-bar__mode">
        <span class="mode-badge is-wp" data-mode-badge>WordPress版</span>
        <span class="speed-bar__for">で表示中</span>
      </div>
      <div class="speed-bar__meters">
        <div class="meter">
          <div class="meter__head">
            <span class="meter__label">ShareDan CMS（ヘッドレス・Astro静的ビルド＋CDN）</span>
            <span class="meter__val is-cms"><span data-cms-total>96</span>ms</span>
          </div>
          <div class="meter__track"><div class="meter__fill is-cms" data-cms-fill style="width:8%"></div></div>
        </div>
        <div class="meter">
          <div class="meter__head">
            <span class="meter__label">WordPress（PHP＋DB・同一デザイン）</span>
            <span class="meter__val is-wp"><span data-wp-total>1180</span>ms</span>
          </div>
          <div class="meter__track"><div class="meter__fill is-wp" style="width:100%"></div></div>
        </div>
      </div>
      <div class="speed-bar__ratio">
        <span class="speed-bar__ratio-num"><span data-ratio>12.3</span>倍</span>
        <span class="speed-bar__ratio-txt">高速</span>
      </div>
    </div>
    <div class="speed-bar__note">同一デザインで、コンテンツ取得方法だけを入れ替えた比較です。WordPress側はテーマ描画＋DBクエリ、ShareDan CMS側は GitHub Actions（CI/CD）上で Astro が公開API（JSON）の値から静的ビルドしたHTMLを CDN から配信しています。</div>
  </div>

  <!-- ======= ヘッダー ======= -->
  <header class="site-header">
    <div class="site-header__inner">
      <a class="brand" href="<?php echo esc_url(home_url('/')); ?>" aria-label="トップへ">
        <span class="brand__logo">DEMO<span>.</span></span>
        <span class="brand__sub">DEMO株式会社</span>
      </a>
      <nav class="gnav">
        <a href="#about">私たちについて</a>
        <a href="#news">お知らせ</a>
        <a href="#works">導入事例</a>
        <a href="#products">製品</a>
        <a href="#faq">よくある質問</a>
        <a href="#contact" class="gnav__cta">お問い合わせ</a>
      </nav>
    </div>
  </header>
