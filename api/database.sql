-- 3D Showroom + E-Ticaret — MySQL/MariaDB Şeması (XAMPP)
-- phpMyAdmin veya MySQL komut satırından çalıştırın:
--   mysql -u root < database.sql
-- veya phpMyAdmin > SQL sekmesine yapıştırın

CREATE DATABASE IF NOT EXISTS showroom_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE showroom_db;

-- ============================================================
-- KULLANICILAR (auth.users yerine)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address TEXT,
  role ENUM('customer','super_admin','operations') NOT NULL DEFAULT 'customer',
  provider VARCHAR(50) DEFAULT 'email',
  provider_id VARCHAR(255) DEFAULT NULL,
<<<<<<< HEAD
  steam_id VARCHAR(32) NULL UNIQUE,
  discord_id VARCHAR(32) NULL UNIQUE,
  discord_name VARCHAR(100) NULL,
=======
>>>>>>> 38f64ef9f69bc14e3ad462c02e8d190bfa25db23
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- İlk süper admin (şifre: admin123 — giriş yapınca değiştirin!)
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@showroom.local', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 'super_admin');

-- ============================================================
-- ÜRÜNLER
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  has_3d_model TINYINT(1) NOT NULL DEFAULT 0,
  model_url VARCHAR(500) DEFAULT NULL,
  category VARCHAR(100) DEFAULT 'genel',
  featured TINYINT(1) DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- ÜRÜN FOTOĞRAFLARI
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SİPARİŞLER
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(20) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  status ENUM('received','preparing','shipped','delivered','cancelled') NOT NULL DEFAULT 'received',
  customer_note TEXT,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  delivery_name VARCHAR(255) DEFAULT '',
  delivery_address TEXT,
  delivery_phone VARCHAR(50) DEFAULT '',
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SİPARİŞ KALEMLERİ
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- ADMIN İÇ NOTLAR
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  admin_id INT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- ADMIN İŞLEM LOG'LARI
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  order_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB;
<<<<<<< HEAD

-- ============================================================
-- AYARLAR (sipariş için Steam/Discord bağlama zorunluluğu vb.)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('require_steam', '0'),
  ('require_discord', '0');
=======
>>>>>>> 38f64ef9f69bc14e3ad462c02e8d190bfa25db23
