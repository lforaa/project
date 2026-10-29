<?php
// Steam / Discord hesap bağlama ayarları — bu dosyayı kendi ortamınıza göre düzenleyin.

// React (Vite) uygulamasının adresi — bağlama bitince kullanıcı buraya döner
define('APP_URL', 'http://localhost:5173');

// Bu API'nin tarayıcıdan erişilen tam adresi (sonunda / olmadan)
define('API_PUBLIC_URL', 'http://localhost/api');

// Bağlama isteklerini imzalamak için uzun, rastgele, gizli bir metin (örn. 40+ karakter)
define('LINK_SECRET', 'DEGISTIR-BUNU-uzun-rastgele-bir-metin');

// Discord Developer Portal > Applications > OAuth2
// Redirects alanına tam olarak şunu ekleyin: API_PUBLIC_URL . '/links.php?action=discord_callback'
define('DISCORD_CLIENT_ID', '');
define('DISCORD_CLIENT_SECRET', '');