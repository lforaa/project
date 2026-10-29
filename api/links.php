<?php
// Steam (OpenID 2.0) ve Discord (OAuth2) hesap bağlama
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/links.php';

$action = $_GET['action'] ?? '';
const UA = 'User-Agent: ShowroomLinker/1.0';

// ---------- yardımcılar ----------
function b64u_enc(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/')); }

// Durum (state): kullanıcı + sağlayıcı + son kullanma, HMAC ile imzalı. Sunucuda saklanmaz.
function make_state(int $uid, string $provider): string {
  $payload = b64u_enc(json_encode(['u' => $uid, 'p' => $provider, 'e' => time() + 600, 'n' => bin2hex(random_bytes(8))]));
  return $payload . '.' . hash_hmac('sha256', $payload, LINK_SECRET);
}

function read_state(string $state, string $provider): ?int {
  $parts = explode('.', $state);
  if (count($parts) !== 2) return null;
  if (!hash_equals(hash_hmac('sha256', $parts[0], LINK_SECRET), $parts[1])) return null;
  $d = json_decode(b64u_dec($parts[0]), true);
  if (!is_array($d) || ($d['p'] ?? '') !== $provider || (int)($d['e'] ?? 0) < time()) return null;
  return (int)$d['u'];
}

function back_to(string $result) {
  header('Location: ' . APP_URL . '/?link=' . urlencode($result) . '#/checkout');
  exit;
}

function http_request(string $url, ?array $post = null, array $headers = []): ?string {
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => array_merge([UA], $headers)]);
  if ($post !== null) {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post));
  }
  $res = curl_exec($ch);
  curl_close($ch);
  return $res === false ? null : $res;
}

function save_link(int $uid, string $provider, string $id, ?string $name) {
  $col = $provider === 'steam' ? 'steam_id' : 'discord_id'; // sabit beyaz liste
  $stmt = db()->prepare("SELECT id FROM users WHERE $col = ? AND id <> ?");
  $stmt->execute([$id, $uid]);
  if ($stmt->fetch()) back_to('error_taken');

  if ($provider === 'steam') {
    db()->prepare('UPDATE users SET steam_id = ? WHERE id = ?')->execute([$id, $uid]);
  } else {
    db()->prepare('UPDATE users SET discord_id = ?, discord_name = ? WHERE id = ?')->execute([$id, $name, $uid]);
  }
  back_to($provider . '_ok');
}

// ---------- 1) Bağlamayı başlat: yönlendirilecek adresi döner ----------
if ($action === 'start') {
  $user = require_auth();
  $provider = $_GET['provider'] ?? '';
  if (!in_array($provider, ['steam', 'discord'], true)) json_error('Geçersiz sağlayıcı.');
  if (LINK_SECRET === 'DEGISTIR-BUNU-uzun-rastgele-bir-metin') json_error('Sunucuda LINK_SECRET ayarlanmamış (api/config/links.php).', 500);

  $state = make_state((int)$user['id'], $provider);

  if ($provider === 'steam') {
    $p = parse_url(API_PUBLIC_URL);
    $realm = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
    $url = 'https://steamcommunity.com/openid/login?' . http_build_query([
      'openid.ns' => 'http://specs.openid.net/auth/2.0',
      'openid.mode' => 'checkid_setup',
      'openid.return_to' => API_PUBLIC_URL . '/links.php?action=steam_callback&state=' . $state,
      'openid.realm' => $realm,
      'openid.identity' => 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id' => 'http://specs.openid.net/auth/2.0/identifier_select',
    ]);
  } else {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) json_error('Discord ayarları yapılmamış (api/config/links.php).', 500);
    $url = 'https://discord.com/api/oauth2/authorize?' . http_build_query([
      'client_id' => DISCORD_CLIENT_ID,
      'redirect_uri' => API_PUBLIC_URL . '/links.php?action=discord_callback',
      'response_type' => 'code',
      'scope' => 'identify',
      'state' => $state,
    ]);
  }
  json_response(['url' => $url]);
}

// ---------- 2a) Steam dönüşü: imzayı Steam'e doğrulat ----------
if ($action === 'steam_callback') {
  $stateStr = $_GET['state'] ?? '';
  $uid = read_state($stateStr, 'steam');
  if (!$uid) back_to('error_state');

  // PHP, "openid.mode" gibi anahtarlardaki noktayı alt çizgiye çevirir; ham sorgudan okuyoruz.
  $params = [];
  foreach (explode('&', $_SERVER['QUERY_STRING'] ?? '') as $pair) {
    if ($pair === '') continue;
    [$k, $v] = array_pad(explode('=', $pair, 2), 2, '');
    $k = urldecode($k);
    if (strpos($k, 'openid.') === 0) $params[$k] = urldecode($v);
  }

  $expectedReturn = API_PUBLIC_URL . '/links.php?action=steam_callback&state=' . $stateStr;
  if (($params['openid.mode'] ?? '') !== 'id_res' || ($params['openid.return_to'] ?? '') !== $expectedReturn) back_to('error_steam');

  $params['openid.mode'] = 'check_authentication';
  $res = http_request('https://steamcommunity.com/openid/login', $params);
  if (!$res || !preg_match('/is_valid\s*:\s*true/', $res)) back_to('error_steam');
  if (!preg_match('~^https://steamcommunity\.com/openid/id/(\d{17})$~', $params['openid.claimed_id'] ?? '', $m)) back_to('error_steam');

  save_link($uid, 'steam', $m[1], null);
}

// ---------- 2b) Discord dönüşü: kodu token'a çevir, kullanıcıyı oku ----------
if ($action === 'discord_callback') {
  $uid = read_state($_GET['state'] ?? '', 'discord');
  if (!$uid) back_to('error_state');
  if (empty($_GET['code'])) back_to('error_discord'); // kullanıcı iptal etti

  $tok = json_decode((string)http_request('https://discord.com/api/oauth2/token', [
    'client_id' => DISCORD_CLIENT_ID,
    'client_secret' => DISCORD_CLIENT_SECRET,
    'grant_type' => 'authorization_code',
    'code' => $_GET['code'],
    'redirect_uri' => API_PUBLIC_URL . '/links.php?action=discord_callback',
  ], ['Content-Type: application/x-www-form-urlencoded']), true);
  if (empty($tok['access_token'])) back_to('error_discord');

  $me = json_decode((string)http_request('https://discord.com/api/users/@me', null, ['Authorization: Bearer ' . $tok['access_token']]), true);
  if (empty($me['id'])) back_to('error_discord');

  save_link($uid, 'discord', (string)$me['id'], $me['global_name'] ?? $me['username'] ?? null);
}

// ---------- 3) Bağlantıyı kaldır ----------
if ($action === 'unlink') {
  $user = require_auth();
  $provider = get_input()['provider'] ?? '';
  if ($provider === 'steam') {
    db()->prepare('UPDATE users SET steam_id = NULL WHERE id = ?')->execute([$user['id']]);
  } elseif ($provider === 'discord') {
    db()->prepare('UPDATE users SET discord_id = NULL, discord_name = NULL WHERE id = ?')->execute([$user['id']]);
  } else {
    json_error('Geçersiz sağlayıcı.');
  }
  json_response(['success' => true]);
}

json_error('Geçersiz işlem.', 404);