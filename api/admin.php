<?php
// Admin: sipariş detay (notlar + loglar), not ekleme
// Kullanıcı yönetimi: listele, rol güncelle, yeni admin oluştur
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = get_input();
$pdo = db();
$action = $input['action'] ?? $_GET['action'] ?? '';

// === SİPARİŞ DETAY: notlar + loglar ===
if ($action === 'order_detail') {
  $user = require_staff();
  $orderId = (int)($input['order_id'] ?? $_GET['order_id'] ?? 0);
  if (!$orderId) json_error('Sipariş ID zorunludur.');

  $stmt = $pdo->prepare('SELECT * FROM admin_notes WHERE order_id = ? ORDER BY created_at DESC');
  $stmt->execute([$orderId]);
  $notes = $stmt->fetchAll();
  foreach ($notes as &$n) { $n['id'] = (int)$n['id']; $n['order_id'] = (int)$n['order_id']; $n['admin_id'] = (int)$n['admin_id']; }

  $logs = [];
  if ($user['role'] === 'super_admin') {
    $stmt = $pdo->prepare('SELECT * FROM admin_logs WHERE order_id = ? ORDER BY created_at DESC');
    $stmt->execute([$orderId]);
    $logs = $stmt->fetchAll();
    foreach ($logs as &$l) { $l['id'] = (int)$l['id']; $l['admin_id'] = (int)$l['admin_id']; $l['order_id'] = $l['order_id'] ? (int)$l['order_id'] : null; }
  }

  json_response(['notes' => $notes, 'logs' => $logs]);
}

// === NOT EKLE ===
if ($action === 'add_note') {
  $user = require_staff();
  $orderId = (int)($input['order_id'] ?? 0);
  $text = trim($input['note_text'] ?? '');
  if (!$orderId || !$text) json_error('Sipariş ID ve not metni zorunludur.');

  $stmt = $pdo->prepare('INSERT INTO admin_notes (order_id, admin_id, note_text) VALUES (?, ?, ?)');
  $stmt->execute([$orderId, $user['id'], $text]);
  log_action($user['id'], $orderId, 'note_added', 'İç not eklendi');
  json_response(['success' => true], 201);
}

// === KULLANICI LİSTELE (süper admin) ===
if ($action === 'list_users') {
  require_super_admin();
  $stmt = $pdo->query('SELECT id, email, full_name, phone, address, role, provider, created_at FROM users ORDER BY created_at DESC');
  $users = $stmt->fetchAll();
  foreach ($users as &$u) { $u['id'] = (int)$u['id']; }
  json_response(['users' => $users]);
}

// === YENİ ADMIN OLUŞTUR (süper admin) ===
if ($action === 'create_admin') {
  require_super_admin();
  $email = trim($input['email'] ?? '');
  $password = $input['password'] ?? '';
  $fullName = trim($input['full_name'] ?? '');
  $role = $input['role'] ?? 'operations';
  if (!in_array($role, ['super_admin', 'operations', 'customer'])) json_error('Geçersiz rol.');
  if (!$email || !$password) json_error('E-posta ve şifre zorunludur.');
  if (strlen($password) < 6) json_error('Şifre en az 6 karakter olmalıdır.');

  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  if ($stmt->fetch()) json_error('Bu e-posta zaten kayıtlı.', 409);

  $hash = password_hash($password, PASSWORD_DEFAULT);
  $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, full_name, role, provider) VALUES (?, ?, ?, ?, "email")');
  $stmt->execute([$email, $hash, $fullName, $role]);
  json_response(['success' => true], 201);
}

// === ROL GÜNCELELLE (süper admin) ===
if ($action === 'update_role') {
  require_super_admin();
  $userId = (int)($input['user_id'] ?? 0);
  $newRole = $input['role'] ?? '';
  if (!in_array($newRole, ['super_admin', 'operations', 'customer'])) json_error('Geçersiz rol.');

  $stmt = $pdo->prepare('UPDATE users SET role = ? WHERE id = ?');
  $stmt->execute([$newRole, $userId]);
  json_response(['success' => true]);
}

json_error('Geçersiz işlem.', 404);
