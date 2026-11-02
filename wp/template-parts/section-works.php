<?php
/**
 * 導入事例（カスタム投稿タイプ works を WP_Query で描画）。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

$works_query = new WP_Query([
    'post_type'      => 'works',
    'posts_per_page' => -1,
    'orderby'        => 'menu_order',
    'order'          => 'ASC',
    'no_found_rows'  => true,
]);
$i = 0;
?>
  <section id="works" class="section section--panel">
    <div class="section__inner">
      <div class="center-head">
        <div class="eyebrow">WORKS</div>
        <div class="sec-title">導入事例</div>
      </div>
      <div class="works-grid">
        <?php
        while ($works_query->have_posts()) :
            $works_query->the_post();
            $variant = ($i % 2 === 0) ? 'work-card__thumb--a' : 'work-card__thumb--b';
            $cat     = get_post_meta(get_the_ID(), '_works_cat', true);
            $i++;
        ?>
          <div class="work-card">
            <div class="work-card__thumb <?php echo esc_attr($variant); ?>">事例写真</div>
            <div class="work-card__body">
              <div class="work-card__cat"><?php echo esc_html($cat); ?></div>
              <div class="work-card__title"><?php echo esc_html(get_the_title()); ?></div>
              <p class="work-card__desc"><?php echo esc_html(get_the_content()); ?></p>
            </div>
          </div>
        <?php endwhile; ?>
      </div>
    </div>
  </section>
<?php
wp_reset_postdata();
