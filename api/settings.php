<?php
// Sipariş ayarları: herkes okuyabilir, sadece süper admin değiştirebilir
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  json_response(get_settings());
}

if ($method === 'POST' || $method === 'PUT') {
  $user = require_super_admin();
  $input = get_input();
  $stmt = db()->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
  foreach (['require_steam', 'require_discord'] as $key) {
    if (array_key_exists($key, $input)) {
      $stmt->execute([$key, filter_var($input[$key], FILTER_VALIDATE_BOOLEAN) ? '1' : '0']);
    }
  }
  $current = get_settings();
  log_action((int)$user['id'], null, 'update_settings', json_encode($current));
  json_response($current);
}

json_error('Geçersiz işlem.', 404);