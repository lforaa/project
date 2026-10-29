import { useEffect, useState, useCallback, useRef } from 'react';
import { ordersApi, adminApi, productsApi, settingsApi, OrderRequirements, uploadProductImage, uploadModelFile, Order, OrderItem, AdminNote, AdminLog, Profile, Product, CartItem } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { navigate } from '@/lib/router';
import {
  Search, LayoutDashboard, Package, StickyNote, History, LogOut,
  Clock, User as UserIcon, AlertCircle, FileText, Check, Plus, Edit3,
  Trash2, Box, X, Eye, EyeOff, Power, Users, Tag, DollarSign, Layers,
  Upload, FolderOpen, FileBox, Loader2, Image as ImageIcon,
  ArrowLeft, Mail, Globe, ChevronRight, Ban, Filter, Link2,
} from 'lucide-react';

type Tab = 'orders' | 'products' | 'users' | 'settings';

const statusLabels: Record<string, { label: string; color: string }> = {
  received: { label: 'Alındı', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  preparing: { label: 'Hazırlanıyor', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  shipped: { label: 'Kargoya Verildi', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  delivered: { label: 'Teslim Edildi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'İptal Edildi', color: 'bg-red-50 text-red-700 border-red-200' },
};

const statusOrder = ['received', 'preparing', 'shipped', 'delivered', 'cancelled'];

export function AdminPage() {
  const { profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('orders');

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { navigate('/auth'); return; }
    if (profile?.role !== 'super_admin' && profile?.role !== 'operations') {
      setChecking(false); return;
    }
    setAuthorized(true);
    setChecking(false);
  }, [profile, authLoading]);

  const isSuperAdmin = profile?.role === 'super_admin';

  if (checking || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Yetkisiz Erişim</h2>
        <p className="text-slate-500 mb-6">Bu sayfaya erişmek için admin yetkisi gereklidir.</p>
        <button onClick={() => navigate('/')} className="text-slate-700 font-medium hover:underline">Vitine dön</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
            <p className="text-sm text-slate-500">{profile?.email} · {profile?.role === 'super_admin' ? 'Süper Admin' : 'Operasyon'}</p>
          </div>
        </div>
        <button onClick={() => { signOut(); navigate('/'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors">
          <LogOut className="w-4 h-4" />Çıkış
        </button>
      </div>

      <div className="flex gap-1.5 mb-6 bg-slate-100 p-1.5 rounded-xl w-fit flex-wrap">
        <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} icon={<Package className="w-4 h-4" />} label="Siparişler" />
        <TabButton active={tab === 'products'} onClick={() => setTab('products')} icon={<Box className="w-4 h-4" />} label="Ürünler" />
        {isSuperAdmin && <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={<Users className="w-4 h-4" />} label="Admin Kullanıcılar" />}
        {isSuperAdmin && <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={<Link2 className="w-4 h-4" />} label="Sipariş Ayarları" />}
      </div>

      {tab === 'orders' && <OrdersTab isSuperAdmin={isSuperAdmin} />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'settings' && isSuperAdmin && <SettingsTab />}
      {tab === 'users' && isSuperAdmin && <UsersTab refreshProfile={refreshProfile} currentUserId={profile!.id} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
      {icon}{label}
    </button>
  );
}

// ============================================================
// ORDERS TAB
// ============================================================
type OrderWithEmail = Order & { items: OrderItem[]; email?: string };

function OrdersTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [allOrders, setAllOrders] = useState<OrderWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('received');
  const [searchCode, setSearchCode] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithEmail | null>(null);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [newNote, setNewNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { orders } = await ordersApi.adminList();
      setAllOrders(orders);
    } catch (err) {
      console.error('Load orders error:', err);
      setAllOrders([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = allOrders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchCode.trim()) {
      const q = searchCode.trim().toLowerCase();
      if (!o.order_code.toLowerCase().includes(q) && !(o.email || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openOrderDetail = async (order: OrderWithEmail) => {
    setSelectedOrder(order);
    setNotes([]); setLogs([]);
    try {
      const { notes: ns, logs: lg } = await adminApi.orderDetail(order.id);
      setNotes(ns);
      if (isSuperAdmin) setLogs(lg);
    } catch (err) {
      console.error('Order detail error:', err);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    try {
      await ordersApi.updateStatus(selectedOrder.id, newStatus);
      const updated = { ...selectedOrder, status: newStatus as Order['status'] };
      setSelectedOrder(updated);
      setAllOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      const { logs: lg } = await adminApi.orderDetail(selectedOrder.id);
      if (isSuperAdmin) setLogs(lg);
    } catch (err) {
      console.error('Status update error:', err);
    }
    setUpdatingStatus(false);
  };

  const handleForceCancel = async () => {
    if (!selectedOrder) return;
    if (!confirm('Bu siparişi zorla iptal etmek istediğinize emin misiniz? Stoklar iade edilecektir.')) return;
    setCancelling(true);
    try {
      await ordersApi.updateStatus(selectedOrder.id, 'cancelled');
      const updated = { ...selectedOrder, status: 'cancelled' as Order['status'] };
      setSelectedOrder(updated);
      setAllOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch (err: any) {
      alert('İptal hatası: ' + err.message);
    }
    setCancelling(false);
  };

  const handleAddNote = async () => {
    if (!selectedOrder || !newNote.trim()) return;
    setAddingNote(true);
    try {
      await adminApi.addNote(selectedOrder.id, newNote.trim());
      const { notes: ns } = await adminApi.orderDetail(selectedOrder.id);
      setNotes(ns);
      setNewNote('');
    } catch (err) {
      console.error('Note insert error:', err);
    }
    setAddingNote(false);
  };

  if (selectedOrder) {
    const st = statusLabels[selectedOrder.status];
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />Sipariş listesine dön
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center"><Package className="w-7 h-7 text-slate-600" /></div>
              <div>
                <p className="font-mono font-bold text-xl text-slate-900">{selectedOrder.order_code}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5"><Clock className="w-3.5 h-3.5" />{new Date(selectedOrder.created_at).toLocaleString('tr-TR')}</p>
              </div>
            </div>
            <span className={`px-4 py-1.5 rounded-full border text-sm font-medium ${st.color}`}>{st.label}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <InfoCard label="Müşteri E-posta" value={selectedOrder.email || '—'} />
            <InfoCard label="IP Adresi" value={selectedOrder.ip_address || '—'} />
            <InfoCard label="Steam ID" value={selectedOrder.steam_id || '—'} />
            <InfoCard label="Discord" value={selectedOrder.discord_id ? `${selectedOrder.discord_name || ''} (${selectedOrder.discord_id})` : '—'} />
            <InfoCard label="Toplam Tutar" value={selectedOrder.total_price > 0 ? `${selectedOrder.total_price.toLocaleString('tr-TR')} ₺` : 'Fiyatsız'} />
            <InfoCard label="Kalem Sayısı" value={`${selectedOrder.items.length} ürün`} />
          </div>
          {selectedOrder.customer_note && <div className="mb-6"><h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4" />Müşteri Notu</h4><p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">{selectedOrder.customer_note}</p></div>}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Sipariş Kalemleri</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="text-left px-4 py-2.5 font-medium text-slate-600">Ürün</th><th className="text-center px-4 py-2.5 font-medium text-slate-600">Adet</th><th className="text-right px-4 py-2.5 font-medium text-slate-600">Birim Fiyat</th><th className="text-right px-4 py-2.5 font-medium text-slate-600">Toplam</th></tr></thead>
                <tbody>{selectedOrder.items.map(item => (<tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-2.5 text-slate-700">{item.product_name}</td><td className="px-4 py-2.5 text-center text-slate-600">{item.quantity}</td><td className="px-4 py-2.5 text-right text-slate-600">{item.unit_price > 0 ? `${item.unit_price.toLocaleString('tr-TR')} ₺` : '—'}</td><td className="px-4 py-2.5 text-right font-medium text-slate-900">{item.unit_price > 0 ? `${(item.unit_price * item.quantity).toLocaleString('tr-TR')} ₺` : '—'}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
          <div className="mb-6"><h4 className="text-sm font-semibold text-slate-900 mb-3">Durumu Güncelle</h4><div className="flex flex-wrap gap-2">{statusOrder.map(status => { const s = statusLabels[status]; const isActive = selectedOrder.status === status; return (<button key={status} onClick={() => handleStatusUpdate(status)} disabled={updatingStatus || isActive} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${isActive ? s.color + ' opacity-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>{isActive && <Check className="w-3.5 h-3.5 inline mr-1.5" />}{s.label}</button>); })}</div></div>
          {selectedOrder.status !== 'cancelled' && (
            <div className="border-t border-slate-100 pt-4">
              <button onClick={handleForceCancel} disabled={cancelling} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                <Ban className="w-4 h-4" />{cancelling ? 'İptal ediliyor...' : 'Zorla İptal Et'}
              </button>
              <p className="text-xs text-slate-400 mt-2">Bu buton sipariş durumu ne olursa olsun iptal eder ve stokları iade eder.</p>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><StickyNote className="w-5 h-5 text-slate-400" />İç Notlar (sadece admin)</h3>
          <div className="flex gap-3 mb-4">
            <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNote()} placeholder="İç not ekleyin..." className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm" />
            <button onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">Ekle</button>
          </div>
          {notes.length === 0 ? <p className="text-sm text-slate-400">Henüz iç not eklenmemiş.</p> : <div className="space-y-2">{notes.map(note => (<div key={note.id} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3"><div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0"><UserIcon className="w-3.5 h-3.5 text-slate-500" /></div><div className="flex-1"><p className="text-sm text-slate-700">{note.note_text}</p><p className="text-xs text-slate-400 mt-1">{new Date(note.created_at).toLocaleString('tr-TR')}</p></div></div>))}</div>}
        </div>
        {isSuperAdmin && logs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><History className="w-5 h-5 text-slate-400" />İşlem Logları (süper admin)</h3>
            <div className="space-y-2">{logs.map(log => (<div key={log.id} className="flex items-center gap-3 text-sm border-l-2 border-slate-200 pl-3 py-1"><span className="text-slate-400 text-xs w-32 flex-shrink-0">{new Date(log.created_at).toLocaleString('tr-TR')}</span><span className="font-medium text-slate-700">{log.action}</span><span className="text-slate-500">{log.details}</span></div>))}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchCode} onChange={e => setSearchCode(e.target.value)} placeholder="Sipariş kodu veya e-posta ara..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm font-medium cursor-pointer">
            <option value="all">Tüm Durumlar</option>
            <option value="received">Alındı</option>
            <option value="preparing">Hazırlanıyor</option>
            <option value="shipped">Kargoya Verildi</option>
            <option value="delivered">Teslim Edildi</option>
            <option value="cancelled">İptal Edildi</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Package className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Bu filtreye uygun sipariş bulunamadı.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const st = statusLabels[order.status];
            return (
              <button key={order.id} onClick={() => openOrderDetail(order)} className="w-full bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:border-slate-300 hover:shadow-sm transition-all text-left">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-slate-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-900">{order.order_code}</span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{order.email || '—'}</span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{order.ip_address || '—'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(order.created_at).toLocaleString('tr-TR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-bold text-slate-900">{order.total_price > 0 ? `${order.total_price.toLocaleString('tr-TR')} ₺` : 'Fiyatsız'}</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PRODUCTS TAB
// ============================================================
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { products: prods, images: imgs } = await productsApi.list();
      setProducts(prods);
      setImages(imgs);
    } catch (err) {
      console.error('Load products error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleDelete = async (id: number) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      await productsApi.remove(id);
      loadProducts();
    } catch (err: any) {
      alert('Ürün silinemedi: ' + err.message);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      await productsApi.update(product.id, { is_active: !product.is_active });
      loadProducts();
    } catch (err: any) {
      alert('Durum güncellenemedi: ' + err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[200px]"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold text-slate-900">Ürün Yönetimi ({products.length})</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors">
            <FolderOpen className="w-4 h-4" />Toplu Ekle
          </button>
          <button onClick={() => { setEditingProduct(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
            <Plus className="w-4 h-4" />Yeni Ürün
          </button>
        </div>
      </div>

      {showForm && <ProductForm product={editingProduct} onClose={() => { setShowForm(false); setEditingProduct(null); }} onSaved={() => { setShowForm(false); setEditingProduct(null); loadProducts(); }} />}
      {showBulk && <BulkProductForm onClose={() => setShowBulk(false)} onDone={() => { setShowBulk(false); loadProducts(); }} />}

      <div className="space-y-3">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
              {images[product.id] ? <img src={images[product.id]} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Box className="w-6 h-6 text-slate-300" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-slate-900 truncate">{product.name}</h4>
                {product.has_3d_model && <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-medium"><Box className="w-3 h-3" />3D</span>}
                {product.featured && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">Öne çıkan</span>}
                {product.price === 0 && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-medium">Fiyatsız</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{product.price > 0 ? `${product.price.toLocaleString('tr-TR')} ₺` : 'Fiyat belirtilmemiş'}</span>
                <span className={product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}>Stok: {product.stock}</span>
                <span className="text-slate-400">{product.category}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => toggleActive(product)} title={product.is_active ? 'Pasif yap' : 'Aktif yap'} className={`p-2 rounded-lg transition-colors ${product.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{product.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
              <button onClick={() => { setEditingProduct(product); setShowForm(true); }} title="Düzenle" className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(product.id)} title="Sil" className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT FORM
// ============================================================
function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price.toString() ?? '0');
  const [category, setCategory] = useState(product?.category ?? 'genel');
  const [stock, setStock] = useState(product?.stock.toString() ?? '0');
  const [has3dModel, setHas3dModel] = useState(product?.has_3d_model ?? false);
  const [modelFilePath, setModelFilePath] = useState<string | null>(product?.model_url ?? null);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Lütfen bir görsel dosya seçin.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleModelChange = (file: File | null) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') { setError('3D model dosyası .glb veya .gltf formatında olmalıdır.'); return; }
    setModelFile(file);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) { setError('Ürün adı zorunludur.'); return; }
    const priceNum = parseFloat(price) || 0;
    if (priceNum < 0) { setError('Fiyat negatif olamaz.'); return; }
    const stockNum = parseInt(stock) || 0;
    if (stockNum < 0) { setError('Stok negatif olamaz.'); return; }

    setSaving(true);

    let finalModelPath = modelFilePath;
    if (modelFile) {
      setUploading(true);
      const uploaded = await uploadModelFile(modelFile);
      setUploading(false);
      if (uploaded) { finalModelPath = uploaded; }
      else { setError('3D model dosyası yüklenemedi.'); setSaving(false); return; }
    }

    let imageUrl: string | undefined;
    if (imageFile) {
      setUploading(true);
      const uploadedUrl = await uploadProductImage(imageFile);
      setUploading(false);
      if (!uploadedUrl) { setError('Fotoğraf yüklenemedi.'); setSaving(false); return; }
      imageUrl = uploadedUrl;
    }

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      category: category.trim() || 'genel',
      stock: stockNum,
      has_3d_model: has3dModel,
      model_url: has3dModel ? finalModelPath : null,
      featured,
      is_active: isActive,
    };

    try {
      if (product) {
        await productsApi.update(product.id, { ...productData, image_url: imageUrl });
      } else {
        await productsApi.create({ ...productData, image_url: imageUrl });
      }

      setSaving(false);
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-900">{product ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h3>
        <button onClick={onClose} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></button>
      </div>

      {error && <div className="flex items-center gap-2 mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Ürün Adı" icon={<Tag className="w-4 h-4" />}><input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Örn: Ceramic Vase" /></FormField>
        <FormField label="Kategori" icon={<Layers className="w-4 h-4" />}><input value={category} onChange={e => setCategory(e.target.value)} className={inputCls} placeholder="genel" /></FormField>
        <FormField label="Fiyat (₺) — 0 bırakırsanız fiyatsız olur" icon={<DollarSign className="w-4 h-4" />}><input type="number" value={price} onChange={e => setPrice(e.target.value)} className={inputCls} placeholder="0" min="0" step="0.01" /></FormField>
        <FormField label="Stok Adedi" icon={<Package className="w-4 h-4" />}><input type="number" value={stock} onChange={e => setStock(e.target.value)} className={inputCls} placeholder="0" min="0" /></FormField>
      </div>

      <FormField label="Açıklama" className="mt-4"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Ürün açıklaması..." /></FormField>

      <div className="mt-4">
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5"><ImageIcon className="w-4 h-4" />Ürün Fotoğrafı</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all text-sm text-slate-500">
            <Upload className="w-4 h-4" />{imageFile ? imageFile.name : 'Fotoğraf seç'}
            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e.target.files?.[0] ?? null)} />
          </label>
          {(imagePreview || product) && (
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100">
              {imagePreview ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full flex items-center justify-center text-slate-300" />}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">Yeni fotoğraf yüklerseniz eski fotoğraf korunur, yenisini ek olarak eklenir.</p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={has3dModel} onChange={e => setHas3dModel(e.target.checked)} className="w-4 h-4 rounded accent-slate-800" />
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Box className="w-4 h-4" />3D Model Var</span>
        </label>
        {has3dModel && (
          <div>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all text-sm text-slate-500">
              <FileBox className="w-4 h-4" />{modelFile ? modelFile.name : (modelFilePath ? 'Mevcut model var, değiştirmek için seç' : '.glb / .gltf dosyası seç')}
              <input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden" onChange={e => handleModelChange(e.target.files?.[0] ?? null)} />
            </label>
            <p className="text-xs text-slate-400 mt-1.5">3D model dosyaları siteye güvenli olarak yüklenir. Kimse dosyayı indiremez, sadece görüntüleyicide görüntülenebilir.</p>
          </div>
        )}
        <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="w-4 h-4 rounded accent-slate-800" /><span className="text-sm font-medium text-slate-700">Öne çıkan ürün</span></label>
        <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded accent-slate-800" /><span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Power className="w-4 h-4" />Aktif (vitinde görünsün)</span></label>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} disabled={saving || uploading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Yükleniyor...</> : saving ? 'Kaydediliyor...' : product ? 'Güncelle' : 'Ürünü Ekle'}
        </button>
        <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors">İptal</button>
      </div>
    </div>
  );
}

// ============================================================
// BULK PRODUCT FORM
// ============================================================
function BulkProductForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('genel');
  const [stock, setStock] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });
  const [results, setResults] = useState<{ name: string; success: boolean; error?: string }[]>([]);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const valid = Array.from(selectedFiles).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'glb' || ext === 'gltf' || f.type.startsWith('image/');
    });
    valid.sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
    setFiles(valid);
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setDone(false);
    setResults([]);
    const stockNum = parseInt(stock) || 0;

    const { products: existing } = await productsApi.list();
    let maxNum = 0;
    existing.forEach(p => {
      const match = p.name.match(/^(\d{6})$/);
      if (match) { const n = parseInt(match[1]); if (n > maxNum) maxNum = n; }
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const productNum = maxNum + i + 1;
      const productName = String(productNum).padStart(6, '0');
      setProgress({ current: i + 1, total: files.length, name: productName });

      let modelPath: string | null = null;
      let imageUrl: string | null = null;
      const ext = file.name.split('.').pop()?.toLowerCase();

      try {
        if (ext === 'glb' || ext === 'gltf') {
          modelPath = await uploadModelFile(file);
        } else if (file.type.startsWith('image/')) {
          imageUrl = await uploadProductImage(file);
        }

        const { id: newId } = await productsApi.create({
          name: productName,
          description: '',
          price: 0,
          category: category.trim() || 'genel',
          stock: stockNum,
          has_3d_model: modelPath !== null,
          model_url: modelPath,
          featured: false,
          is_active: isActive,
          image_url: imageUrl || undefined,
        });

        setResults(prev => [...prev, { name: productName, success: true }]);
      } catch (err: any) {
        setResults(prev => [...prev, { name: productName, success: false, error: err.message }]);
      }
    }

    setUploading(false);
    setDone(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-900">Toplu Ürün Ekle</h3>
        <button onClick={onClose} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-4">
        <p className="text-sm text-blue-700">
          Bir klasör seçin. Dosyalar otomatik olarak 000001, 000002, 000003... şeklinde isimlendirilir.
          Fiyat ve açıklama girilmez — daha sonra düzenleyebilirsiniz. GLB/GLTF dosyaları 3D model olarak,
          görsel dosyaları ürün fotoğrafı olarak yüklenir.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FormField label="Kategori"><input value={category} onChange={e => setCategory(e.target.value)} className={inputCls} placeholder="genel" /></FormField>
        <FormField label="Stok Adedi"><input type="number" value={stock} onChange={e => setStock(e.target.value)} className={inputCls} min="0" /></FormField>
      </div>

      <label className="flex items-center gap-3 cursor-pointer mb-4">
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded accent-slate-800" />
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Power className="w-4 h-4" />Aktif (vitinde görünsün)</span>
      </label>

      <div className="mb-4">
        <input ref={fileInputRef} type="file" multiple accept=".glb,.gltf,image/*" className="hidden" onChange={e => handleFileSelect(e.target.files)} />
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all text-sm text-slate-500 w-full justify-center">
          <FolderOpen className="w-5 h-5" />{files.length > 0 ? `${files.length} dosya seçildi` : 'Klasör / Dosya Seç'}
        </button>
        {files.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-100 p-2">
            {files.map((f, i) => (<div key={i} className="text-xs text-slate-500 py-1 flex items-center gap-2">{f.name.toLowerCase().endsWith('.glb') || f.name.toLowerCase().endsWith('.gltf') ? <Box className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}{f.name}</div>))}
          </div>
        )}
      </div>

      {uploading && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2"><Loader2 className="w-4 h-4 animate-spin" />{progress.name} oluşturuluyor... ({progress.current}/{progress.total})</div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {done && (
        <div className="mb-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-2">
            <p className="text-sm text-emerald-700 font-medium">{results.filter(r => r.success).length} ürün başarıyla oluşturuldu.</p>
            {results.some(r => !r.success) && <p className="text-sm text-red-600 mt-1">{results.filter(r => !r.success).length} ürün oluşturulamadı.</p>}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {results.map((r, i) => (<div key={i} className={`text-xs px-3 py-1.5 rounded-lg ${r.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{r.name} — {r.success ? 'OK' : r.error}</div>))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!done ? (
          <>
            <button onClick={handleBulkUpload} disabled={uploading || files.length === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Yükleniyor...</> : <><Upload className="w-4 h-4" />{files.length} Dosyayı Yükle</>}
            </button>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors">İptal</button>
          </>
        ) : (
          <button onClick={onDone} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">Tamam</button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// USERS TAB
// ============================================================
function UsersTab({ refreshProfile, currentUserId }: { refreshProfile: () => void; currentUserId: number }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'super_admin' | 'operations' | 'customer'>('operations');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { users } = await adminApi.listUsers();
      setProfiles(users);
    } catch (err) {
      console.error('Profile load error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const handleCreateAdmin = async () => {
    setFormError(null);
    if (!newEmail.trim() || !newPassword.trim()) { setFormError('E-posta ve şifre zorunludur.'); return; }
    if (newPassword.length < 6) { setFormError('Şifre en az 6 karakter olmalıdır.'); return; }
    setSaving(true);
    try {
      await adminApi.createAdmin(newEmail.trim(), newPassword, newName.trim(), newRole);
      setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('operations'); setShowForm(false); loadProfiles();
    } catch (err: any) {
      setFormError(err.message);
    }
    setSaving(false);
  };

  const handleUpdateRole = async (profileId: number, newRole: string) => {
    try {
      await adminApi.updateRole(profileId, newRole);
      loadProfiles();
      if (profileId === currentUserId) refreshProfile();
    } catch (err: any) {
      alert('Rol güncellenemedi: ' + err.message);
    }
  };

  const filtered = profiles.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!p.email.toLowerCase().includes(q) && !(p.full_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) { return <div className="flex items-center justify-center min-h-[200px]"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>; }

  const roleColors: Record<string, string> = { super_admin: 'bg-slate-900 text-white', operations: 'bg-blue-50 text-blue-700 border border-blue-200', customer: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold text-slate-900">Kullanıcı Yönetimi ({filtered.length}/{profiles.length})</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"><Plus className="w-4 h-4" />Admin Ekle</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="E-posta veya isim ara..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm font-medium cursor-pointer">
            <option value="all">Tüm Roller</option>
            <option value="super_admin">Süper Admin</option>
            <option value="operations">Operasyon</option>
            <option value="customer">Müşteri</option>
          </select>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4"><h4 className="font-semibold text-slate-900">Yeni Admin Kullanıcı</h4><button onClick={() => setShowForm(false)} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></button></div>
          {formError && <div className="flex items-center gap-2 mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{formError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Ad Soyad"><input value={newName} onChange={e => setNewName(e.target.value)} className={inputCls} placeholder="John Doe" /></FormField>
            <FormField label="E-posta"><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={inputCls} placeholder="admin@example.com" /></FormField>
            <FormField label="Şifre"><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} placeholder="Min 6 karakter" /></FormField>
            <FormField label="Rol"><select value={newRole} onChange={e => setNewRole(e.target.value as any)} className={inputCls}><option value="operations">Operasyon</option><option value="super_admin">Süper Admin</option><option value="customer">Müşteri</option></select></FormField>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleCreateAdmin} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">{saving ? 'Oluşturuluyor...' : 'Kullanıcıyı Oluştur'}</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors">İptal</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>Bu filtreye uygun kullanıcı bulunamadı.</p></div>
        ) : filtered.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0"><UserIcon className="w-5 h-5 text-slate-500" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{p.email}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-slate-500">{p.full_name || '—'}</span>
              </div>
            </div>
            <select value={p.role} onChange={e => handleUpdateRole(p.id, e.target.value)} disabled={p.id === currentUserId && p.role === 'super_admin'} className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${roleColors[p.role]}`}>
              <option value="super_admin">Süper Admin</option><option value="operations">Operasyon</option><option value="customer">Müşteri</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SHARED UI HELPERS
// ============================================================
const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm';

function FormField({ label, icon, children, className }: { label: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (<div className={className}><label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">{icon}{label}</label>{children}</div>);
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (<div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500 font-medium mb-1">{label}</p><p className="text-sm font-semibold text-slate-900">{value}</p></div>);
}


// ============================================================
// SİPARİŞ AYARLARI (sadece süper admin)
// ============================================================
function SettingsTab() {
  const [settings, setSettings] = useState<OrderRequirements | null>(null);
  const [saving, setSaving] = useState<keyof OrderRequirements | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(e => setError(e.message));
  }, []);

  async function toggle(key: keyof OrderRequirements) {
    if (!settings) return;
    const previous = settings;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(key);
    setError(null);
    try {
      setSettings(await settingsApi.update({ [key]: next[key] }));
    } catch (e: any) {
      setSettings(previous);
      setError(e.message);
    }
    setSaving(null);
  }

  const rows: { key: keyof OrderRequirements; title: string; desc: string }[] = [
    { key: 'require_steam', title: 'Steam bağlama zorunlu', desc: 'Steam hesabını bağlamayan müşteri sipariş veremez.' },
    { key: 'require_discord', title: 'Discord bağlama zorunlu', desc: 'Discord hesabını bağlamayan müşteri sipariş veremez.' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl">
      <h3 className="font-semibold text-slate-900 mb-1">Sipariş Şartları</h3>
      <p className="text-sm text-slate-500 mb-5">İkisini birden, yalnızca birini ya da hiçbirini zorunlu yapabilirsiniz. Değişiklik anında geçerli olur.</p>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900 text-sm">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!settings?.[r.key]}
              disabled={!settings || saving !== null}
              onClick={() => toggle(r.key)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${settings?.[r.key] ? 'bg-slate-900' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings?.[r.key] ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        ))}
      </div>
      {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
    </div>
  );
}