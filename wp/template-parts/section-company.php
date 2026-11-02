<?php
/**
 * 会社概要（固定コンテンツ content: company-profile / 項目リスト）。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

$company = get_page_by_path('company-profile', OBJECT, 'content');
$rows    = $company ? get_post_meta($company->ID, '_rows', true) : [];
if (empty($rows) || ! is_array($rows)) {
    $rows = [
        ['label' => '会社名',     'value' => 'DEMO株式会社'],
        ['label' => '設立',       'value' => '1974年4月'],
        ['label' => '代表者',     'value' => '代表取締役社長　湊 宏一郎'],
        ['label' => '所在地',     'value' => '〒146-0093　東京都大田区矢口3-12-8<br><small>第二工場：埼玉県川口市領家5-2-14</small>'],
        ['label' => '従業員数',   'value' => '86名（2026年4月現在）'],
        ['label' => '事業内容',   'value' => '精密プレス加工／金型設計・製作／微細部品の試作・量産'],
        ['label' => '主要取引先', 'value' => '自動車部品メーカー、医療機器メーカー、電機メーカー各社'],
    ];
}
?>
  <section class="section section--panel">
    <div class="section__inner section__inner--tight">
      <div class="split">
        <div>
          <div class="eyebrow">COMPANY</div>
          <div class="sec-title">会社概要</div>
        </div>
        <table class="profile">
          <tbody>
            <?php foreach ($rows as $row) : ?>
              <tr>
                <th><?php echo esc_html($row['label']); ?></th>
                <td><?php echo wp_kses_post($row['value']); ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </section>
