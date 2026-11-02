/* =========================================================================
 * demo-cms（apps/samples/demo01）— 実行時のみの公開API連携
 * -------------------------------------------------------------------------
 * このサイトのコンテンツ（投稿／FAQ／代表メッセージ／製品ラインアップ）は
 * **ビルド時**に公開API（IF-001）から取得して静的HTMLへ焼き込む（src/lib/cms.mjs）。
 * このファイルが実行時に担うのは、静的化できない次の3つだけ：
 *
 *   1. メンテナンス状態の即時反映  … GET /api/v1/maintenance（FUN-025 / IF-006）
 *        管理画面でメンテON/OFFを切り替えた瞬間に反映する必要があるためビルド時に焼けない。
 *   2. お問い合わせフォーム        … GET /api/v1/forms/contact ＋ POST .../submissions（FUN-023）
 *        送信速度チェックの署名トークン（都度発行）とTurnstile、実送信は実行時のみ。
 *   3. パスワード保護の unlock     … POST /api/v1/posts/{type}/{slug}/unlock（簡易認証・SCR-104）
 *        保護中の投稿は本文が null で焼かれる。閲覧者の入力したパスワードと引き換えに本文を取得して差し替える。
 *
 * 多言語（9.10）: コンテンツはビルド時に言語別ページへ焼き込み済み。実行時に取得するフォーム定義／
 * メンテナンス状態／unlock の本文は、ページが示す言語（window.SHAREDAN_LANG）を locale として問い合わせる
 * （unlock も locale 付きで照合すると本文がタイトルと同じ言語の訳で返る）。
 * UI定型文言は window.SHAREDAN_I18N 経由で受け取る（未設定時は日本語の既定にフォールバック）。
 *
 * 設計方針:
 *   - 共通インタラクション（タブ絞り込み・FAQアコーディオン・製品カルーセル・送信完了表示）は
 *     js/main.js（html/wp 共有）が、サーバ描画済みDOMに対して動作する。
 *   - プログレッシブ・エンハンスメント。APIに接続できない場合もビルド済みの静的コンテンツは
 *     そのまま表示される（フォームは静的フォールバックのまま／ゲートは入力待ちのまま）。
 * ========================================================================= */
import {
  ShareDanCmsClient,
  ShareDanCmsApiError,
  renderProseMirror,
} from 'https://esm.sh/@sharedan/cms-sdk@0.7.2'

// -------------------------------------------------------------------------
// 接続設定。
// 既定は「同一オリジンのサーバー側プロキシ（public/api/cms-proxy.php・さくらのPHP）経由」で
// 公開APIへ中継する。X-API-KEY はプロキシ（サーバー側）が付与するため、ブラウザ側は鍵を持たない
// （＝CORS不要・鍵をJSに出さない）。テナント向けガイド guides/contact-form と同じ方式。
// ローカル開発などで公開APIを直叩きしたい場合は index.html で
//   window.SHAREDAN_CMS = { origin: 'http://localhost:8091', apiKey: '...', siteCode: 'demo-cms' }
// を定義すると、そのオリジンへ直接（鍵付きで）接続する。
// -------------------------------------------------------------------------
const CONFIG = {
  origin: null, // 明示すると直叩き。null なら同一オリジンのプロキシ経由（既定）。
  apiKey: null, // プロキシ経由では不要（サーバー側で付与）。直叩き時のみ指定する。
  siteCode: 'demo-cms', // m_sites.code
}
if (window.SHAREDAN_CMS && typeof window.SHAREDAN_CMS === 'object') {
  for (const key in window.SHAREDAN_CMS) {
    if (window.SHAREDAN_CMS[key] != null) CONFIG[key] = window.SHAREDAN_CMS[key]
  }
}

// 接続先の解決。CONFIG.origin が明示されていればそのオリジンへ直叩き、
// それ以外は同一オリジンのサーバー側プロキシ（cms-proxy.php）を既定にする。
function resolveBaseUrl() {
  if (CONFIG.origin) return CONFIG.origin
  return window.location.origin + '/api/cms-proxy.php'
}

