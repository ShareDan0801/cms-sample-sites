<?php
/**
 * 製品ラインアップ（カスタム投稿タイプ product を WP_Query で描画）。
 *
 * ヘッドレス ShareDan CMS側の固定コンテンツ（content_type=table / key=products）に対応する。
 * WordPress 側は product CPT を DB から読み出し、デザインの横スライド（カード）で描画する。
 * スライド操作は共有 JS（assets/js/main.js）が担う。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

$products_query = new WP_Query([
    'post_type'      => 'product',
    'posts_per_page' => -1,
    'orderby'        => 'menu_order',
    'order'          => 'ASC',
    'no_found_rows'  => true,
]);

// 分類 → チップの配色クラス（style.css の .chip--* / デザインの tagColors）
$tag_chip = [
    'プレス機'   => 'chip--pmachine',
    '金型'       => 'chip--mold',
    '微細部品'   => 'chip--micro',
    '放熱部品'   => 'chip--heat',
    '検査'       => 'chip--inspect',
];
$i = 0;
?>
  <section id="products" class="section products" data-products>
    <div class="products-head-inner">
      <div class="products-head">
        <div>
          <div class="eyebrow">PRODUCTS</div>
          <div class="sec-title">製品ラインアップ</div>
          <p class="products-lead">精密プレス機から金型部品まで、用途に応じた製品をご用意しています。仕様の詳細はカタログまたはお問い合わせにて。</p>
        </div>
        <div class="products-nav">
          <span class="products-count"><span data-products-pos>1</span> / <span data-products-max>1</span></span>
          <button type="button" class="pc-arrow" data-products-prev aria-label="前の製品">‹</button>
          <button type="button" class="pc-arrow" data-products-next aria-label="次の製品">›</button>
        </div>
      </div>
    </div>
    <div class="products-viewport" data-products-viewport>
      <div class="products-track" data-products-track>
        <?php
        while ($products_query->have_posts()) :
            $products_query->the_post();
            $variant    = ($i % 2 === 0) ? 'product-card__thumb--a' : 'product-card__thumb--b';
            $code       = get_post_meta(get_the_ID(), '_code', true);
            $tag        = get_post_meta(get_the_ID(), '_tag', true);
            $spec_label = get_post_meta(get_the_ID(), '_spec_label', true);
            $spec       = get_post_meta(get_the_ID(), '_spec', true);
            $is_new     = get_post_meta(get_the_ID(), '_is_new', true);
            $chip       = isset($tag_chip[$tag]) ? $tag_chip[$tag] : 'chip--info';
            $i++;
        ?>
          <a href="#contact" class="product-card">
            <div class="product-card__thumb <?php echo esc_attr($variant); ?>">
              <span class="product-card__photo">製品写真</span>
              <span class="product-card__code"><?php echo esc_html($code); ?></span>
            </div>
            <div class="product-card__body">
              <div class="product-card__tags">
                <span class="chip <?php echo esc_attr($chip); ?>"><?php echo esc_html($tag); ?></span>
                <?php if (! empty($is_new)) : ?>
                  <span class="product-card__new">NEW</span>
                <?php endif; ?>
              </div>
              <div class="product-card__name"><?php echo esc_html(get_the_title()); ?></div>
              <p class="product-card__desc"><?php echo esc_html(get_the_content()); ?></p>
              <div class="product-card__spec">
                <span class="product-card__spec-label"><?php echo esc_html($spec_label); ?></span>
                <span class="product-card__spec-value"><?php echo esc_html($spec); ?></span>
              </div>
            </div>
          </a>
        <?php endwhile; ?>
      </div>
    </div>
    <div class="products-dots" data-products-dots></div>
  </section>
<?php
wp_reset_postdata();
