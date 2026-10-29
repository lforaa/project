-- Mevcut veritabanı için: Steam/Discord bağlama + sipariş zorunluluk ayarları
-- (MariaDB / XAMPP için. Taze kurulumda database.sql zaten bunları içerir.)
USE showroom_db;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS steam_id VARCHAR(32) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS discord_id VARCHAR(32) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS discord_name VARCHAR(100) NULL;

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('require_steam', '0'),
  ('require_discord', '0');