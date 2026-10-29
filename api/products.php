<?php
// Ürün listeleme, detay, ekleme, güncelleme, silme
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = get_input();
$pdo = db();

// GET: Tüm aktif ürünleri listele (vitin için)
if ($method === 'GET' && !isset($_GET['id'])) {
  $stmt = $pdo->query('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC');
  $products = $stmt->fetchAll();

  $stmt2 = $pdo->query('SELECT * FROM product_images ORDER BY sort_order ASC');
  $images = $stmt2->fetchAll();

  $imgMap = [];
  foreach ($images as $img) {
    if (!isset($imgMap[$img['product_id']])) {
      $imgMap[$img['product_id']] = $img['image_url'];
    }
  }

  foreach ($products as &$p) {
    $p['id'] = (int)$p['id'];
    $p['price'] = (float)$p['price'];
    $p['has_3d_model'] = (bool)$p['has_3d_model'];
    $p['featured'] = (bool)$p['featured'];
    $p['stock'] = (int)$p['stock'];
    $p['is_active'] = (bool)$p['is_active'];
  }
  json_response(['products' => $products, 'images' => $imgMap]);
}

// GET?id=XX: Tek ürün detayı + tüm fotoğrafları
if ($method === 'GET' && isset($_GET['id'])) {
  $id = (int)$_GET['id'];
  $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
  $stmt->execute([$id]);
  $product = $stmt->fetch();
  if (!$product) json_error('Ürün bulunamadı.', 404);

  $product['id'] = (int)$product['id'];
  $product['price'] = (float)$product['price'];
  $product['has_3d_model'] = (bool)$product['has_3d_model'];
  $product['featured'] = (bool)$product['featured'];
  $product['stock'] = (int)$product['stock'];
  $product['is_active'] = (bool)$product['is_active'];

  $stmt2 = $pdo->prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC');
  $stmt2->execute([$id]);
  $imgs = array_column($stmt2->fetchAll(), 'image_url');

  json_response(['product' => $product, 'images' => $imgs]);
}

// POST: Yeni ürün (admin)
if ($method === 'POST') {
  require_staff();
  $name = trim($input['name'] ?? '');
  if (!$name) json_error('Ürün adı zorunludur.');
  $price = (float)($input['price'] ?? 0);
  $stock = (int)($input['stock'] ?? 0);
  $has3d = !empty($input['has_3d_model']) ? 1 : 0;
  $modelUrl = $input['model_url'] ?? null;
  $featured = !empty($input['featured']) ? 1 : 0;
  $isActive = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1;

  $stmt = $pdo->prepare('INSERT INTO products (name, description, price, has_3d_model, model_url, category, featured, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $stmt->execute([
    $name,
    trim($input['description'] ?? ''),
    $price,
    $has3d,
    $has3d ? $modelUrl : null,
    trim($input['category'] ?? 'genel'),
    $featured,
    $stock,
    $isActive,
  ]);
  $id = (int)$pdo->lastInsertId();

  if (!empty($input['image_url'])) {
    $stmt2 = $pdo->prepare('INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, 0)');
    $stmt2->execute([$id, $input['image_url']]);
  }

  json_response(['id' => $id], 201);
}

// PUT: Ürün güncelle (admin)
if ($method === 'PUT') {
  require_staff();
  $id = (int)($input['id'] ?? 0);
  if (!$id) json_error('Ürün ID zorunludur.');

  $fields = [];
  $values = [];
  $allowed = ['name', 'description', 'price', 'has_3d_model', 'model_url', 'category', 'featured', 'stock', 'is_active'];
  foreach ($allowed as $f) {
    if (array_key_exists($f, $input)) {
      $val = $input[$f];
      if (in_array($f, ['has_3d_model', 'featured', 'is_active'])) $val = $val ? 1 : 0;
      if ($f === 'price') $val = (float)$val;
      if ($f === 'stock') $val = (int)$val;
      $fields[] = "$f = ?";
      $values[] = $val;
    }
  }
<<<<<<< HEAD
  $newImage = trim($input['image_url'] ?? '');
  if (!$fields && !$newImage) json_error('Güncellenecek alan yok.');

  if ($fields) {
    $values[] = $id;
    $sql = 'UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
  }

  // Yeni fotoğraf seçildiyse ürünün ana fotoğrafını değiştir
  if ($newImage) {
    $pdo->prepare('DELETE FROM product_images WHERE product_id = ?')->execute([$id]);
    $pdo->prepare('INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, 0)')->execute([$id, $newImage]);
  }
=======
  if (!$fields) json_error('Güncellenecek alan yok.');

  $values[] = $id;
  $sql = 'UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = ?';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($values);
>>>>>>> 38f64ef9f69bc14e3ad462c02e8d190bfa25db23
  json_response(['success' => true]);
}

// DELETE: Ürün sil (admin)
if ($method === 'DELETE') {
  require_staff();
  $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
  if (!$id) json_error('Ürün ID zorunludur.');

  // Fotoğrafları diskten sil
  $stmt = $pdo->prepare('SELECT image_url FROM product_images WHERE product_id = ?');
  $stmt->execute([$id]);
  foreach ($stmt->fetchAll() as $row) {
    $path = __DIR__ . '/uploads/products/' . basename($row['image_url']);
    if (file_exists($path)) @unlink($path);
  }
  // 3D modeli diskten sil
  $stmt = $pdo->prepare('SELECT model_url FROM products WHERE id = ?');
  $stmt->execute([$id]);
  $modelRow = $stmt->fetch();
  if ($modelRow && $modelRow['model_url']) {
    $modelPath = __DIR__ . '/uploads/models/' . basename($modelRow['model_url']);
    if (file_exists($modelPath)) @unlink($modelPath);
  }

  $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
  $stmt->execute([$id]);
  json_response(['success' => true]);
}

<<<<<<< HEAD
json_error('Geçersiz istek.', 404);
=======
json_error('Geçersiz istek.', 404);
>>>>>>> 38f64ef9f69bc14e3ad462c02e8d190bfa25db23
