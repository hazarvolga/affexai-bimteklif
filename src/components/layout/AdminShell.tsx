import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, LayoutDashboard, Building2, Package, Activity, Menu, Cpu, BarChart3, Database, Map as MapIcon } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const adminNavigation = [
  { label: 'Genel Bakış', path: '/admin', icon: LayoutDashboard },
  { label: 'Firmalar', path: '/admin/tenants', icon: Building2 },
  { label: 'IFC Kuyruk', path: '/admin/queue', icon: Cpu },
  { label: 'Fiyat & Poz Kaynakları', path: '/admin/pricing-sources', icon: Database },
  { label: 'Paket Yönetimi', path: '/admin/plans', icon: Package },
  { label: 'Raporlar', path: '/admin/reports', icon: BarChart3 },
  { label: 'Denetim Logları', path: '/admin/logs', icon: Activity },
  { label: 'Geliştirici Yol Haritası', path: '/admin/roadmap', icon: MapIcon },
];

export function AdminShell() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return <div role="status" className="min-h-screen bg-zinc-950 p-6 text-zinc-300">Yükleniyor...</div>;

  if (!user || !user.isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  const navigation = (
    <>
        <div className="flex h-16 items-center border-b border-indigo-900/30 px-6">
          <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="font-bold text-white">S</span>
            </div>
            <div>
              <span className="block font-bold tracking-tight text-white">TeklifPro</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400">Platform Yönetimi</span>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <nav className="space-y-1 px-3">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-indigo-500/10 text-indigo-400' 
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-indigo-900/30 p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-indigo-900/50 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-300">{user.email.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{user.email}</p>
              <p className="truncate text-xs text-indigo-400">Süper Admin</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
    </>
  );

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
    <div className="flex h-screen bg-zinc-950 print:block print:h-auto">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-sm bg-indigo-600 px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-white transition-transform focus:translate-y-0"
      >
        İçeriğe geç
      </a>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-indigo-900/30 bg-zinc-950 md:flex print:hidden">
        {navigation}
      </aside>
      <SheetContent side="left" className="gap-0 bg-zinc-950 p-0 text-zinc-200" aria-describedby={undefined}>
        <SheetTitle className="sr-only">TeklifPro Yönetim</SheetTitle>
        {navigation}
      </SheetContent>

      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto bg-zinc-950 outline-none print:overflow-visible">
        <div className="flex h-14 items-center gap-3 border-b border-zinc-800 px-4 md:hidden">
          <SheetTrigger aria-label="Yönetim menüsü" title="Yönetim menüsü"
            className="flex h-9 w-9 items-center justify-center text-zinc-200">
            <Menu size={20} />
          </SheetTrigger>
          <span className="text-sm font-semibold text-zinc-200">TeklifPro Yönetim</span>
        </div>
        <Outlet />
      </main>
    </div>
    </Sheet>
  );
}
