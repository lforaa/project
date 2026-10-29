<?php
// Dosya yükleme: ürün fotoğrafı ve 3D model
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') json_error('Sadece POST desteklenir.', 405);

require_staff();
$type = $_GET['type'] ?? $_POST['type'] ?? '';
if (!in_array($type, ['image', 'model'])) json_error('Geçersiz yükleme türü.');

if (!isset($_FILES['file'])) json_error('Dosya bulunamadı.');
$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) json_error('Dosya yükleme hatası: ' . $file['error']);

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if ($type === 'image') {
  $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (!in_array($ext, $allowed)) json_error('Sadece JPG, PNG, GIF, WEBP formatları desteklenir.');
  $dir = __DIR__ . '/uploads/products';
} else {
  $allowed = ['glb', 'gltf'];
  if (!in_array($ext, $allowed)) json_error('3D model .glb veya .gltf formatında olmalıdır.');
  $dir = __DIR__ . '/uploads/models';
}

if (!is_dir($dir)) mkdir($dir, 0755, true);

$fileName = $type . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$dest = $dir . '/' . $fileName;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
  json_error('Dosya kaydedilemedi.', 500);
}

// Public URL — XAMPP'te API klasörü htdocs içinde olmalı
// Frontend bu URL'yi kullanarak dosyaya erişir
$baseUrl = dirname($_SERVER['SCRIPT_NAME']);
$publicUrl = $baseUrl . '/uploads/' . ($type === 'image' ? 'products' : 'models') . '/' . $fileName;

json_response(['url' => $publicUrl], 201);
