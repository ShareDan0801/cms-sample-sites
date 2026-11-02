/* =========================================================================
 * DEMO サンプルサイト — 共通インタラクション
 * -------------------------------------------------------------------------
 * デザイン「サンプルサイト.dc.html」の DCLogic 相当を素の JS で再現する。
 * サーバ側（静的HTML / WordPress テーマ）が描画済みの DOM を操作するだけなので、
 * apps/samples/demo01 と apps/samples/wp で同一のこのファイルを使用できる。
 *
 * 扱う状態（デザインの state に対応）:
 *   mode      … 'cms' | 'wp'   … 速度比較の表示モード（ShareDan CMS / WordPress）
 *   showApi   … 速度比較バー（ページ全体の表示速度）の表示ON/OFF
 *   newsCat   … お知らせのカテゴリ絞り込み（slug / 'all'）
 *   faqCat    … FAQのカテゴリ絞り込み（slug / 'all'）
 *   openFaq   … 開いているFAQ（アコーディオン）
 *   nonce     … 「再読み込み」で加算し、計測値を微増させる
 *   formSent  … お問い合わせ送信完了の表示切替
 * ========================================================================= */
(function () {
  'use strict'

  var state = { mode: 'cms', showApi: false, newsCat: 'all', faqCat: 'all', nonce: 0, measured: { cms: null, wp: null } }

  // このページ自身のモード（サーバ描画の初期アクティブ。html版=cms / WordPress版=wp）。
  // モード切替ボタンは「相手」モードが押され、かつ相手URLが設定済みのときだけ遷移する。
  var selfMode = 'cms'

  // 比較先サイトのURL（環境ごとに差し替える）。
  //   静的HTML版 … index.html の window.SAMPLE_URLS
  //   WordPress版 … functions.php（定数 or フィルタ demo_sample_urls）で出力
  // 未設定（空）なら遷移せず、これまで通り見た目の切替のみ行う。
  function sampleUrls() {
    return (window.SAMPLE_URLS && typeof window.SAMPLE_URLS === 'object') ? window.SAMPLE_URLS : {}
  }

  // ---- 実測（速度比較を「実際の計測値」で表示する） ----
  // 指標はどちらのサイトでも比較可能な「HTMLドキュメントの応答時間（サーバ処理＋転送）」に統一する。
  //   自ページ … Navigation Timing の responseEnd（このページを取得し終えるまで）
  //   相手サイト … その URL を fetch し終えるまでの実測（cross-origin は no-cors で計測のみ行う）
  // 計測できない環境（file:// / 相手URL未設定 / 到達不可）では従来の目安値にフォールバックする。
  var now = (window.performance && performance.now) ? function () { return performance.now() } : function () { return Date.now() }

  function navResponseMs() {
    try {
      var e = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null
      if (e && e.responseEnd > 0) return Math.max(1, Math.round(e.responseEnd - e.startTime))
      var t = performance.timing
      if (t && t.responseEnd > 0 && t.navigationStart > 0) return Math.max(1, t.responseEnd - t.navigationStart)
    } catch (err) { /* 非対応環境はフォールバック */ }
    return null
  }

  function fetchMs(url, cb) {
    if (!url || typeof fetch !== 'function') { cb(null); return }
    var t0 = now()
    fetch(url, { mode: 'no-cors', cache: 'no-store' })
      .then(function () { cb(Math.max(1, Math.round(now() - t0))) })
      .catch(function () { cb(null) })
  }

  function other(mode) { return mode === 'cms' ? 'wp' : 'cms' }

  // 自ページ（実測）＋ 相手サイト（fetch実測）を計測して画面へ反映する
  function measure() {
    var self = navResponseMs()
    if (self != null) { state.measured[selfMode] = self; render() }
    fetchMs(sampleUrls()[other(selfMode)], function (ms) {
      if (ms != null) { state.measured[other(selfMode)] = ms; render() }
    })
  }

  function $(sel, root) { return (root || document).querySelector(sel) }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)) }

  // ---- 速度比較バーの計測値（ページ全体の表示速度。デザインの renderVals 相当） ----
  function metrics() {
    var isWp = state.mode === 'wp'
    var jitter = state.nonce % 5
    // 実測値があればそれを表示し、無ければ従来の目安値（未計測環境向けフォールバック）
    var cmsTotal = state.measured.cms != null ? state.measured.cms : 96 + jitter * 4
    var wpTotal = state.measured.wp != null ? state.measured.wp : 1180 + jitter * 45
    return {
      isWp: isWp,
      cmsTotal: cmsTotal,
      wpTotal: wpTotal,
      ratio: (wpTotal / cmsTotal).toFixed(1),
      cmsWidth: Math.round(cmsTotal / wpTotal * 100) + '%',
      modeName: isWp ? 'WordPress版' : 'ShareDan CMS版',
    }
  }

  // 絞り込み後に表示されている件数（news / faq）
  function visibleCount(kind) {
    return $all('.' + kind + '-item').filter(function (el) { return el.style.display !== 'none' }).length
  }

  function setText(sel, text) { var el = $(sel); if (el) el.textContent = text }

  // ---- 画面へ反映 ----
  function render() {
    var m = metrics()

    // 速度比較バー
    setText('[data-cms-total]', m.cmsTotal)
    setText('[data-wp-total]', m.wpTotal)
    setText('[data-ratio]', m.ratio)
    var cmsFill = $('[data-cms-fill]'); if (cmsFill) cmsFill.style.width = m.cmsWidth
    var badge = $('[data-mode-badge]')
    if (badge) { badge.textContent = m.modeName; badge.classList.toggle('is-wp', m.isWp) }

    // 件数（言語別テンプレートを data-count-tpl で受け取る。未設定時は日本語の既定＝WP版と同一挙動）
    var countEl = $('[data-news-count]')
    if (countEl) {
      var countTpl = countEl.getAttribute('data-count-tpl') || '{n}件を表示しています'
      countEl.textContent = countTpl.replace('{n}', visibleCount('news'))
    }

    // モード切替ボタンの状態
    $all('[data-mode]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-mode') === state.mode)
    })

    // 計測ON/OFF
    document.body.classList.toggle('show-api', state.showApi)
    var apiBtn = $('[data-toggle-api]')
    if (apiBtn) {
      apiBtn.classList.toggle('is-on', state.showApi)
      var lbl = $('[data-api-label]', apiBtn)
      if (lbl) lbl.textContent = state.showApi ? 'ON' : 'OFF'
    }
  }

  // ---- 絞り込み（表示/非表示の切替のみ。件数はDOMから数える） ----
  function applyFilter(kind, cat) {
    $all('.' + kind + '-item').forEach(function (el) {
      var match = cat === 'all' || el.getAttribute('data-cat') === cat
      el.style.display = match ? '' : 'none'
    })
    $all('[data-' + kind + '-tab]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-' + kind + '-tab') === cat)
    })
  }

  // ---- 製品ラインアップ（横スライドのカルーセル。デザインの products スライダー相当） ----
  // カード幅は固定（.product-card=252px）。表示可能枚数（perView）は viewport 幅から算出し、
  // スライド数（slideMax）＝ 全枚数 − perView + 1。狭い画面では自然に1枚送りになる。
  var productSlide = 0
  var PRODUCT_GAP = 20

  function refreshProducts() {
    var root = $('[data-products]')
    if (!root) return
    var track = $('[data-products-track]', root)
    if (!track) return
    var cards = $all('.product-card', track)
    var count = cards.length
    if (count === 0) return
    var viewport = $('[data-products-viewport]', root) || root
    var cardW = cards[0].offsetWidth || 252
    var vw = viewport.clientWidth || count * (cardW + PRODUCT_GAP)
    // デザインは1画面4枚（perView=4）。実幅から算出しつつ、端が少し覗く配置は許容する（round）。
    var perView = Math.max(1, Math.round((vw + PRODUCT_GAP) / (cardW + PRODUCT_GAP)))
    var slideMax = Math.max(1, count - perView + 1)
    if (productSlide > slideMax - 1) productSlide = slideMax - 1
    if (productSlide < 0) productSlide = 0

    track.style.transform = 'translateX(' + (-productSlide * (cardW + PRODUCT_GAP)) + 'px)'
    setText('[data-products-pos]', String(productSlide + 1))
    setText('[data-products-max]', String(slideMax))

    var prevBtn = $('[data-products-prev]', root); if (prevBtn) prevBtn.disabled = productSlide <= 0
    var nextBtn = $('[data-products-next]', root); if (nextBtn) nextBtn.disabled = productSlide >= slideMax - 1

    var dotsEl = $('[data-products-dots]', root)
    if (dotsEl) {
      if (dotsEl.children.length !== slideMax) {
        dotsEl.innerHTML = ''
        for (var i = 0; i < slideMax; i++) {
          (function (idx) {
            var dot = document.createElement('button')
            dot.type = 'button'
            dot.className = 'pc-dot' + (idx === productSlide ? ' is-active' : '')
            dot.setAttribute('aria-label', (idx + 1) + '番目の製品グループへ')
            dot.addEventListener('click', function () { productSlide = idx; refreshProducts() })
            dotsEl.appendChild(dot)
          })(i)
        }
      } else {
        $all('.pc-dot', dotsEl).forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === productSlide)
        })
      }
    }
  }

  function initProducts() {
    var root = $('[data-products]')
    if (!root) return
    if (root.getAttribute('data-pc-bound') !== '1') {
      root.setAttribute('data-pc-bound', '1')
      var prevBtn = $('[data-products-prev]', root)
      var nextBtn = $('[data-products-next]', root)
      if (prevBtn) prevBtn.addEventListener('click', function () { productSlide--; refreshProducts() })
      if (nextBtn) nextBtn.addEventListener('click', function () { productSlide++; refreshProducts() })
      window.addEventListener('resize', refreshProducts)
    }
    refreshProducts()
  }

  // 公開APIから製品カードを差し替えたあと（cms.js）に再初期化できるよう公開する
  window.__reinitProducts = initProducts

  // ---- イベント委譲 ----
  document.addEventListener('click', function (e) {
    var t

    // モード切替（ShareDan CMS / WordPress）
    if ((t = e.target.closest('[data-mode]'))) {
      var target = t.getAttribute('data-mode')
      var urls = sampleUrls()
      // 相手モードが押され、そのURLが設定済みなら実サイトへ遷移（自サイトは遷移しない）
      if (target !== selfMode && urls[target]) {
        window.location.href = urls[target]; return
      }
      // 未設定 or 自サイト → 見た目の切替のみ
      state.mode = target; render(); return
    }
    // 再読み込み（相手サイトの応答をもう一度実測。未計測環境では目安値を微増）
    if (e.target.closest('[data-reload]')) {
      state.nonce++
      fetchMs(sampleUrls()[other(selfMode)], function (ms) {
        if (ms != null) { state.measured[other(selfMode)] = ms; render() }
      })
      render(); return
    }
    // 計測を表示 ON/OFF
    if (e.target.closest('[data-toggle-api]')) {
      state.showApi = !state.showApi; render(); return
    }
    // お知らせカテゴリ
    if ((t = e.target.closest('[data-news-tab]'))) {
      state.newsCat = t.getAttribute('data-news-tab'); applyFilter('news', state.newsCat); render(); return
    }
    // FAQカテゴリ
    if ((t = e.target.closest('[data-faq-tab]'))) {
      state.faqCat = t.getAttribute('data-faq-tab'); applyFilter('faq', state.faqCat); render(); return
    }
    // FAQアコーディオン（1件だけ開く）
    if ((t = e.target.closest('.faq-q'))) {
      var item = t.closest('.faq-item')
      var wasOpen = item.classList.contains('is-open')
      $all('.faq-item').forEach(function (el) { el.classList.remove('is-open') })
      if (!wasOpen) item.classList.add('is-open')
      return
    }
    // フォーム送信完了 → もう一度送信する
    if (e.target.closest('[data-reset-form]')) {
      var box = $('[data-form-box]'); if (box) box.classList.remove('is-sent'); return
    }
  })

  // お問い合わせ送信（デモのため実送信せず完了表示へ切替）
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-form]')
    if (!form) return
    e.preventDefault()
    var box = $('[data-form-box]'); if (box) box.classList.add('is-sent')
    var success = $('.form-success'); if (success) success.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })

  // 初期反映。サーバが描画した初期状態（アクティブなモード/タブ）を尊重する。
  //   静的HTML版は mode=cms、WordPress版は mode=wp を初期アクティブにしている。
  document.addEventListener('DOMContentLoaded', function () {
    var activeMode = $('[data-mode].is-active')
    if (activeMode) { state.mode = activeMode.getAttribute('data-mode'); selfMode = state.mode }
    var activeNews = $('[data-news-tab].is-active')
    if (activeNews) state.newsCat = activeNews.getAttribute('data-news-tab')
    var activeFaq = $('[data-faq-tab].is-active')
    if (activeFaq) state.faqCat = activeFaq.getAttribute('data-faq-tab')

    applyFilter('news', state.newsCat)
    applyFilter('faq', state.faqCat)
    render()

    // 製品ラインアップのカルーセルを初期化
    initProducts()

    // 速度比較を実際の計測値で反映する（自ページ実測＋相手サイトfetch実測）
    measure()
  })
})()
