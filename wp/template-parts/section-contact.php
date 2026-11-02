<?php
/**
 * お問い合わせ（Contact Form 7 前提）。
 *
 * WordPress でのフォームは Contact Form 7（CF7）で実装する前提。CF7 が有効で
 * 専用フォーム（inc/demo-content.php の demo_ensure_cf7_form が作成）が存在すれば、
 * そのショートコードを描画して実際にメール送信できるフォームにする。
 * CF7 未有効時は、デザイン再現の静的フォーム（送信は main.js の完了表示のみ）へ
 * フォールバックする。
 *
 * @package demo
 */

if (! defined('ABSPATH')) {
    exit;
}

$demo_cf7_id = (int) get_option('demo_cf7_form_id');
$demo_use_cf7 = $demo_cf7_id > 0 && shortcode_exists('contact-form-7');
?>
  <section id="contact" class="section section--panel">
    <div class="section__inner">
      <div class="contact-grid">
        <div>
          <div class="eyebrow">CONTACT</div>
          <div class="sec-title contact-title">お問い合わせ</div>
          <p class="contact-lead">製品・技術に関するご相談、お見積りのご依頼はこちらから承ります。2営業日以内にご返信いたします。</p>
          <div class="contact-card">
            <div>
              <div class="contact-card__label">お電話</div>
              <div class="contact-card__tel">03-5555-0100</div>
              <div class="contact-card__hours">平日 9:00〜17:30</div>
            </div>
            <div class="contact-card__block">
              <div class="contact-card__label">FAX</div>
              <div class="contact-card__fax">03-5555-0101</div>
            </div>
          </div>
        </div>
<?php if ($demo_use_cf7) : ?>
        <div class="form-box">
          <?php echo do_shortcode(sprintf('[contact-form-7 id="%d" title="%s"]', $demo_cf7_id, 'お問い合わせ')); ?>
        </div>
<?php else : ?>
        <div class="form-box" data-form-box>
          <p class="field-hint" style="margin-bottom:16px;">
            ※ プラグイン「Contact Form 7」を有効化すると、このフォームは実際にメール送信できるフォームに切り替わります（現在はデザイン再現の静的表示です）。
          </p>
          <form class="form" data-form>
            <div class="form-row2">
              <div class="field">
                <label>会社名 <span class="req">*</span></label>
                <input type="text" placeholder="株式会社ヤマト電子" required>
              </div>
              <div class="field">
                <label>お名前 <span class="req">*</span></label>
                <input type="text" placeholder="大西 亮" required>
              </div>
            </div>
            <div class="form-row2">
              <div class="field">
                <label>メールアドレス <span class="req">*</span></label>
                <input type="email" placeholder="onishi@example.co.jp" required>
              </div>
              <div class="field">
                <label>電話番号</label>
                <input type="tel" placeholder="03-5555-0182">
              </div>
            </div>
            <div class="field">
              <label>お問い合わせ種別 <span class="req">*</span></label>
              <select required>
                <option>お見積り</option>
                <option>技術相談</option>
                <option>採用について</option>
                <option>その他</option>
              </select>
            </div>
            <div class="field">
              <label>お問い合わせ内容 <span class="req">*</span></label>
              <textarea rows="5" placeholder="ご相談内容をご記入ください。図面がある場合は下記より添付いただけます。" required></textarea>
            </div>
            <div class="field">
              <label>図面・仕様書の添付</label>
              <div class="dropzone">
                <span class="dropzone__text">ファイルをドラッグ＆ドロップ</span>
                <span class="dropzone__or">または</span>
                <button type="button" class="dropzone__btn">ファイルを選択</button>
              </div>
              <div class="field-hint">PDF / JPG / PNG・1件10MBまで・最大3件</div>
            </div>
            <label class="consent">
              <input type="checkbox" required>
              <span><a href="#">個人情報の取り扱い</a>に同意します <span class="req">*</span></span>
            </label>
            <button type="submit" class="form-submit">送信する</button>
          </form>
          <div class="form-success">
            <div class="form-success__check">✓</div>
            <div class="form-success__title">送信が完了しました</div>
            <p class="form-success__text">お問い合わせありがとうございます。担当者より2営業日以内にご連絡いたします。</p>
            <button type="button" class="form-success__again" data-reset-form>もう一度送信する</button>
          </div>
        </div>
<?php endif; ?>
      </div>
    </div>
  </section>
<?php if ($demo_use_cf7) : ?>
  <style>
    /* Contact Form 7 のコントロールをデザイン（css/theme.css の .field 等）に合わせる。
       CF7 は input を span.wpcf7-form-control-wrap で包むため、幅とブロック化だけ補う
       （共有CSS theme.css は静的HTML版と byte 一致で保つため、ここで CF7 分のみ調整する）。 */
    #contact .wpcf7-form-control-wrap { display: block; }
    #contact .field input:not([type=checkbox]):not([type=file]),
    #contact .field select,
    #contact .field textarea { width: 100%; box-sizing: border-box; }
    #contact .cf7-form { display: flex; flex-direction: column; gap: 18px; }
    #contact .wpcf7-response-output { margin: 4px 0 0; font-size: 13px; border-radius: 6px; }
    #contact .wpcf7-not-valid-tip { font-size: 12px; }
    #contact .consent .wpcf7-list-item { margin: 0; }
  </style>
<?php endif; ?>
