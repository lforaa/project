import { useEffect, useState } from 'react';
import { productsApi, Product, getModelSignedUrl } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { navigate } from '@/lib/router';
import { Viewer3D } from '@/components/Viewer3D';
import { PhotoGallery } from '@/components/PhotoGallery';
import { ShoppingCart, Box, ArrowLeft, Check, Minus, Plus, AlertCircle, Loader2 } from 'lucide-react';

interface ProductDetailPageProps {
  productId: string;
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { profile } = useAuth();

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    setModelUrl(null);
    try {
      const data = await productsApi.get(parseInt(productId));
      setProduct(data.product);
      setImages(data.images);
      if (data.product.has_3d_model && data.product.model_url) {
        setModelLoading(true);
        const signed = await getModelSignedUrl(data.product.model_url);
        setModelUrl(signed);
        setModelLoading(false);
      }
    } catch (err) {
      console.error('Product load error:', err);
    }
    setLoading(false);
  }

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      image_url: images[0],
      has_3d_model: product.has_3d_model,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 text-lg">Ürün bulunamadı.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-slate-700 font-medium hover:underline">Vitine dön</button>
      </div>
    );
  }

  const watermarkText = profile
    ? `${profile.email} · ${new Date().toLocaleDateString('tr-TR')} · ÖNİZLEME`
    : `Misafir · ${new Date().toLocaleDateString('tr-TR')} · ÖNİZLEME`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />Vitine dön
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div>
          {product.has_3d_model && product.model_url ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-medium">
                  <Box className="w-3.5 h-3.5" />3D Model Görüntüleyici
                </div>
              </div>
              {modelLoading ? (
                <div className="w-full h-[600px] rounded-2xl bg-slate-900 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                    <p className="text-slate-400 text-sm">3D model hazırlanıyor...</p>
                  </div>
                </div>
              ) : modelUrl ? (
                <Viewer3D modelUrl={modelUrl} watermarkText={watermarkText} />
              ) : (
                <div className="w-full h-[600px] rounded-2xl bg-slate-900 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-slate-400 text-sm">3D model yüklenemedi.</p>
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Model interaktif olarak görüntülenmektedir. Sol tık ile döndürün, tekerlek ile yakınlaştırın, sağ tık ile kaydırın.
                Model kopyalanamaz; kopyalamayı zorlaştıran caydırıcı önlemler uygulanmıştır.
              </p>
            </>
          ) : (
            <PhotoGallery images={images} productName={product.name} />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium capitalize">{product.category}</span>
            {product.has_3d_model && <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium"><Box className="w-3.5 h-3.5" />3D Model</span>}
            {product.price === 0 && <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">Fiyat belirlenecek</span>}
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-3">{product.name}</h1>
          {product.price > 0 ? (
            <p className="text-2xl font-bold text-slate-900 mb-6">{product.price.toLocaleString('tr-TR')} ₺</p>
          ) : (
            <p className="text-2xl font-bold text-slate-400 mb-6">Fiyat henüz belirlenmemiş</p>
          )}

          {product.description && (
            <div className="prose prose-slate max-w-none mb-8">
              <p className="text-slate-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-l-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Minus className="w-4 h-4" /></button>
              <span className="w-12 text-center font-medium text-slate-900">{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} disabled={qty >= product.stock} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-r-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={handleAddToCart} disabled={product.stock <= 0} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${added ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              {added ? <><Check className="w-4 h-4" />Sepete Eklendi</> : <><ShoppingCart className="w-4 h-4" />Sepete Ekle</>}
            </button>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Teslimat Bilgisi</h3>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>· 2-5 iş günü içinde kargo</li>
              <li>· 30 gün içinde ücretsiz iade</li>
              <li>· Güvenli ödeme</li>
            </ul>
          </div>

          {product.stock <= 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />Bu ürün şu an stokta değil.</div>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />Son {product.stock} adet! Acele edin.</div>
          )}
        </div>
      </div>
    </div>
  );
}
