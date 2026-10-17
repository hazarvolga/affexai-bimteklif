import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, LayoutDashboard, Building2, Package, Activity, Menu, Cpu, BarChart3, Database, Map as MapIcon } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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

  if (loading) {
    return (
      <div role="status" className="min-h-screen bg-background p-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Yükleniyor...
      </div>
    );
  }

  if (!user || !user.isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  const navigation = (
    <>
      <div className="flex h-16 items-center border-b border-border bg-background px-5">
        <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center border border-primary bg-primary font-mono text-xs font-bold text-primary-foreground">
            BM
          </div>
          <div>
            <span className="block font-display-serif text-2xl leading-none text-foreground">TeklifPro</span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-widest text-primary">PLATFORM YÖNETİM PAFTASI</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <p className="px-5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="text-primary">01 /</span> YÖNETİM DİZİNİ
        </p>
        <nav className="mt-1">
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`group flex items-center gap-3 border-l-[3px] px-5 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 font-semibold text-primary'
                    : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border bg-background p-4 space-y-3">
        <ThemeToggle className="w-full justify-center" />
        <div className="flex items-center gap-3 border border-border bg-card p-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-background font-mono text-xs font-bold text-primary">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{user.email}</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-wider text-primary">Süper Admin</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 border border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={15} />
          Çıkış Yap
        </button>
      </div>
    </>
  );

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <div className="flex h-screen bg-background text-foreground print:block print:h-auto">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-50 -translate-y-24 bg-primary px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-primary-foreground transition-transform focus:translate-y-0"
        >
          İçeriğe geç
        </a>
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex print:hidden">
          {navigation}
        </aside>
        <SheetContent side="left" className="gap-0 border-border bg-card p-0 text-foreground" aria-describedby={undefined}>
          <SheetTitle className="sr-only">TeklifPro Yönetim</SheetTitle>
          {navigation}
        </SheetContent>

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto bg-background outline-none print:overflow-visible">
          <div className="flex h-14 items-center justify-between gap-3 border-b border-border bg-background px-4 md:hidden">
            <div className="flex items-center gap-3">
              <SheetTrigger
                aria-label="Yönetim menüsü"
                title="Yönetim menüsü"
                className="flex h-9 w-9 items-center justify-center text-foreground"
              >
                <Menu size={20} />
              </SheetTrigger>
              <span className="font-display-serif text-xl text-foreground">TeklifPro Yönetim</span>
            </div>
            <ThemeToggle showLabel={false} />
          </div>
          <Outlet />
        </main>
      </div>
    </Sheet>
  );
}
