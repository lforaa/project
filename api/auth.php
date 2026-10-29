<?php
// Giriş / Kayıt / Çıkış / Profil
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/config/db.php';

$action = $_GET['action'] ?? '';

if ($action === 'login') {
  $input = get_input();
  $email = trim($input['email'] ?? '');
  $password = $input['password'] ?? '';
  if (!$email || !$password) json_error('E-posta ve şifre zorunludur.');

  $stmt = db()->prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
  $stmt->execute([$email]);
  $user = $stmt->fetch();
  if (!$user || !password_verify($password, $user['password_hash'])) {
    json_error('E-posta veya şifre hatalı.', 401);
  }
<<<<<<< HEAD
  json_response(user_payload($user));
=======
  json_response([
    'id' => (int)$user['id'],
    'email' => $user['email'],
    'full_name' => $user['full_name'],
    'phone' => $user['phone'],
    'address' => $user['address'],
    'role' => $user['role'],
    'provider' => $user['provider'],
    'created_at' => $user['created_at'],
  ]);
>>>>>>> 38f64ef9f69bc14e3ad462c02e8d190bfa25db23
}

if ($action === 'register') {
  $input = get_input();
  $email = trim($input['email'] ?? '');
  $password = $input['password'] ?? '';
  $fullName = trim($input['full_name'] ?? '');
  if (!$email || !$password) json_error('E-posta ve şifre zorunludur.');
  if (strlen($password) < 6) json_error('Şifre en az 6 karakter olmalıdır.');

  $stmt = db()->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  if ($stmt->fetch()) json_error('Bu e-posta zaten kayıtlı.', 409);

  $hash = password_hash($password, PASSWORD_DEFAULT);
  $stmt = db()->prepare('INSERT INTO users (email, password_hash, full_name, role, provider) VALUES (?, ?, ?, "customer", "email")');
  $stmt->execute([$email, $hash, $fullName]);

  $id = (int)db()->lastInsertId();
  json_response([
    'id' => $id,
    'email' => $email,
    'full_name' => $fullName,
    'phone' => '',
    'address' => '',
    'role' => 'customer',
    'provider' => 'email',
    'created_at' => date('Y-m-d H:i:s'),
  ], 201);
}

if ($action === 'me') {
  $user = require_auth();
<<<<<<< HEAD
  json_response(user_payload($user));
=======
  json_response([
    'id' => (int)$user['id'],
    'email' => $user['email'],
    'full_name' => $user['full_name'],
    'phone' => $user['phone'],
    'address' => $user['address'],
    'role' => $user['role'],
    'provider' => $user['provider'],
    'created_at' => $user['created_at'],
  ]);
>>>>>>> 38f64ef9f69bc14e3ad462c02e8d190bfa25db23
}

if ($action === 'update_profile') {
  $user = require_auth();
  $input = get_input();
  $fullName = trim($input['full_name'] ?? $user['full_name']);
  $phone = trim($input['phone'] ?? $user['phone']);
  $address = trim($input['address'] ?? $user['address']);
  $stmt = db()->prepare('UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?');
  $stmt->execute([$fullName, $phone, $address, $user['id']]);
  json_response(['success' => true]);
}

<<<<<<< HEAD
json_error('Geçersiz işlem.', 404);
=======
json_error('Geçersiz işlem.', 404);
>>>>>>> 38f64ef9f69bc14e3ad462c02e8d190bfa25db23
