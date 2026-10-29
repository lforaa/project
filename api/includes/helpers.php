<?php
// Tüm API cevapları JSON olarak döner
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

function json_response($data, int $code = 200) {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function json_error(string $message, int $code = 400) {
  json_response(['error' => $message], $code);
}

function get_input(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  if (!is_array($data)) $data = [];
  // GET/POST ile gelen verileri de birleştir
  $data = array_merge($_GET, $_POST, $data);
  return $data;
}

function get_bearer_token(): ?string {
  $headers = getallheaders();
  $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
  if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
    return trim($m[1]);
  }
  return null;
}

function require_auth(): array {
  $token = get_bearer_token();
  if (!$token) json_error('Giriş yapmanız gerekiyor.', 401);

  $stmt = db()->prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
  $stmt->execute([(int)$token]);
  $user = $stmt->fetch();
  if (!$user) json_error('Geçersiz oturum.', 401);
  return $user;
}

function require_staff(): array {
  $user = require_auth();
  if ($user['role'] !== 'super_admin' && $user['role'] !== 'operations') {
    json_error('Bu işlem için admin yetkisi gereklidir.', 403);
  }
  return $user;
}

function require_super_admin(): array {
  $user = require_auth();
  if ($user['role'] !== 'super_admin') {
    json_error('Bu işlem için süper admin yetkisi gereklidir.', 403);
  }
  return $user;
}

function generate_order_code(): string {
  $pdo = db();
  do {
    $code = 'ORD-' . strtoupper(bin2hex(random_bytes(3)));
    $stmt = $pdo->prepare('SELECT id FROM orders WHERE order_code = ?');
    $stmt->execute([$code]);
  } while ($stmt->fetch());
  return $code;
}

function log_action(int $adminId, ?int $orderId, string $action, string $details = ''): void {
  $stmt = db()->prepare('INSERT INTO admin_logs (admin_id, order_id, action, details) VALUES (?, ?, ?, ?)');
  $stmt->execute([$adminId, $orderId, $action, $details]);
}

function user_payload(array $u): array {
  return [
    'id' => (int)$u['id'],
    'email' => $u['email'],
    'full_name' => $u['full_name'],
    'phone' => $u['phone'],
    'address' => $u['address'],
    'role' => $u['role'],
    'provider' => $u['provider'],
    'created_at' => $u['created_at'],
    'steam_id' => $u['steam_id'] ?? null,
    'discord_id' => $u['discord_id'] ?? null,
    'discord_name' => $u['discord_name'] ?? null,
  ];
}

// Sipariş için hesap bağlama zorunlulukları (süper admin panelinden ayarlanır)
function get_settings(): array {
  $rows = db()->query('SELECT setting_key, setting_value FROM settings')->fetchAll();
  $m = [];
  foreach ($rows as $r) $m[$r['setting_key']] = $r['setting_value'];
  return [
    'require_steam' => ($m['require_steam'] ?? '0') === '1',
    'require_discord' => ($m['require_discord'] ?? '0') === '1',
  ];
}