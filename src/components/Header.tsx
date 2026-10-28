import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { navigate } from '@/lib/router';
import { Box, ShoppingCart, User as UserIcon, Package, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { profile, signOut } = useAuth();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const isStaff = profile?.role === 'super_admin' || profile?.role === 'operations';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 hidden sm:block">3D Showroom</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink onClick={() => navigate('/')} label="Vitrin" />
            {profile && <NavLink onClick={() => navigate('/orders')} label="Siparişlerim" />}
            {isStaff && <NavLink onClick={() => navigate('/admin')} label="Admin Panel" />}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/cart')}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-slate-700" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>

            {profile ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {profile?.full_name || profile?.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-5 h-5 text-slate-700" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Giriş Yap
              </button>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden flex flex-col gap-1 pb-4 border-t border-slate-100 pt-3">
            <MobileNavLink onClick={() => { navigate('/'); setMenuOpen(false); }} icon={<Box className="w-4 h-4" />} label="Vitrin" />
            {profile && <MobileNavLink onClick={() => { navigate('/orders'); setMenuOpen(false); }} icon={<Package className="w-4 h-4" />} label="Siparişlerim" />}
            {isStaff && <MobileNavLink onClick={() => { navigate('/admin'); setMenuOpen(false); }} icon={<LayoutDashboard className="w-4 h-4" />} label="Admin Panel" />}
            {profile ? (
              <MobileNavLink onClick={handleSignOut} icon={<LogOut className="w-4 h-4" />} label="Çıkış Yap" />
            ) : (
              <MobileNavLink onClick={() => { navigate('/auth'); setMenuOpen(false); }} icon={<UserIcon className="w-4 h-4" />} label="Giriş Yap" />
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
    >
      {label}
    </button>
  );
}

function MobileNavLink({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
