// API katmanı — PHP backend ile haberleşir
// XAMPP'te API http://localhost/api/ altında servis edilir

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost/api';

// ============================================================
// Tipler
// ============================================================
export type UserRole = 'customer' | 'super_admin' | 'operations';

export interface Profile {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  address: string;
  role: UserRole;
  provider: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  has_3d_model: boolean;
  model_url: string | null;
  category: string;
  featured: boolean;
  stock: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  sort_order: number;
}

export interface Order {
  id: number;
  order_code: string;
  user_id: number;
  status: 'received' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  customer_note: string;
  total_price: number;
  delivery_name: string;
  delivery_address: string;
  delivery_phone: string;
  ip_address: string | null;
  created_at: string;
  email?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface AdminNote {
  id: number;
  order_id: number;
  admin_id: number;
  note_text: string;
  created_at: string;
}

export interface AdminLog {
  id: number;
  admin_id: number;
  order_id: number | null;
  action: string;
  details: string;
  created_at: string;
}

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  has_3d_model: boolean;
}

// ============================================================
// HTTP yardımcıları
// ============================================================
function getToken(): string | null {
  return localStorage.getItem('showroom_token');
}

function setToken(token: string) {
  localStorage.setItem('showroom_token', token);
}

function clearToken() {
  localStorage.removeItem('showroom_token');
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as any).error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ============================================================
// Auth API
// ============================================================
export const authApi = {
  async login(email: string, password: string): Promise<Profile> {
    const data = await apiRequest<Profile>('auth.php?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(String(data.id));
    return data;
  },

  async register(email: string, password: string, fullName: string): Promise<Profile> {
    const data = await apiRequest<Profile>('auth.php?action=register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    setToken(String(data.id));
    return data;
  },

  async me(): Promise<Profile | null> {
    if (!getToken()) return null;
    try {
      return await apiRequest<Profile>('auth.php?action=me');
    } catch {
      clearToken();
      return null;
    }
  },

  async updateProfile(updates: { full_name?: string; phone?: string; address?: string }): Promise<void> {
    await apiRequest('auth.php?action=update_profile', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  },

  logout() {
    clearToken();
  },
};

// ============================================================
// Products API
// ============================================================
export const productsApi = {
  async list(): Promise<{ products: Product[]; images: Record<number, string> }> {
    return apiRequest('products.php');
  },

  async get(id: number): Promise<{ product: Product; images: string[] }> {
    return apiRequest(`products.php?id=${id}`);
  },

  async create(data: Partial<Product> & { image_url?: string }): Promise<{ id: number }> {
    return apiRequest('products.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Product>): Promise<void> {
    await apiRequest('products.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    });
  },

  async remove(id: number): Promise<void> {
    await apiRequest(`products.php?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================
// Orders API
// ============================================================
export const ordersApi = {
  async create(items: { product_id: number; quantity: number }[], opts: {
    customer_note?: string;
    delivery_name?: string;
    delivery_address?: string;
    delivery_phone?: string;
    ip_address?: string;
  }): Promise<{ order_code: string }> {
    return apiRequest('orders.php', {
      method: 'POST',
      body: JSON.stringify({ items, ...opts }),
    });
  },

  async myList(): Promise<{ orders: (Order & { items: OrderItem[] })[] }> {
    return apiRequest('orders.php');
  },

  async adminList(): Promise<{ orders: (Order & { items: OrderItem[]; email: string })[] }> {
    return apiRequest('orders.php?admin=1');
  },

  async updateStatus(id: number, status: string): Promise<void> {
    await apiRequest('orders.php', {
      method: 'PUT',
      body: JSON.stringify({ id, status }),
    });
  },

  async cancel(id: number): Promise<void> {
    await apiRequest(`orders.php?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================
// Admin API
// ============================================================
export const adminApi = {
  async orderDetail(orderId: number): Promise<{ notes: AdminNote[]; logs: AdminLog[] }> {
    return apiRequest(`admin.php?action=order_detail&order_id=${orderId}`);
  },

  async addNote(orderId: number, text: string): Promise<void> {
    await apiRequest('admin.php?action=add_note', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, note_text: text }),
    });
  },

  async listUsers(): Promise<{ users: Profile[] }> {
    return apiRequest('admin.php?action=list_users');
  },

  async createAdmin(email: string, password: string, fullName: string, role: string): Promise<void> {
    await apiRequest('admin.php?action=create_admin', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, role }),
    });
  },

  async updateRole(userId: number, role: string): Promise<void> {
    await apiRequest('admin.php?action=update_role', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  },
};

// ============================================================
// Upload API
// ============================================================
export async function uploadProductImage(file: File): Promise<string | null> {
  return uploadFile(file, 'image');
}

export async function uploadModelFile(file: File): Promise<string | null> {
  return uploadFile(file, 'model');
}

async function uploadFile(file: File, type: 'image' | 'model'): Promise<string | null> {
  try {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res = await fetch(`${API_BASE}/upload.php?type=${type}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Upload error:', data.error);
      return null;
    }
    // Tam URL oluştur (göreceli ise)
    let url = (data as any).url;
    if (url && !url.startsWith('http')) {
      url = API_BASE.replace('/api', '') + url;
    }
    return url;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

// 3D model: dosya api/model.php üzerinden sunulur (CORS sorunu yaşanmaz)
export async function getModelSignedUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;
  const name = filePath.split('?')[0].split('/').pop();
  if (!name) return null;
  return `${API_BASE}/model.php?f=${encodeURIComponent(name)}`;
}