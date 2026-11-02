<?php
/**
 * フォールバックテンプレート。
 * このサンプルはトップページ（front-page.php）を主体とする1枚もの構成のため、
 * その他のクエリではトップへ誘導する簡易表示にとどめる。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

get_header();
?>
  <section class="section">
    <div class="section__inner" style="text-align:center;">
      <div class="eyebrow">DEMO</div>
      <div class="sec-title" style="margin-bottom:16px;"><?php echo esc_html(get_the_archive_title() ?: 'ページが見つかりませんでした'); ?></div>
      <p class="contact-lead" style="margin:0 auto 22px;">トップページからご覧ください。</p>
      <a href="<?php echo esc_url(home_url('/')); ?>" class="btn btn--primary">トップへ戻る</a>
    </div>
  </section>
<?php
get_footer();
