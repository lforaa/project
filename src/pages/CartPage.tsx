import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { navigate } from '@/lib/router';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, Box, ArrowLeft } from 'lucide-react';

export function CartPage() {
  const { items, removeItem, updateQuantity, total, count } = useCart();
  const { profile } = useAuth();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Sepetiniz boş</h2>
        <p className="text-slate-500 mb-6">Ürünleri keşfetmek için vitine göz atın.</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Vitine Git
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Alışverişe devam et
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Sepetim <span className="text-slate-400 text-lg font-normal">({count} ürün)</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div
              key={item.product_id}
              className="flex gap-4 bg-white rounded-2xl border border-slate-200 p-4"
            >
              <button
                onClick={() => navigate(`/product/${item.product_id}`)}
                className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-50 relative"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Box className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                {item.has_3d_model && (
                  <div className="absolute top-1 left-1 rounded bg-slate-900/80 px-1 py-0.5 text-white text-[9px] font-medium">
                    3D
                  </div>
                )}
              </button>

              <div className="flex-1 flex flex-col">
                <button onClick={() => navigate(`/product/${item.product_id}`)} className="text-left">
                  <h3 className="font-semibold text-slate-900 hover:text-slate-700 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {item.price > 0 ? `${item.price.toLocaleString('tr-TR')} ₺ / adet` : 'Fiyat belirtilmemiş'}
                  </p>
                </button>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-l-lg transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-r-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">
                      {item.price > 0 ? `${(item.price * item.quantity).toLocaleString('tr-TR')} ₺` : '—'}
                    </span>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Sipariş Özeti</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Ara toplam</span>
                <span>{total > 0 ? `${total.toLocaleString('tr-TR')} ₺` : 'Fiyatsız'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kargo</span>
                <span className="text-emerald-600 font-medium">Ücretsiz</span>
              </div>
              <div className="border-t border-slate-100 pt-3 mt-3">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Toplam</span>
                  <span>{total > 0 ? `${total.toLocaleString('tr-TR')} ₺` : 'Fiyatsız'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(profile ? '/checkout' : '/auth')}
              className="w-full flex items-center justify-center gap-2 mt-6 py-3 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              {profile ? 'Ödemeye Geç' : 'Giriş Yap ve Sipariş Ver'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
