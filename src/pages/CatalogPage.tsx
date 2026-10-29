import { useEffect, useState } from 'react';
import { productsApi, Product } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { navigate } from '@/lib/router';
import { useModelThumbnails } from '@/hooks/useModelThumbnails';
import { Box, ShoppingCart, Star, Search, Filter } from 'lucide-react';

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const { addItem } = useCart();
  const { thumbs, failed } = useModelThumbnails(products);
  const [views, setViews] = useState<Record<number, number>>({});
  const cardImage = (p: Product) => thumbs[p.id]?.[views[p.id] ?? 0] ?? images[p.id];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await productsApi.list();
      setProducts(data.products);
      setImages(data.images);
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAddToCart = (product: Product) => {
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: images[product.id],
      has_3d_model: product.has_3d_model,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 rounded-full bg-emerald-500 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 mb-6">
              <Box className="w-4 h-4" />
              <span className="text-sm font-medium">SharpDev</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Ürünleri 3D modeliyle keşfedin
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Modelleri interaktif olarak inceleyin, döndürün, yakınlaştırın.
              Beğendiğiniz ürünleri sepete ekleyip kolayca sipariş verin.
              Şiparisinizi discord bize iletin, bizde size en kısa sürede ulaştıralım.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ürün ara..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="flex gap-1.5 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    category === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Tümü' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">Arama kriterlerine uygun ürün bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(product => (
              <div
                key={product.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all"
              >
                <div className="relative">
                <button
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative w-full aspect-square overflow-hidden bg-slate-50"
                >
                  {cardImage(product) ? (
                    <img
                      src={cardImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Box className={`w-12 h-12 text-slate-300 ${product.has_3d_model && product.model_url && !failed.has(product.id) ? 'animate-pulse' : ''}`} />
                    </div>
                  )}
                  {product.has_3d_model && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 text-white text-xs font-medium">
                      <Box className="w-3.5 h-3.5" />
                      3D
                    </div>
                  )}
                  {product.featured && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-amber-400/90 backdrop-blur-sm px-2 py-1 text-amber-900 text-xs font-medium">
                      <Star className="w-3 h-3 fill-amber-900" />
                      Öne çıkan
                    </div>
                  )}
                </button>

                {thumbs[product.id]?.length === 2 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center">
                    {['Ön', 'Arka'].map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        aria-label={`${label} görünüm`}
                        onClick={() => setViews(v => ({ ...v, [product.id]: i }))}
                        onMouseEnter={() => setViews(v => ({ ...v, [product.id]: i }))}
                        className="p-1"
                      >
                        <span
                          className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                            (views[product.id] ?? 0) === i ? 'bg-slate-800' : 'bg-slate-400/60'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
                </div>

                <div className="p-5">
                  <button onClick={() => navigate(`/product/${product.id}`)} className="text-left w-full">
                    <h3 className="font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                  </button>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <span className="text-lg font-bold text-slate-900">
                        {product.price > 0 ? `${product.price.toLocaleString('tr-TR')} ₺` : 'Fiyat belirtilmemiş'}
                      </span>
                      {product.stock > 0 ? (
                        <span className="block text-xs text-emerald-600 font-medium mt-0.5">Stokta ({product.stock} adet)</span>
                      ) : (
                        <span className="block text-xs text-red-500 font-medium mt-0.5">Stokta yok</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock <= 0}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Sepete Ekle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 