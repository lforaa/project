import { useEffect, useState } from 'react';
import { ordersApi, Order, OrderItem } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { navigate } from '@/lib/router';
import { Package, ChevronRight, Calendar, Clock, Ban, AlertCircle } from 'lucide-react';

const statusLabels: Record<string, { label: string; color: string }> = {
  received: { label: 'Alındı', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  preparing: { label: 'Hazırlanıyor', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  shipped: { label: 'Kargoya Verildi', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  delivered: { label: 'Teslim Edildi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'İptal Edildi', color: 'bg-red-50 text-red-700 border-red-200' },
};

export function OrdersPage() {
  const { profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<(Order & { items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      navigate('/auth');
      return;
    }
    loadOrders();
  }, [profile, authLoading]);

  async function loadOrders() {
    try {
      const { orders: data } = await ordersApi.myList();
      setOrders(data);
    } catch (err) {
      console.error('Load orders error:', err);
    }
    setLoading(false);
  }

  async function handleCancel(orderId: number) {
    if (!confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return;
    setCancellingId(orderId);
    setCancelError(null);
    try {
      await ordersApi.cancel(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as Order['status'] } : o));
    } catch (err: any) {
      setCancelError(err.message);
    }
    setCancellingId(null);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Henüz sipariş yok</h2>
        <p className="text-slate-500 mb-6">İlk siparişinizi vermek için vitine göz atın.</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Vitine Git
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Siparişlerim</h1>

      {cancelError && (
        <div className="flex items-center gap-2 mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {cancelError}
        </div>
      )}

      <div className="space-y-4">
        {orders.map(order => {
          const st = statusLabels[order.status] || statusLabels.received;
          const isExpanded = expanded === order.id;
          const canCancel = order.status === 'received';
          return (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : order.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{order.order_code}</span>
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{order.total_price > 0 ? `${order.total_price.toLocaleString('tr-TR')} ₺` : 'Fiyatsız'}</span>
                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Ürünler</h4>
                    <div className="space-y-2">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            {item.product_name} <span className="text-slate-400">× {item.quantity}</span>
                          </span>
                          <span className="text-slate-600">
                            {item.unit_price > 0 ? `${(item.unit_price * item.quantity).toLocaleString('tr-TR')} ₺` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.customer_note && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-1">Sipariş Notunuz</h4>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{order.customer_note}</p>
                    </div>
                  )}

                  {order.status === 'received' ? (
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={cancellingId === order.id}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      {cancellingId === order.id ? 'İptal ediliyor...' : 'Siparişi İptal Et'}
                    </button>
                  ) : order.status !== 'cancelled' ? (
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5" />
                      Siparişiniz hazırlanma aşamasında olduğu için iptal edilemez. Lütfen bizimle iletişime geçin.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
