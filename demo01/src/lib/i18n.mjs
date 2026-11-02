/* =========================================================================
 * demo-cms（apps/samples/demo01）— 多言語（i18n）設定とUI文言
 * -------------------------------------------------------------------------
 * 多言語オプション（要件 9.10）のサンプル。言語切替は **ビルド時に言語別の静的ページ**
 * （/ ＝ 原文 ja、/en/、/zh-Hant/）を生成し、切替はページ遷移（<a> リンク）で行う
 * ＝ 実行時の再取得を挟まず、静的ビルドの速さをそのまま保つ（このサンプルの主旨）。
 *
 * コンテンツ（お知らせ・FAQ・代表メッセージ・製品）は公開APIの locale 付き取得で言語別に
 * 焼き込む（src/lib/cms.mjs）。このファイルが持つのは、API化していない「サイトの定型文言」
 * （ナビ・ヒーロー・会社概要・導入事例・フォーム・フッター・パスワードゲート等）の翻訳辞書。
 *
 * 速度比較のデモバー／計測バーは ShareDan 側のデモ用オーバーレイのため、どの言語ページでも
 * 日本語のまま固定する（サンプル企業サイトの文言ではないため意図的に対象外）。
 * ========================================================================= */

/**
 * 公開する表示言語。`apiLocale` が公開APIに渡す言語コード（原文 ja は null＝locale 未指定）。
 * `path` はURLの先頭セグメント（ja は空＝ルート）。並び順＝言語切替ボタンの並び。
 *
 * 実際にビルドされる言語は、ビルド時にテナントの多言語設定を公開APIへ問い合わせて確定する
 * （cms.mjs の resolveAvailableLocales）。多言語オプションが無効／未設定の言語は自動的に外れ、
 * 日本語のみのサイトとして成立する（graceful degradation）。
 */
export const LOCALES = [
  { code: 'ja', apiLocale: null, path: '', label: '日本語', htmlLang: 'ja', tc: false },
  { code: 'en', apiLocale: 'en', path: 'en', label: 'EN', htmlLang: 'en', tc: false },
  { code: 'zh-Hant', apiLocale: 'zh-Hant', path: 'zh-Hant', label: '繁中', htmlLang: 'zh-Hant', tc: true },
]

/** 原文（既定）の言語コード。 */
export const DEFAULT_LOCALE = 'ja'

/** code → LOCALES 要素。 */
export function localeMeta(code) {
  return LOCALES.find((l) => l.code === code) || LOCALES[0]
}

/**
 * 言語ページのURLを組み立てる。ja はルート（/…）、他言語は /{path}/… 。
 * 例: localeHref('en', 'posts/news/foo/') → '/en/posts/news/foo/'、localeHref('ja','') → '/'
 */
export function localeHref(code, subpath = '') {
  const meta = localeMeta(code)
  const sub = String(subpath || '').replace(/^\/+/, '')
  const prefix = meta.path ? `/${meta.path}` : ''
  if (!sub) return `${prefix}/`
  return `${prefix}/${sub}`
}

// 繁体字（zh-Hant）は中国語フォントで表示する（他は日本語フォント）。
const JP_SANS = "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif"
const JP_SERIF = "'Noto Serif JP',serif"
const TC_SANS = "'Noto Sans TC','PingFang TC',sans-serif"
const TC_SERIF = "'Noto Serif TC',serif"

/** 言語に応じた本文（sans）／見出し（serif）フォントスタック。 */
export function fontsFor(code) {
  return localeMeta(code).tc ? { sans: TC_SANS, serif: TC_SERIF } : { sans: JP_SANS, serif: JP_SERIF }
}

/**
 * サイト定型文言の翻訳辞書。`uiFor(code)` で取り出す。
 * ja は原文、en / zh-Hant はデザイン「サンプルサイト 多言語・簡易認証」の訳を踏襲しつつ、
 * API化していない各セクション（会社概要・導入事例・フォーム等）を補って全体を翻訳する。
 */
