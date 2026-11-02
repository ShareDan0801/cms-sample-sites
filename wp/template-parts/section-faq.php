<?php
/**
 * FAQ（カスタム投稿タイプ faq を WP_Query で描画）。
 * タイトル=質問、本文=回答。カテゴリ絞り込みは data-cat + main.js。先頭を開いた状態にする。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

$faq_query = new WP_Query([
    'post_type'      => 'faq',
    'posts_per_page' => -1,
    'orderby'        => 'menu_order',
    'order'          => 'ASC',
    'no_found_rows'  => true,
]);
$i = 0;
?>
  <section id="faq" class="section">
    <div class="section__inner">
      <div class="center-head">
        <div class="eyebrow">FAQ</div>
        <div class="sec-title">よくある質問</div>
      </div>
      <div class="tabs tabs--center">
        <button type="button" class="tab is-active" data-faq-tab="all">すべて</button>
        <button type="button" class="tab" data-faq-tab="product">製品について</button>
        <button type="button" class="tab" data-faq-tab="quote">お見積り・納期</button>
        <button type="button" class="tab" data-faq-tab="support">アフターサポート</button>
        <button type="button" class="tab" data-faq-tab="other">その他</button>
      </div>
      <div class="faq-list">
        <?php
        while ($faq_query->have_posts()) :
            $faq_query->the_post();
            $term = demo_first_term(get_the_ID(), 'faq_cat');
            $slug = $term ? $term->slug : 'other';
            $open = ($i === 0) ? ' is-open' : '';
            $i++;
        ?>
          <div class="faq-item<?php echo $open; ?>" data-cat="<?php echo esc_attr($slug); ?>">
            <button type="button" class="faq-q">
              <span class="faq-q__mark">Q</span>
              <span class="faq-q__text"><?php echo esc_html(get_the_title()); ?></span>
              <span class="faq-q__icon">＋</span>
            </button>
            <div class="faq-a">
              <div class="faq-a__inner">
                <span class="faq-a__mark">A</span>
                <p class="faq-a__text"><?php echo esc_html(get_the_content()); ?></p>
              </div>
            </div>
          </div>
        <?php endwhile; ?>
      </div>
    </div>
  </section>
<?php
wp_reset_postdata();
