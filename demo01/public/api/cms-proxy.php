<?php

/**
 * ShareDan CMS 公開API（IF-001）の「サーバー側中継」プロキシ。
 * =========================================================================
 * 目的:
 *   静的サイト（Astroビルド → さくらのレンタルサーバ等・PHP実行可）から公開APIを
 *   利用する際、ブラウザに X-API-KEY を出さず、CORSにも依存しないための薄い中継。
 *   ブラウザは「同一オリジンの本ファイル」だけを叩き、鍵の付与は本ファイル（サーバー側）が行う。
 *
 *     ブラウザ ──(同一オリジン)──▶ cms-proxy.php ──(X-API-KEY付与)──▶ 公開API
 *
 *   → 同一オリジンなので CORS 不要。X-API-KEY はサーバー側にのみ存在する。
 *
 * ブラウザ側の使い方（@sharedan/cms-sdk）:
 *   new ShareDanCmsClient({ baseUrl: `${location.origin}/api/cms-proxy.php`, apiKey: 'via-proxy', siteCode: 'via-proxy' })
 *   SDK は `.../cms-proxy.php/api/v1/forms/<key>` のように PATH_INFO 付きで叩く（.htaccess 不要）。
 *   apiKey / siteCode はダミーで良い（本ファイルがサーバー側の設定値で必ず上書きする）。
 *
 * 設定（サーバー側のみ・ブラウザには出ない）:
 *   同ディレクトリの cms-proxy.config.php（デプロイ時に生成／リポジトリには置かない）を優先し、
 *   無ければ環境変数、最後に既定値を使う:
 *     CMS_API_ORIGIN … 公開APIのオリジン（既定 https://api.cms.sharedan.co.jp・末尾スラッシュ不要）
 *     CMS_API_KEY    … テナントの公開APIキー（X-API-KEY）※必須
 *     CMS_SITE_CODE  … サイト識別子（X-SITE-CODE / m_sites.code）※必須
 *
 * 中継対象（許可リスト。開放プロキシにはしない）:
 *   GET  /api/v1/forms/{key}
 *   POST /api/v1/forms/{key}/submissions        （application/json / multipart-form-data 両対応）
 *   GET  /api/v1/maintenance
 *   GET  /api/v1/posts/{type}/{slug}/preview     （下書きプレビュー・X-PREVIEW-TOKEN を透過）
 *   POST /api/v1/posts/{type}/{slug}/unlock      （パスワード保護の本文取得・簡易認証 SCR-104）
 *
 * クエリ文字列（例 ?locale=en）はそのまま上流へ透過する（多言語オプション 9.10 のフォーム定義・
 * メンテナンス状態の言語指定に使う）。パスは上の許可リストで限定済み。
 */

// --- 設定読み込み（config.php > 環境変数 > 既定） -------------------------------
$config = [];
$configFile = __DIR__ . '/cms-proxy.config.php';
if (is_file($configFile)) {
    $loaded = require $configFile; // ['CMS_API_ORIGIN' => ..., 'CMS_API_KEY' => ..., 'CMS_SITE_CODE' => ...]
    if (is_array($loaded)) {
        $config = $loaded;
    }
}

$cfg = static function (string $key, string $default = '') use ($config): string {
    if (isset($config[$key]) && $config[$key] !== '') {
        return (string) $config[$key];
    }
    $env = getenv($key);

    return ($env !== false && $env !== '') ? $env : $default;
};

$origin = rtrim($cfg('CMS_API_ORIGIN', 'https://api.cms.sharedan.co.jp'), '/');
$apiKey = $cfg('CMS_API_KEY');
$siteCode = $cfg('CMS_SITE_CODE');

header('Content-Type: application/json; charset=utf-8');

if ($apiKey === '' || $siteCode === '') {
    http_response_code(500);
    echo json_encode(['message' => 'proxy is not configured']);
    exit;
}

