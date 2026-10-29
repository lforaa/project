import { useEffect, useState, ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { useRouter } from '@/lib/router';
import { Header } from '@/components/Header';
import { CatalogPage } from '@/pages/CatalogPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { AdminPage } from '@/pages/AdminPage';
import { AuthPage } from '@/pages/AuthPage';
import { Box, AlertTriangle, ArrowLeft } from 'lucide-react';
import { navigate } from '@/lib/router';

function AppLoader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-[100]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center animate-pulse">
          <Box className="w-8 h-8 text-white" />
        </div>
        <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium tracking-wide">Vitrin Yükleniyor</p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">404</h1>
        <p className="text-slate-500 mb-6">Aradığınız sayfa bulunamadı.</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}

function ErrorPage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bir şeyler ters gitti</h1>
        <p className="text-slate-500 mb-6">{message}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}

function Routes() {
  const { route } = useRouter();
  const path = route.path;
  const [appLoading, setAppLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAppLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      console.error('Global error:', e.error);
      setGlobalError(e.message || 'Beklenmeyen bir hata oluştu.');
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  if (appLoading) return <AppLoader />;

  if (globalError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <ErrorPage message={globalError} onRetry={() => { setGlobalError(null); window.location.reload(); }} />
      </div>
    );
  }

  if (path === '/auth') {
    return <AuthPage />;
  }

  let page: ReactNode;
  let isNotFound = false;

  if (path === '/' || path === '') {
    page = <CatalogPage />;
  } else if (path.startsWith('/product/')) {
    const productId = path.replace('/product/', '');
    page = <ProductDetailPage productId={productId} />;
  } else if (path === '/cart') {
    page = <CartPage />;
  } else if (path === '/checkout') {
    page = <CheckoutPage />;
  } else if (path === '/orders') {
    page = <OrdersPage />;
  } else if (path === '/admin') {
    page = <AdminPage />;
  } else {
    page = <NotFoundPage />;
    isNotFound = true;
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        {page}
        <footer className="border-t border-slate-200 bg-white py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-400">3D Showroom &copy; {new Date().getFullYear()}</div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      {page}
      <footer className="border-t border-slate-200 bg-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-400">3D Showroom &copy; {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