const cms = new ShareDanCmsClient({
  baseUrl: resolveBaseUrl(),
  apiKey: CONFIG.apiKey || 'via-proxy', // プロキシ経由では未使用（ダミー）。直叩き時は CONFIG.apiKey。
  siteCode: CONFIG.siteCode,
  timeoutMs: 8000,
})

// -------------------------------------------------------------------------
// 小さなヘルパー
// -------------------------------------------------------------------------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
function $(sel, root) {
  return (root || document).querySelector(sel)
}

// -------------------------------------------------------------------------
// 多言語（9.10）: ページが示す言語と、実行時UIの定型文言。
// window.SHAREDAN_LANG … 公開APIへ渡す locale（'' は原文＝ja）。
// window.SHAREDAN_I18N … { form, maintenance, gate, fallbackNote }。未設定時は日本語の既定を使う。
// -------------------------------------------------------------------------
const LANG = (typeof window.SHAREDAN_LANG === 'string' && window.SHAREDAN_LANG) || ''
const I18N = (window.SHAREDAN_I18N && typeof window.SHAREDAN_I18N === 'object') ? window.SHAREDAN_I18N : {}
// locale 付きGET用のクエリ（原文のときは付けない）。
const localeQuery = LANG ? { locale: LANG } : undefined
// 日時のローカライズに使う BCP47 ロケール。LANG（en／zh-Hant 等）はそのまま BCP47 として使え、原文は ja-JP。
const DISPLAY_LOCALE = LANG || 'ja-JP'
// 文言取得（グループ内キーを引き、無ければ日本語の既定）。
function tt(group, key, fallback) {
  const g = I18N[group]
  const v = g && g[key]
  return (typeof v === 'string' && v !== '') ? v : fallback
}