// --- リクエストパス（PATH_INFO）を取り出す -------------------------------------
$pathInfo = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
if ($pathInfo === '') {
    // PATH_INFO が無い環境向け: REQUEST_URI から自スクリプト名以降を切り出す
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
    $self = $_SERVER['SCRIPT_NAME'] ?? '';
    if ($self !== '' && strpos($uri, $self) === 0) {
        $pathInfo = substr($uri, strlen($self));
    }
}
$path = '/' . ltrim($pathInfo, '/'); // 例: /api/v1/forms/feedback
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// --- 許可リスト照合（method × パス） ------------------------------------------
$allowed =
    ($method === 'GET' && preg_match('#^/api/v1/forms/[^/]+$#', $path)) ||
    ($method === 'POST' && preg_match('#^/api/v1/forms/[^/]+/submissions$#', $path)) ||
    ($method === 'GET' && $path === '/api/v1/maintenance') ||
    ($method === 'GET' && preg_match('#^/api/v1/posts/[^/]+/[^/]+/preview$#', $path)) ||
    ($method === 'POST' && preg_match('#^/api/v1/posts/[^/]+/[^/]+/unlock$#', $path));

if (!$allowed) {
    http_response_code(404);
    echo json_encode(['message' => 'not found']);
    exit;
}

// --- 公開APIへ中継 ------------------------------------------------------------
// クエリ文字列（?locale= 等）はそのまま透過する。パスは許可リストで限定済み。
$queryString = $_SERVER['QUERY_STRING'] ?? '';
$target = $origin . $path . ($queryString !== '' ? '?' . $queryString : '');
$ch = curl_init($target);

$headers = [
    'X-API-KEY: ' . $apiKey,
    'X-SITE-CODE: ' . $siteCode,
    'Accept: application/json',
    // 公開APIの前段WAF（AWSマネージド Core rule set の NoUserAgent_HEADER）は
    // User-Agent 欠落リクエストを 403 で遮断する。PHP の curl は既定で User-Agent を
    // 送らないため、本中継が自身を名乗る User-Agent を明示的に付与する（これが無いと
    // GET /api/v1/forms/{key} 等が CloudFront で "Request blocked" となり 403 になる）。
    'User-Agent: ShareDan-CMS-Proxy/1.0 (+https://demo-cms.sharedan.biz)',
    'Expect:', // 大きめのPOSTでの 100-continue を抑止（ヘッダ分割を避ける）
];

// 下書きプレビューのトークンはブラウザが持つ正当な一時トークン。送られてきたら透過する
// （プレビュー配信 GET /api/v1/posts/{type}/{slug}/preview 用）。鍵と違い秘匿対象ではない。
$previewToken = $_SERVER['HTTP_X_PREVIEW_TOKEN'] ?? '';
if ($previewToken !== '') {
    $headers[] = 'X-PREVIEW-TOKEN: ' . $previewToken;
}

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true); // レート制限系ヘッダを返すためレスポンスヘッダも取得
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

if ($method === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'multipart/form-data') !== false) {
        // ファイル添付を含む送信。$_POST + $_FILES を CURLFile で再構成する
        // （配列を CURLOPT_POSTFIELDS に渡すと curl が境界付き multipart を生成する）。
        $body = [];
        foreach ($_POST as $k => $v) {
            $body[$k] = $v;
        }
        foreach ($_FILES as $k => $f) {
            if (is_array($f) && !empty($f['tmp_name']) && is_uploaded_file($f['tmp_name'])) {
                $body[$k] = new CURLFile($f['tmp_name'], $f['type'] ?: 'application/octet-stream', $f['name']);
            }
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    } else {
        // JSON（その他の生ボディ）はそのまま透過する
        $raw = file_get_contents('php://input');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $raw);
        $headers[] = 'Content-Type: ' . ($contentType !== '' ? $contentType : 'application/json');
    }
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    echo json_encode(['message' => 'upstream request failed']);
    curl_close($ch);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

// --- レスポンスを返す（本文＋必要なヘッダのみ透過） -----------------------------
http_response_code($status ?: 502);
foreach (explode("\r\n", $rawHeaders) as $line) {
    // レート制限系ヘッダはブラウザ（SDK）が参照するので透過する
    if (preg_match('#^(X-RateLimit-[^:]+|Retry-After)\s*:#i', $line)) {
        header($line, true);
    }
}
header('Content-Type: application/json; charset=utf-8', true);
echo $body;
