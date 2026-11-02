<?php
/**
 * お知らせ（カスタム投稿タイプ news を WP_Query で描画）。
 * カテゴリ絞り込みは静的HTML版と同様に data-cat + main.js で行う（全件描画）。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

$news_query = new WP_Query([
    'post_type'      => 'news',
    'posts_per_page' => -1,
    'orderby'        => 'menu_order',
    'order'          => 'ASC',
    'no_found_rows'  => true,
]);
?>
  <section id="news" class="section">
    <div class="section__inner">
      <div class="news-head">
        <div>
          <div class="eyebrow">NEWS</div>
          <div class="sec-title">お知らせ</div>
        </div>
        <div class="tabs">
          <button type="button" class="tab is-active" data-news-tab="all">すべて</button>
          <button type="button" class="tab" data-news-tab="info">お知らせ</button>
          <button type="button" class="tab" data-news-tab="product">製品情報</button>
          <button type="button" class="tab" data-news-tab="event">イベント</button>
          <button type="button" class="tab" data-news-tab="press">プレスリリース</button>
        </div>
      </div>
      <div class="news-list">
        <?php
        while ($news_query->have_posts()) :
            $news_query->the_post();
            $term  = demo_first_term(get_the_ID(), 'news_cat');
            $slug  = $term ? $term->slug : 'info';
            $label = $term ? $term->name : '';
            $chip  = demo_news_chip_class($slug);
            $date  = get_post_meta(get_the_ID(), '_news_date', true);
        ?>
          <a href="#news" class="news-item" data-cat="<?php echo esc_attr($slug); ?>">
            <span class="news-item__date"><?php echo esc_html($date); ?></span>
            <span class="chip <?php echo esc_attr($chip); ?>"><?php echo esc_html($label); ?></span>
            <span class="news-item__title"><?php echo esc_html(get_the_title()); ?></span>
            <span class="news-item__arrow">›</span>
          </a>
        <?php endwhile; ?>
      </div>
      <div class="news-count" data-news-count><?php echo esc_html($news_query->post_count); ?>件を表示しています</div>
    </div>
  </section>
<?php
wp_reset_postdata();
