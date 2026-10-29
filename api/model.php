<?php
// 3D model dosyalarını CORS başlıklarıyla sunar (Apache ayarı gerektirmez)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

$name = basename($_GET['f'] ?? '');
if (!preg_match('/^[A-Za-z0-9_\-]+\.(glb|gltf)$/', $name)) {
  http_response_code(400);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'Gecersiz dosya adi.';
  exit;
}

$path = __DIR__ . '/uploads/models/' . $name;
if (!is_file($path)) {
  http_response_code(404);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'Model dosyasi bulunamadi: ' . $name;
  exit;
}

$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
header('Content-Type: ' . ($ext === 'glb' ? 'model/gltf-binary' : 'model/gltf+json'));
header('Content-Length: ' . filesize($path));
header('Cache-Control: public, max-age=3600');
readfile($path);
