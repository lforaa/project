import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi } from '@/lib/api';
import { navigate } from '@/lib/router';
import { CheckCircle2, ArrowLeft, AlertCircle, ShoppingBag } from 'lucide-react';

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  if (!profile) {
    navigate('/auth');
    return null;
  }

  if (orderCode) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Siparişiniz Alındı!</h1>
          <p className="text-slate-500 mb-6">Siparişiniz başarıyla oluşturuldu.</p>

          <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 mb-6">
            <p className="text-sm text-slate-500 mb-1">Sipariş Kodunuz</p>
            <p className="text-3xl font-bold text-slate-900 tracking-wider font-mono">{orderCode}</p>
          </div>

          <p className="text-sm text-slate-500 mb-6">
            Sipariş kodunuzu kaydedin. Siparişlerim sayfasından durumunu takip edebilirsiniz.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/orders')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Siparişlerime Git
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Alışverişe Devam Et
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Sepetiniz boş</h2>
        <button
          onClick={() => navigate('/')}
          className="text-slate-700 font-medium hover:underline"
        >
          Vitine dön
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const itemsPayload = items.map(i => ({
      product_id: i.product_id,
      quantity: i.quantity,
    }));

    let clientIp = '';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        clientIp = ipData.ip || '';
      }
    } catch {
      // IP alınamasa da sipariş oluşturulur
    }

    try {
      const { order_code } = await ordersApi.create(itemsPayload, {
        customer_note: note,
        delivery_name: name,
        delivery_address: '',
        delivery_phone: '',
        ip_address: clientIp,
      });
      setOrderCode(order_code);
      clearCart();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/cart')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Sepete dön
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Sipariş Tamamla</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Bilgiler</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Sipariş Notu <span className="text-slate-400 font-normal">(opsiyonel)</span></h3>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder='Örn: "Renk tercihi: mat siyah"'
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </form>

        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Sipariş Özeti</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map(item => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <span className="text-slate-700 font-medium">{item.name}</span>
                    <span className="text-slate-400"> × {item.quantity}</span>
                  </div>
                  <span className="text-slate-600">{item.price > 0 ? `${(item.price * item.quantity).toLocaleString('tr-TR')} ₺` : '—'}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Kargo</span>
                <span className="text-emerald-600 font-medium">Ücretsiz</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-lg">
                <span>Toplam</span>
                <span>{total > 0 ? `${total.toLocaleString('tr-TR')} ₺` : 'Fiyatsız'}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 mt-6 py-3 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Siparişi Onayla'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