// -------------------------------------------------------------------------
// お問い合わせフォーム（配信＋実送信。スパム対策はサーバ側で適用）
// -------------------------------------------------------------------------
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let turnstileScriptPromise = null
function ensureTurnstileScript() {
  if (window.turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise
  turnstileScriptPromise = new Promise(function (resolve, reject) {
    const s = document.createElement('script')
    s.src = TURNSTILE_SCRIPT_URL
    s.async = true
    s.defer = true
    s.onload = function () { resolve() }
    s.onerror = function () { turnstileScriptPromise = null; reject(new Error('Turnstile script load failed')) }
    document.head.appendChild(s)
  })
  return turnstileScriptPromise
}

// file項目の許可拡張子（FormController の許可MIME＝画像/PDF/Word/Excel/テキストに対応）
const FILE_ACCEPT = '.png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.txt'

// 入力コントロール（項目種別に応じて input / textarea / select を生成）
function fieldControl(f) {
  const name = esc(f.name)
  const req = f.required ? ' required' : ''
  if (f.type === 'textarea') {
    return '<textarea name="' + name + '" rows="5"' + req + '></textarea>'
  }
  if (f.type === 'select') {
    const placeholder = tt('form', 'selectPlaceholder', '選択してください')
    const opts = (f.options || []).map(function (o) {
      return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>'
    }).join('')
    return '<select name="' + name + '"' + req + '><option value="">' + esc(placeholder) + '</option>' + opts + '</select>'
  }
  if (f.type === 'file') {
    // ファイルはSDK経由で multipart 送信され、サーバ側でS3に保存＋自動でマルウェアスキャンされる
    const fileHint = tt('form', 'fileHint', 'PDF / 画像 / Word / Excel / テキスト・1件10MBまで。アップロードされたファイルは自動的にマルウェアスキャンされます。')
    return '<input type="file" name="' + name + '"' + req + ' accept="' + FILE_ACCEPT + '">' +
      '<span class="field-hint">' + esc(fileHint) + '</span>'
  }
  const type = f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'url' ? 'url' : 'text'
  return '<input type="' + type + '" name="' + name + '"' + req + '>'
}

function fieldHtml(f) {
  const req = f.required ? ' <span class="req">*</span>' : ''
  return '<div class="field"><label>' + esc(f.label) + req + '</label>' + fieldControl(f) + '</div>'
}

// text/email/tel は2カラム（form-row2）、textarea/select/file は全幅にしてデザインに合わせる
function buildFieldsHtml(fields) {
  let html = ''
  let buffer = []
  function flush() {
    while (buffer.length) {
      const pair = buffer.splice(0, 2)
      html += '<div class="form-row2">' + pair.map(fieldHtml).join('') + '</div>'
    }
  }
  fields.forEach(function (f) {
    if (f.type === 'textarea' || f.type === 'select' || f.type === 'file') {
      flush()
      html += fieldHtml(f)
    } else {
      buffer.push(f)
    }
  })
  flush()
  return html
}

async function renderContactForm() {
  const formBox = $('[data-form-box]')
  const formEl = $('[data-form]')
  if (!formBox || !formEl) return

  let form
  try {
    // locale 付き配信（多言語オプション有効時はフォーム名・項目ラベル等が翻訳される）。
    form = await cms.forms.get('contact', localeQuery)
  } catch {
    return // 配信失敗なら静的フォーム（main.js のデモ送信）のまま
  }

  const turnstileCfg = form.turnstile || {}
  const turnstileEnabled = !!(turnstileCfg.enabled && turnstileCfg.site_key)

  const submitLabel = tt('form', 'formSubmit', '送信する')
  formEl.innerHTML =
    '<div data-form-error style="display:none; font-size:13px; padding:11px 13px; border-radius:6px; color:#b3423a; background:#fbeae9;"></div>' +
    buildFieldsHtml(form.fields || []) +
    (turnstileEnabled ? '<div data-turnstile style="min-height:65px;"></div>' : '') +
    '<button type="submit" class="form-submit">' + esc(submitLabel) + '</button>'

  // Turnstile ウィジェット（配信レスポンスに site_key があるときのみ設置）
  let widgetId = null
  if (turnstileEnabled) {
    try {
      await ensureTurnstileScript()
      widgetId = window.turnstile.render(formEl.querySelector('[data-turnstile]'), { sitekey: turnstileCfg.site_key })
    } catch {
      widgetId = null
    }
  }

  const errEl = formEl.querySelector('[data-form-error]')
  const submitBtn = formEl.querySelector('.form-submit')
  function showError(text) {
    if (!errEl) return
    if (!text) { errEl.style.display = 'none'; return }
    errEl.textContent = text
    errEl.style.display = 'block'
  }

  formEl.addEventListener('submit', async function (e) {
    e.preventDefault()
    // main.js（documentレベル）のデモ送信ハンドラに伝播させない（実送信で完了表示する）
    e.stopPropagation()
    showError('')

    const values = {}
    ;(form.fields || []).forEach(function (f) {
      const input = formEl.querySelector('[name="' + f.name + '"]')
      if (!input) return
      if (f.type === 'file') {
        // File オブジェクトを渡すとSDKが自動で multipart/form-data 送信する（未添付の任意項目は送らない）
        if (input.files && input.files[0]) values[f.name] = input.files[0]
      } else {
        values[f.name] = input.value
      }
    })

    let turnstileToken = null
    if (turnstileEnabled) {
      turnstileToken = (widgetId != null && window.turnstile) ? window.turnstile.getResponse(widgetId) : ''
      if (!turnstileToken) {
        showError(tt('form', 'errTurnstile', 'スパム対策の確認（Turnstile）を完了してから送信してください。'))
        return
      }
    }

    submitBtn.disabled = true
    submitBtn.textContent = tt('form', 'formSubmitting', '送信中…')
    try {
      await cms.forms.submit('contact', {
        values: values,
        speedCheckToken: form.speed_check_token,
        turnstileToken: turnstileToken,
      })
      formEl.reset()
      formBox.classList.add('is-sent') // main.js の完了カード（.form-success）を表示
      const success = $('.form-success')
      if (success) success.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch (err) {
      let text = tt('form', 'errGeneric', '送信に失敗しました。時間をおいて再度お試しください。')
      if (err instanceof ShareDanCmsApiError) {
        if (err.isRateLimited) {
          const wait = err.retryAfter
            ? tt('form', 'rateSec', '{n}秒').replace('{n}', err.retryAfter)
            : tt('form', 'rateSoon', 'しばらく')
          text = tt('form', 'errRate', '送信が集中しています。{wait}後に再度お試しください。').replace('{wait}', wait)
        } else if (err.isValidationError) text = tt('form', 'errValidation', '入力内容をご確認ください（必須項目・メール形式など）。')
        else if (err.isBadRequest) text = tt('form', 'errBadRequest', '送信内容を確認できませんでした。ページを再読み込みしてお試しください。')
      }
      showError(text)
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = tt('form', 'formSubmit', '送信する')
      // Turnstile トークンは1回限り。送信を試みたらリセットして再取得させる
      if (turnstileEnabled && widgetId != null && window.turnstile) {
        window.turnstile.reset(widgetId)
      }
    }
  })
}

// -------------------------------------------------------------------------
// サイトメンテナンス（公開API GET /api/v1/maintenance ＝ FUN-025 / IF-006）
// 公開サイトはこの値を見てメンテナンス画面の表示要否を判断する（api.yaml）。
//   maintenance:true → 見出し・案内・再開予定日時つきの全画面メンテナンス画面を表示。
//   maintenance:false／接続不可 → 通常表示のまま（静的コンテンツを壊さない）。
// メンテナンス状態は独立エンドポイントで、uses_* 設定に関わらず常に応答する。
// -------------------------------------------------------------------------
// 起動ゲート（index.html head が本文を一時的に隠している）が長引かないよう、
// メンテナンス確認は上限時間で打ち切る。打ち切り時は「メンテナンス外」とみなして本文を表示する。
function withTimeout(promise, ms) {
  return new Promise(function (resolve) {
    const t = setTimeout(function () { resolve(undefined) }, ms)
    promise.then(
      function (v) { clearTimeout(t); resolve(v) },
      function () { clearTimeout(t); resolve(undefined) } // 接続不可・エラーも undefined 扱い
    )
  })
}

// 起動ゲートを解除して本文を表示する（保険タイマーも止める）。
function revealSite() {
  if (window.__sdRevealTimer) { clearTimeout(window.__sdRevealTimer); window.__sdRevealTimer = null }
  document.documentElement.classList.remove('sd-booting')
}

// メンテナンス状態を確認する。メンテナンス中なら全画面画面を表示して true を返す。
// 非メンテナンス／接続不可／タイムアウト時は false を返す（呼び出し側が本文を表示する）。
async function checkMaintenance() {
  // メンテナンス状態を取得（no-store）。多言語有効時は locale で title/message が翻訳される。5秒でゲート打ち切り。
  const data = await withTimeout(cms.maintenance.get(localeQuery), 5000)
  if (!data || data.maintenance !== true) return false
  showMaintenanceScreen(data)
  return true
}

// 再開予定日時（ISO8601）を表示言語のロケールで整形（ja は「2026年8月15日 06:00」）。
// resumes_at は翻訳対象外（APIは原文のISO文字列を返す）だが、表示文字列は見ている言語に合わせる。
function fmtResumesAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  try {
    return d.toLocaleString(DISPLAY_LOCALE, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return String(iso).slice(0, 16).replace('T', ' ')
  }
}

// 全画面メンテナンス画面を生成して表示する（ページ全体を覆い、背後のスクロールを止める）
function showMaintenanceScreen(data) {
  if (document.getElementById('sd-maintenance')) return
  const title = data.title || 'ただいまメンテナンス中です'
  const message = data.message || 'サービス改善のためメンテナンスを実施しています。ご不便をおかけし申し訳ございません。'
  const resumes = fmtResumesAt(data.resumes_at)

  const overlay = document.createElement('div')
  overlay.id = 'sd-maintenance'
  overlay.setAttribute('role', 'alert')
  overlay.setAttribute('style', 'visibility:visible; position:fixed; inset:0; z-index:2147483000; background:linear-gradient(165deg,#0f1e34,#1b2f4d); color:#fff; display:flex; align-items:center; justify-content:center; padding:28px; overflow-y:auto;')
  overlay.innerHTML =
    '<div style="max-width:560px; text-align:center;">' +
      '<div style="font-size:56px; line-height:1; margin-bottom:22px;">🛠️</div>' +
      '<h1 style="font-size:27px; font-weight:800; letter-spacing:.01em; margin:0 0 18px;">' + esc(title) + '</h1>' +
      '<p style="font-size:15px; line-height:2; color:#c4d2df; margin:0 0 26px; white-space:pre-wrap;">' + esc(message) + '</p>' +
      (resumes
        ? '<div style="display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#fff; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.22); padding:9px 18px; border-radius:6px;">' +
            '<span>' + esc(tt('maintenance', 'resumes', '再開予定')) + '</span><span style="font-variant-numeric:tabular-nums;">' + esc(resumes) + '</span>' +
          '</div>'
        : '') +
      '<div style="margin-top:30px; font-size:12px; color:#7d93a9;">Powered by ShareDan CMS</div>' +
    '</div>'

  document.body.appendChild(overlay)
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
}

// -------------------------------------------------------------------------
// パスワード保護（簡易認証・SCR-104）: ゲートを配線し、閲覧者の入力を unlock で照合して本文へ差し替える。
// 保護中の投稿詳細は本文が null で焼かれ、記事本体に [data-pw-gate] が描画されている（post-article.mjs）。
// unlock はページの言語（LANG）を locale として照合するため、本文もタイトルと同じ言語の訳で返る
// （訳が無く原文フォールバックした場合のみ translation_available:false となり「原文表示中」を注記する）。
// -------------------------------------------------------------------------
function wirePasswordGate() {
  const gate = $('[data-pw-gate]')
  if (!gate) return

  const postType = gate.getAttribute('data-post-type') || 'news'
  const slug = gate.getAttribute('data-post-slug') || ''
  const backHref = gate.getAttribute('data-back-href') || ''
  const backLabel = gate.getAttribute('data-back-label') || ''

  const formEl = gate.querySelector('[data-pw-form]')
  const input = gate.querySelector('[data-pw-input]')
  const toggle = gate.querySelector('[data-pw-toggle]')
  const errEl = gate.querySelector('[data-pw-error]')
  const box = gate.querySelector('.pw-gate__box')
  const submitBtn = gate.querySelector('[data-pw-submit]')
  if (!formEl || !input || !submitBtn) return

  function showError(msg) {
    if (box) box.classList.toggle('is-error', !!msg)
    if (!errEl) return
    if (!msg) { errEl.hidden = true; errEl.textContent = ''; return }
    errEl.textContent = msg
    errEl.hidden = false
  }

  // 表示／隠す トグル
  if (toggle) {
    toggle.addEventListener('click', function () {
      const reveal = input.type === 'password'
      input.type = reveal ? 'text' : 'password'
      toggle.textContent = reveal ? tt('gate', 'hide', '隠す') : tt('gate', 'show', '表示')
      input.focus()
    })
  }

  // 入力し直したらエラー表示を消す
  input.addEventListener('input', function () { showError('') })

  formEl.addEventListener('submit', async function (e) {
    e.preventDefault()
    showError('')
    const pw = input.value
    if (!pw) { showError(tt('gate', 'error', 'パスワードが正しくありません。もう一度お試しください。')); return }

    const origLabel = submitBtn.textContent
    submitBtn.disabled = true
    submitBtn.textContent = tt('gate', 'submitting', '確認中…')
    try {
      // 正しいパスワードなら本文入りの PostDetail が返る（誤り=401／試行超過=429／未存在=404）。
      // locale 付きで照合し、本文もページの言語の訳で受け取る（原文ページでは localeQuery=undefined）。
      const post = await cms.posts.unlock(postType, slug, pw, localeQuery)
      revealUnlockedBody(gate, post, { backHref, backLabel })
    } catch (err) {
      if (err instanceof ShareDanCmsApiError) {
        if (err.isUnauthorized) showError(tt('gate', 'error', 'パスワードが正しくありません。もう一度お試しください。'))
        else if (err.isRateLimited) showError(tt('gate', 'throttled', '試行回数が上限に達しました。しばらくしてからもう一度お試しください。'))
        else showError(tt('gate', 'failed', '確認に失敗しました。通信環境を確認して、もう一度お試しください。'))
      } else {
        showError(tt('gate', 'failed', '確認に失敗しました。通信環境を確認して、もう一度お試しください。'))
      }
      submitBtn.disabled = false
      submitBtn.textContent = origLabel
      input.focus()
    }
  })
}

// 認証成功: ゲートを「認証バナー＋本文（＋原文注記・戻り導線）」へ差し替える。
function revealUnlockedBody(gate, post, opts) {
  const parts = []
  parts.push('<div class="pw-unlocked" data-pw-banner>')
  parts.push('<svg class="pw-unlocked__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg>')
  parts.push('<span class="pw-unlocked__msg">' + esc(tt('gate', 'unlockedMsg', '認証しました。')) + '</span>')
  parts.push('<button type="button" class="pw-unlocked__relock" data-pw-relock>' + esc(tt('gate', 'relock', 'ロックする')) + '</button>')
  parts.push('</div>')
  // 多言語（9.10）: locale 付き unlock は本文も訳文で返る。訳が無く原文へフォールバックした場合
  // （translation_available===false）のみ「原文表示中」を明示する（post-article.mjs と同じ判定）。
  if (post && post.translation_available === false) {
    const note = I18N.fallbackNote
    if (note) parts.push('<div class="article__fallback-note">' + esc(note) + '</div>')
  }
  parts.push('<div class="article__body">' + renderProseMirror(post && post.body) + '</div>')
  if (opts.backHref) {
    parts.push('<a class="article__back" href="' + esc(opts.backHref) + '">' + esc(opts.backLabel) + '</a>')
  }

  // ゲートとデモ案内（兄弟要素）を取り除いて差し替える。
  const demo = gate.parentNode ? gate.parentNode.querySelector('.pw-gate__demo') : null
  gate.outerHTML = parts.join('')
  if (demo) demo.remove()

  // ロックする → 再読み込みでゲートに戻す（unlock 状態は保持しない）。
  const relock = document.querySelector('[data-pw-relock]')
  if (relock) relock.addEventListener('click', function () { window.location.reload() })
  const banner = document.querySelector('[data-pw-banner]')
  if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// -------------------------------------------------------------------------
// 起動。メンテナンス確認→（非メンテ時）本文表示＋フォーム配線＋ゲート配線。
// コンテンツ本体はビルド時に描画済みのため、ここでは触らない。
// -------------------------------------------------------------------------
async function boot() {
  // メンテナンス状態を最初に確認する。メンテナンス中は本文（head ゲートで一時的に非表示）を
  // 出さず、全画面オーバーレイのみ表示する。
  const maint = await checkMaintenance()
  if (maint) return // 本文は隠したまま。オーバーレイが全面を覆う。
  revealSite() // メンテナンス外／接続不可／タイムアウト：本文を表示してからフォーム／ゲートを配線する
  renderContactForm().catch(function () {})
  wirePasswordGate()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
