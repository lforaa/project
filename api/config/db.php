<?php
// Veritabanı bağlantı ayarları — XAMPP varsayılan değerleri
// Kendi şifreniz farklıysa aşağıyı düzenleyin

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'showroom_db');
define('DB_USER', 'root');
define('DB_PASS', '');   // XAMPP varsayılan: boş şifre
define('DB_CHARSET', 'utf8mb4');

function db() {
  static $pdo = null;
  if ($pdo === null) {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $options = [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ];
    try {
      $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
      http_response_code(500);
      header('Content-Type: application/json');
      echo json_encode(['error' => 'Veritabanı bağlantısı başarısız: ' . $e->getMessage()]);
      exit;
    }
  }
  return $pdo;
}
