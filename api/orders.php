<?php
// Sipariş oluşturma, listeleme, detay, durum güncelleme, iptal
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = get_input();
$pdo = db();

// POST: Yeni sipariş
if ($method === 'POST') {
  $user = require_auth();
  $items = $input['items'] ?? [];
  if (!is_array($items) || count($items) === 0) json_error('Sepet boş.');

  $total = 0.0;
  $validated = [];
  foreach ($items as $item) {
    $pid = (int)($item['product_id'] ?? 0);
    $qty = (int)($item['quantity'] ?? 0);
    if ($pid <= 0 || $qty <= 0) json_error('Geçersiz ürün veya adet.');

    $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');
    $stmt->execute([$pid]);
    $product = $stmt->fetch();
    if (!$product) json_error('Ürün bulunamadı: ' . $pid);

    if ($product['stock'] < $qty) {
      json_error('Yetersiz stok: ' . $product['name']);
    }

    $total += (float)$product['price'] * $qty;
    $validated[] = ['product' => $product, 'qty' => $qty];
  }

  $orderCode = generate_order_code();
  $note = trim($input['customer_note'] ?? '');
  $delName = trim($input['delivery_name'] ?? '');
  $delAddr = trim($input['delivery_address'] ?? '');
  $delPhone = trim($input['delivery_phone'] ?? '');
  $ip = $input['ip_address'] ?? ($_SERVER['REMOTE_ADDR'] ?? null);

  $pdo->beginTransaction();
  try {
    $stmt = $pdo->prepare('INSERT INTO orders (order_code, user_id, status, customer_note, total_price, delivery_name, delivery_address, delivery_phone, ip_address) VALUES (?, ?, "received", ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$orderCode, $user['id'], $note, $total, $delName, $delAddr, $delPhone, $ip]);
    $orderId = (int)$pdo->lastInsertId();

    foreach ($validated as $v) {
      $stmt = $pdo->prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)');
      $stmt->execute([$orderId, $v['product']['id'], $v['product']['name'], $v['qty'], $v['product']['price']]);
      // Stok düş
      $stmt = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      $stmt->execute([$v['qty'], $v['product']['id']]);
    }
    $pdo->commit();
  } catch (Exception $e) {
    $pdo->rollBack();
    json_error('Sipariş oluşturulamadı: ' . $e->getMessage(), 500);
  }

  json_response(['order_code' => $orderCode], 201);
}

// GET: Kullanıcının kendi siparişleri
if ($method === 'GET' && !isset($_GET['admin'])) {
  $user = require_auth();
  $stmt = $pdo->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
  $stmt->execute([$user['id']]);
  $orders = $stmt->fetchAll();

  if (count($orders) === 0) json_response(['orders' => []]);

  $orderIds = array_column($orders, 'id');
  $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
  $stmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($placeholders)");
  $stmt->execute($orderIds);
  $items = $stmt->fetchAll();

  $itemsByOrder = [];
  foreach ($items as $item) {
    $item['id'] = (int)$item['id'];
    $item['order_id'] = (int)$item['order_id'];
    $item['product_id'] = $item['product_id'] ? (int)$item['product_id'] : null;
    $item['quantity'] = (int)$item['quantity'];
    $item['unit_price'] = (float)$item['unit_price'];
    $itemsByOrder[$item['order_id']][] = $item;
  }

  foreach ($orders as &$o) {
    $o['id'] = (int)$o['id'];
    $o['user_id'] = (int)$o['user_id'];
    $o['total_price'] = (float)$o['total_price'];
    $o['items'] = $itemsByOrder[$o['id']] ?? [];
  }
  json_response(['orders' => $orders]);
}

// GET?admin=1: Tüm siparişler (admin)
if ($method === 'GET' && isset($_GET['admin'])) {
  require_staff();
  $stmt = $pdo->query('SELECT o.*, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC');
  $orders = $stmt->fetchAll();

  $orderIds = array_column($orders, 'id');
  $itemsByOrder = [];
  if (count($orderIds) > 0) {
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($placeholders)");
    $stmt->execute($orderIds);
    foreach ($stmt->fetchAll() as $item) {
      $item['id'] = (int)$item['id'];
      $item['order_id'] = (int)$item['order_id'];
      $item['product_id'] = $item['product_id'] ? (int)$item['product_id'] : null;
      $item['quantity'] = (int)$item['quantity'];
      $item['unit_price'] = (float)$item['unit_price'];
      $itemsByOrder[$item['order_id']][] = $item;
    }
  }

  foreach ($orders as &$o) {
    $o['id'] = (int)$o['id'];
    $o['user_id'] = (int)$o['user_id'];
    $o['total_price'] = (float)$o['total_price'];
    $o['email'] = $o['user_email'];
    unset($o['user_email']);
    $o['items'] = $itemsByOrder[$o['id']] ?? [];
  }
  json_response(['orders' => $orders]);
}

// PUT: Sipariş durumu güncelle (admin)
if ($method === 'PUT') {
  $user = require_staff();
  $id = (int)($input['id'] ?? 0);
  $status = $input['status'] ?? '';
  $validStatuses = ['received', 'preparing', 'shipped', 'delivered', 'cancelled'];
  if (!in_array($status, $validStatuses)) json_error('Geçersiz durum.');

  $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
  $stmt->execute([$id]);
  $order = $stmt->fetch();
  if (!$order) json_error('Sipariş bulunamadı.', 404);

  $oldStatus = $order['status'];

  // İptal ise stok iade et
  if ($status === 'cancelled' && $oldStatus !== 'cancelled') {
    $stmt = $pdo->prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?');
    $stmt->execute([$id]);
    foreach ($stmt->fetchAll() as $row) {
      if ($row['product_id']) {
        $stmt2 = $pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        $stmt2->execute([$row['quantity'], $row['product_id']]);
      }
    }
  }

  $stmt = $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?');
  $stmt->execute([$status, $id]);
  log_action($user['id'], $id, 'status_update', "Durum '$status' olarak güncellendi");
  json_response(['success' => true]);
}

// DELETE: Sipariş iptal (kullanıcı kendi siparişini iptal eder)
if ($method === 'DELETE') {
  $user = require_auth();
  $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
  if (!$id) json_error('Sipariş ID zorunludur.');

  $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $user['id']]);
  $order = $stmt->fetch();
  if (!$order) json_error('Sipariş bulunamadı.', 404);
  if ($order['status'] !== 'received') json_error('Bu sipariş iptal edilemez (hazırlama aşamasında).');

  // Stok iade
  $stmt = $pdo->prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?');
  $stmt->execute([$id]);
  foreach ($stmt->fetchAll() as $row) {
    if ($row['product_id']) {
      $stmt2 = $pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      $stmt2->execute([$row['quantity'], $row['product_id']]);
    }
  }

  $stmt = $pdo->prepare('UPDATE orders SET status = "cancelled" WHERE id = ?');
  $stmt->execute([$id]);
  json_response(['success' => true]);
}

json_error('Geçersiz istek.', 404);
