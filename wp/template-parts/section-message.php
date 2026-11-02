<?php
/**
 * 代表メッセージ（固定コンテンツ content: top-message）。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

$msg   = get_page_by_path('top-message', OBJECT, 'content');
$line1 = $msg ? get_post_meta($msg->ID, '_heading_line1', true) : '変化を好機に、';
$line2 = $msg ? get_post_meta($msg->ID, '_heading_line2', true) : 'より高度なものづくりへ。';
$role  = $msg ? get_post_meta($msg->ID, '_rep_role', true) : '代表取締役社長';
$name  = $msg ? get_post_meta($msg->ID, '_rep_name', true) : '湊 宏一郎';
$body  = ($msg && $msg->post_content)
    ? $msg->post_content
    : '<p>DEMO株式会社は、1974年の創業以来、精密プレス加工ひと筋に技術を磨いてまいりました。ミクロン単位の精度が求められる自動車部品から、医療機器の微細部品まで、私たちの技術は幅広い分野で活躍しています。</p><p>近年、製造業を取り巻く環境は大きく変化しています。私たちはこの変化を好機と捉え、設備投資と人材育成の両輪で、より高度なものづくりに挑戦し続けます。</p>';
?>
  <section id="about" class="section">
    <div class="section__inner">
      <div class="split">
        <div>
          <div class="eyebrow">MESSAGE</div>
          <div class="sec-title">代表メッセージ</div>
        </div>
        <div class="message">
          <h2 class="message__title"><?php echo esc_html($line1); ?><br><?php echo esc_html($line2); ?></h2>
          <?php echo wp_kses_post($body); ?>
          <div class="rep">
            <div class="rep__photo">写真</div>
            <div>
              <div class="rep__role"><?php echo esc_html($role); ?></div>
              <div class="rep__name"><?php echo esc_html($name); ?></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