const UI = {
  ja: {
    brandSub: 'DEMO株式会社',
    nav: { about: '私たちについて', news: 'お知らせ', works: '導入事例', products: '製品', faq: 'よくある質問', contact: 'お問い合わせ' },
    hero: {
      eyebrow: 'PRECISION PRESS WORKS SINCE 1974',
      title1: 'ものづくりの先へ、', title2: '精度で応える。',
      lead: 'ミクロン単位の精密プレス加工から微細部品まで。半世紀にわたり培った技術で、自動車・医療・電機分野の課題を解決します。',
      ctaWorks: '導入事例を見る',
    },
    message: { eyebrow: 'MESSAGE', title: '代表メッセージ', repRole: '代表取締役社長', repName: '湊 宏一郎', photo: '写真' },
    company: {
      eyebrow: 'COMPANY', title: '会社概要',
      rows: [
        ['会社名', 'DEMO株式会社'],
        ['設立', '1974年4月'],
        ['代表者', '代表取締役社長　湊 宏一郎'],
        ['所在地', '〒146-0093　東京都大田区矢口3-12-8', '第二工場：埼玉県川口市領家5-2-14'],
        ['従業員数', '86名（2026年4月現在）'],
        ['事業内容', '精密プレス加工／金型設計・製作／微細部品の試作・量産'],
        ['主要取引先', '自動車部品メーカー、医療機器メーカー、電機メーカー各社'],
      ],
    },
    news: {
      eyebrow: 'NEWS', title: 'お知らせ',
      tabs: [['all', 'すべて'], ['info', 'お知らせ'], ['product', '製品情報'], ['event', 'イベント'], ['press', 'プレスリリース']],
      countTpl: '{n}件を表示しています',
      lockedTag: '要パスワード',
    },
    works: {
      eyebrow: 'WORKS', title: '導入事例', photo: '事例写真',
      cards: [
        ['自動車部品', 'EV向け精密端子の量産化を実現', '±5μmの公差要求に対し、専用金型と検査工程の内製化で歩留まり99.6%を達成しました。'],
        ['医療機器', '内視鏡用微細部品の試作から量産まで', '短納期の試作要求に対応し、設計段階からの並走で開発期間を40%短縮しました。'],
        ['電機・電子', '高放熱プレート、月産20万枚体制へ', '設備増強と自動搬送ラインの導入で、需要増に応える供給体制を構築しました。'],
      ],
    },
    products: {
      eyebrow: 'PRODUCTS', title: '製品ラインアップ',
      lead: '精密プレス機から金型部品まで、用途に応じた製品をご用意しています。仕様の詳細はカタログまたはお問い合わせにて。',
      photo: '製品写真', prev: '前の製品', next: '次の製品',
    },
    faq: {
      eyebrow: 'FAQ', title: 'よくある質問',
      tabs: [['all', 'すべて'], ['product', '製品について'], ['quote', 'お見積り・納期'], ['support', 'アフターサポート'], ['other', 'その他']],
    },
    contact: {
      eyebrow: 'CONTACT', title: 'お問い合わせ',
      lead: '製品・技術に関するご相談、お見積りのご依頼はこちらから承ります。2営業日以内にご返信いたします。',
      telLabel: 'お電話', tel: '03-5555-0100', hours: '平日 9:00〜17:30', faxLabel: 'FAX', fax: '03-5555-0101',
      fields: { company: '会社名', name: 'お名前', email: 'メールアドレス', tel: '電話番号', type: 'お問い合わせ種別', body: 'お問い合わせ内容', attach: '図面・仕様書の添付' },
      placeholders: { company: '株式会社ヤマト電子', name: '大西 亮', email: 'onishi@example.co.jp', tel: '03-5555-0182', body: 'ご相談内容をご記入ください。図面がある場合は下記より添付いただけます。' },
      options: ['お見積り', '技術相談', '採用について', 'その他'],
      dropzone: 'ファイルをドラッグ＆ドロップ', dropzoneOr: 'または', dropzoneBtn: 'ファイルを選択',
      hint: 'PDF / JPG / PNG・1件10MBまで・最大3件',
      consentBefore: '', consentLink: '個人情報の取り扱い', consentAfter: 'に同意します',
      turnstile: '私は人間です', submit: '送信する',
      successTitle: '送信が完了しました',
      successText: 'お問い合わせありがとうございます。担当者より2営業日以内にご連絡いたします。<br>管理画面の「フォーム送信データ」に、この送信が未読として届いています。',
      successAgain: 'もう一度送信する',
    },
    footer: { addr: 'DEMO株式会社　〒146-0093 東京都大田区矢口3-12-8', powered: 'Powered by ShareDan CMS ／ ©ShareDan CO. ,Ltd.' },
    article: { back: '← お知らせ一覧へ', related: '関連リンク', fallbackCat: 'お知らせ' },
    // 翻訳フォールバック（指定言語の訳が無く原文を表示している場合の注記・要件 9.10「未入力言語公開＝原文」）
    fallbackNote: 'この記事はまだ翻訳されていません。原文（日本語）を表示しています。',
    // パスワードゲート（簡易認証・SCR-104）
    gate: {
      title: 'この記事はパスワードで保護されています',
      lead: 'お取引先様向けの限定情報です。ご案内しているパスワードを入力してください。',
      pwLabel: 'パスワード', pwPh: 'パスワードを入力', submit: '閲覧する', submitting: '確認中…',
      error: 'パスワードが正しくありません。もう一度お試しください。',
      throttled: '試行回数が上限に達しました。しばらくしてからもう一度お試しください。',
      failed: '確認に失敗しました。通信環境を確認して、もう一度お試しください。',
      hint: 'パスワードがご不明な場合は、担当営業またはお問い合わせフォームからご連絡ください。',
      show: '表示', hide: '隠す',
      unlockedMsg: '認証しました。このブラウザを閉じるまで閲覧できます。', relock: 'ロックする',
      demoLabel: 'デモ用パスワード：',
    },
    // 実行時（public/js/cms.js）が使う文言（フォーム送信・メンテナンス）。window.SHAREDAN_I18N 経由で渡す。
    runtime: {
      formSubmit: '送信する', formSubmitting: '送信中…', selectPlaceholder: '選択してください',
      fileHint: 'PDF / 画像 / Word / Excel / テキスト・1件10MBまで。アップロードされたファイルは自動的にマルウェアスキャンされます。',
      errGeneric: '送信に失敗しました。時間をおいて再度お試しください。',
      errRate: '送信が集中しています。{wait}後に再度お試しください。', rateSec: '{n}秒', rateSoon: 'しばらく',
      errValidation: '入力内容をご確認ください（必須項目・メール形式など）。',
      errBadRequest: '送信内容を確認できませんでした。ページを再読み込みしてお試しください。',
      errTurnstile: 'スパム対策の確認（Turnstile）を完了してから送信してください。',
      maintenanceResumes: '再開予定',
    },
  },

  en: {
    brandSub: 'DEMO Corporation',
    nav: { about: 'About', news: 'News', works: 'Case Studies', products: 'Products', faq: 'FAQ', contact: 'Contact' },
    hero: {
      eyebrow: 'PRECISION PRESS WORKS SINCE 1974',
      title1: 'Beyond manufacturing,', title2: 'answering with precision.',
      lead: 'From micron-level precision pressing to micro components. With half a century of expertise, we solve challenges in the automotive, medical and electronics industries.',
      ctaWorks: 'View case studies',
    },
    message: { eyebrow: 'MESSAGE', title: 'Message from the President', repRole: 'President & CEO', repName: 'Koichiro Minato', photo: 'Photo' },
    company: {
      eyebrow: 'COMPANY', title: 'Company Profile',
      rows: [
        ['Company', 'DEMO Corporation'],
        ['Founded', 'April 1974'],
        ['Representative', 'Koichiro Minato, President & CEO'],
        ['Head office', '3-12-8 Yaguchi, Ota-ku, Tokyo 146-0093, Japan', 'Second plant: 5-2-14 Ryoke, Kawaguchi, Saitama'],
        ['Employees', '86 (as of April 2026)'],
        ['Business', 'Precision press working / die design & manufacturing / prototyping & mass production of micro components'],
        ['Main clients', 'Automotive parts, medical device and electronics manufacturers'],
      ],
    },
    news: {
      eyebrow: 'NEWS', title: 'News',
      tabs: [['all', 'All'], ['info', 'Notice'], ['product', 'Products'], ['event', 'Events'], ['press', 'Press']],
      countTpl: 'Showing {n} items',
      lockedTag: 'Password',
    },
    works: {
      eyebrow: 'WORKS', title: 'Case Studies', photo: 'Case photo',
      cards: [
        ['Automotive', 'Mass production of precision terminals for EVs', 'Against a ±5μm tolerance requirement, we achieved a 99.6% yield by bringing dedicated dies and inspection in-house.'],
        ['Medical devices', 'From prototyping to mass production of endoscope micro parts', 'We met short-lead prototyping demands and cut development time by 40% through design-stage collaboration.'],
        ['Electronics', 'High-dissipation plates, scaling to 200,000 units/month', 'By expanding equipment and adding automated conveyance, we built a supply system that meets rising demand.'],
      ],
    },
    products: {
      eyebrow: 'PRODUCTS', title: 'Product Lineup',
      lead: 'From precision presses to die components, we offer products for every application. For detailed specs, see our catalog or contact us.',
      photo: 'Product photo', prev: 'Previous product', next: 'Next product',
    },
    faq: {
      eyebrow: 'FAQ', title: 'FAQ',
      tabs: [['all', 'All'], ['product', 'Products'], ['quote', 'Quotes & Lead time'], ['support', 'After-sales support'], ['other', 'Other']],
    },
    contact: {
      eyebrow: 'CONTACT', title: 'Contact',
      lead: 'For product and technical enquiries or quotation requests, please use the form below. We reply within two business days.',
      telLabel: 'Phone', tel: '03-5555-0100', hours: 'Weekdays 9:00–17:30', faxLabel: 'FAX', fax: '03-5555-0101',
      fields: { company: 'Company', name: 'Name', email: 'Email', tel: 'Phone', type: 'Enquiry type', body: 'Message', attach: 'Attach drawing / spec sheet' },
      placeholders: { company: 'Yamato Electronics Co., Ltd.', name: 'Ryo Onishi', email: 'onishi@example.co.jp', tel: '03-5555-0182', body: 'Please describe your enquiry. You can attach drawings below.' },
      options: ['Quote', 'Technical consultation', 'Careers', 'Other'],
      dropzone: 'Drag & drop files here', dropzoneOr: 'or', dropzoneBtn: 'Choose file',
      hint: 'PDF / JPG / PNG, up to 10 MB each, max 3 files',
      consentBefore: 'I agree to ', consentLink: 'the handling of personal information', consentAfter: '',
      turnstile: 'I am human', submit: 'Send',
      successTitle: 'Your message has been sent',
      successText: 'Thank you for your enquiry. Our team will contact you within two business days.<br>This submission has arrived as unread in the “Form submissions” area of the admin.',
      successAgain: 'Send another message',
    },
    footer: { addr: 'DEMO Corporation　3-12-8 Yaguchi, Ota-ku, Tokyo 146-0093, Japan', powered: 'Powered by ShareDan CMS ／ ©ShareDan CO. ,Ltd.' },
    article: { back: '← Back to news', related: 'Related links', fallbackCat: 'News' },
    fallbackNote: 'This article has not been translated yet. The original (Japanese) text is shown.',
    gate: {
      title: 'This post is password protected',
      lead: 'This information is available to our business partners only. Please enter the password provided to you.',
      pwLabel: 'Password', pwPh: 'Enter password', submit: 'View post', submitting: 'Checking…',
      error: 'Incorrect password. Please try again.',
      throttled: 'Too many attempts. Please wait a while and try again.',
      failed: 'Verification failed. Please check your connection and try again.',
      hint: 'If you do not know the password, please contact your sales representative or use our contact form.',
      show: 'Show', hide: 'Hide',
      unlockedMsg: 'Access granted. You can view this post until you close the browser.', relock: 'Lock',
      demoLabel: 'Demo password: ',
    },
    runtime: {
      formSubmit: 'Send', formSubmitting: 'Sending…', selectPlaceholder: 'Please select',
      fileHint: 'PDF / image / Word / Excel / text, up to 10 MB each. Uploaded files are automatically scanned for malware.',
      errGeneric: 'Failed to send. Please try again later.',
      errRate: 'Too many requests. Please try again in {wait}.', rateSec: '{n}s', rateSoon: 'a moment',
      errValidation: 'Please check your input (required fields, email format, etc.).',
      errBadRequest: 'We could not verify your submission. Please reload the page and try again.',
      errTurnstile: 'Please complete the spam check (Turnstile) before sending.',
      maintenanceResumes: 'Back at',
    },
  },

  'zh-Hant': {
    brandSub: 'DEMO股份有限公司',
    nav: { about: '關於我們', news: '最新消息', works: '導入案例', products: '產品', faq: '常見問題', contact: '聯絡我們' },
    hero: {
      eyebrow: 'PRECISION PRESS WORKS SINCE 1974',
      title1: '超越製造，', title2: '以精度回應。',
      lead: '從微米級精密沖壓加工到微細零件。憑藉半世紀累積的技術，為汽車、醫療、電機領域解決課題。',
      ctaWorks: '查看導入案例',
    },
    message: { eyebrow: 'MESSAGE', title: '代表致詞', repRole: '代表取締役社長', repName: '湊 宏一郎', photo: '照片' },
    company: {
      eyebrow: 'COMPANY', title: '公司概要',
      rows: [
        ['公司名稱', 'DEMO股份有限公司'],
        ['成立', '1974年4月'],
        ['代表人', '代表取締役社長　湊 宏一郎'],
        ['所在地', '〒146-0093　日本東京都大田區矢口3-12-8', '第二工廠：埼玉縣川口市領家5-2-14'],
        ['員工人數', '86名（2026年4月現在）'],
        ['營業內容', '精密沖壓加工／模具設計・製作／微細零件的試作・量產'],
        ['主要客戶', '汽車零件製造商、醫療器材製造商、電機製造商等'],
      ],
    },
    news: {
      eyebrow: 'NEWS', title: '最新消息',
      tabs: [['all', '全部'], ['info', '公告'], ['product', '產品資訊'], ['event', '活動'], ['press', '新聞稿']],
      countTpl: '顯示 {n} 則',
      lockedTag: '需密碼',
    },
    works: {
      eyebrow: 'WORKS', title: '導入案例', photo: '案例照片',
      cards: [
        ['汽車零件', '實現EV用精密端子的量產化', '面對±5μm的公差要求，透過專用模具與檢查工程的內製化，達成99.6%的良率。'],
        ['醫療器材', '內視鏡用微細零件的試作至量產', '因應短交期的試作需求，從設計階段並行協作，將開發期間縮短40%。'],
        ['電機・電子', '高散熱板，邁向月產20萬片體制', '透過設備擴充與自動搬運線的導入，建構因應需求增長的供應體制。'],
      ],
    },
    products: {
      eyebrow: 'PRODUCTS', title: '產品陣容',
      lead: '從精密沖壓機到模具零件，依用途備有各式產品。規格詳情請參閱型錄或與我們聯繫。',
      photo: '產品照片', prev: '上一項產品', next: '下一項產品',
    },
    faq: {
      eyebrow: 'FAQ', title: '常見問題',
      tabs: [['all', '全部'], ['product', '關於產品'], ['quote', '報價・交期'], ['support', '售後支援'], ['other', '其他']],
    },
    contact: {
      eyebrow: 'CONTACT', title: '聯絡我們',
      lead: '產品、技術相關諮詢與報價需求請由此洽詢。我們將於2個工作日內回覆。',
      telLabel: '電話', tel: '03-5555-0100', hours: '平日 9:00〜17:30', faxLabel: 'FAX', fax: '03-5555-0101',
      fields: { company: '公司名稱', name: '姓名', email: '電子郵件', tel: '電話號碼', type: '諮詢類別', body: '諮詢內容', attach: '圖面・規格書附件' },
      placeholders: { company: '大和電子股份有限公司', name: '大西 亮', email: 'onishi@example.co.jp', tel: '03-5555-0182', body: '請填寫您的諮詢內容。如有圖面可由下方附加。' },
      options: ['報價', '技術諮詢', '關於招募', '其他'],
      dropzone: '將檔案拖放至此', dropzoneOr: '或', dropzoneBtn: '選擇檔案',
      hint: 'PDF / JPG / PNG・每件最大10MB・最多3件',
      consentBefore: '我同意', consentLink: '個人資料的處理', consentAfter: '',
      turnstile: '我是人類', submit: '送出',
      successTitle: '送出完成',
      successText: '感謝您的諮詢。承辦人員將於2個工作日內與您聯繫。<br>此則送出已以未讀狀態送達管理畫面的「表單送出資料」。',
      successAgain: '再次送出',
    },
    footer: { addr: 'DEMO股份有限公司　〒146-0093 日本東京都大田區矢口3-12-8', powered: 'Powered by ShareDan 簡易CMS ／ ©ShareDan CO. ,Ltd.' },
    article: { back: '← 返回消息列表', related: '相關連結', fallbackCat: '最新消息' },
    fallbackNote: '本文章尚未翻譯，目前顯示原文（日文）。',
    gate: {
      title: '本文章受密碼保護',
      lead: '此為合作廠商專屬資訊。請輸入我們提供給您的密碼。',
      pwLabel: '密碼', pwPh: '請輸入密碼', submit: '閱覽', submitting: '確認中…',
      error: '密碼不正確，請再試一次。',
      throttled: '嘗試次數已達上限，請稍後再試。',
      failed: '確認失敗，請確認網路環境後再試一次。',
      hint: '如不清楚密碼，請聯絡負責業務或透過聯絡表單與我們聯繫。',
      show: '顯示', hide: '隱藏',
      unlockedMsg: '驗證成功。在關閉瀏覽器前皆可閱覽。', relock: '重新上鎖',
      demoLabel: '示範用密碼：',
    },
    runtime: {
      formSubmit: '送出', formSubmitting: '送出中…', selectPlaceholder: '請選擇',
      fileHint: 'PDF / 圖片 / Word / Excel / 文字檔・每件最大10MB。上傳的檔案會自動進行惡意程式掃描。',
      errGeneric: '送出失敗，請稍後再試。',
      errRate: '送出過於頻繁，請於{wait}後再試。', rateSec: '{n}秒', rateSoon: '稍後',
      errValidation: '請確認您的輸入（必填項目、電子郵件格式等）。',
      errBadRequest: '無法確認送出內容，請重新整理頁面後再試。',
      errTurnstile: '請先完成垃圾訊息防護驗證（Turnstile）再送出。',
      maintenanceResumes: '預計恢復',
    },
  },
}

/** 指定言語のUI文言を返す（未知コードは原文 ja）。 */
export function uiFor(code) {
  return UI[code] || UI[DEFAULT_LOCALE]
}
