import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ACADEMY_ENABLED } from '@/config/features';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus,
  LogOut,
  Menu,
  Compass
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { fetchWithAuth } from '@/lib/api';

import { navigationConfig, navGroupOrder, type NavItem } from '@/constants/navigation';

function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) return true;
  if (itemPath === '/app') return false;
  return pathname.startsWith(`${itemPath}/`);
}

function NavList({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  const groups = navGroupOrder
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((g) => g.items.length > 0);

  return (
    <nav className="flex-1 overflow-y-auto divide-y divide-border">
      {groups.map(({ group, items: groupItems }, groupIdx) => (
        <div key={group} className="py-3">
          {groups.length > 1 && (
            <p className="px-5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="text-primary">0{groupIdx + 1} /</span>
              <span>{group}</span>
            </p>
          )}
          <div className="mt-1">
            {groupItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 text-xs font-medium transition-colors group border-l-[3px]",
                    isActive
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/60"
                  )}
                >
                  <item.icon size={15} className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, role, accountType, isDemoMode, logout, exitImpersonation } = useAuth();
  const isLearner = ACADEMY_ENABLED && accountType === 'academy_learner';
  const [verificationSent, setVerificationSent] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activePlanName, setActivePlanName] = useState<string | null>(null);

  const isSuperAdmin = Boolean(user?.isSuperAdmin);

  useEffect(() => {
    if (isSuperAdmin || isLearner || !company?.id) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => fetchWithAuth('/api/billing/usage-stats'))
      .then(async (res) => {
        if (cancelled || !res?.ok) return;
        const body = await res.json();
        if (!cancelled && typeof body?.plan === 'string' && body.plan !== 'unavailable') {
          setActivePlanName(body.plan);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [company?.id, isSuperAdmin, isLearner, location.pathname]);

  const filteredNavItems = navigationConfig.filter(item => {
    if (isSuperAdmin) {
      return item.roles.includes("super_admin") || item.path === '/app/settings';
    }
    if (item.roles.includes("super_admin")) return false;
    return (!role || item.roles.includes(role)) && (!isLearner || item.path === '/app/academy');
  });

  const brandBlock = (
    <div className="px-5 py-5 border-b border-border bg-background">
      <Link to={isLearner ? "/app/academy/allplan" : "/app"} className="flex items-center gap-3 group">
        <div className="w-8 h-8 bg-primary flex items-center justify-center font-mono font-bold text-primary-foreground text-xs border border-primary">
          {isLearner ? 'BP' : 'BM'}
        </div>
        <div className="flex flex-col">
          <span className="font-display-serif text-2xl tracking-tight text-foreground leading-none">
            {isLearner ? 'BIMPlan Academy' : 'BIMMetraj'}
          </span>
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mt-1">
            {isLearner ? 'EĞİTİM PAFTASI' : 'MİMARİ METRAJ & İHALE PAFTASI'}
          </span>
        </div>
      </Link>
    </div>
  );

  const accountBlock = (
    <div className="mt-auto p-4 border-t border-border space-y-3 bg-background">
      <div className="p-3 border border-border bg-card space-y-2">
        <div>
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
            {isLearner ? 'ÖĞRENCİ HESABI' : 'AKTİF PROJE OFİSİ'}
          </p>
          <p className="text-xs font-semibold text-foreground truncate">{company?.name || 'Yükleniyor...'}</p>
        </div>
        {!isLearner && !isSuperAdmin && (
          <div className="border-t border-border pt-2 flex items-center justify-between gap-2">
            <span className="inline-block truncate border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-primary">
              {activePlanName || '14 Günlük Deneme'}
            </span>
            <Link
              to="/app/billing"
              className="shrink-0 font-mono text-[10px] font-semibold text-foreground hover:text-primary underline underline-offset-4"
            >
              Paketler ↗
            </Link>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (location.pathname === '/app') {
            window.dispatchEvent(new CustomEvent('bimmetraj:start-tour'));
          } else {
            navigate('/app?tour=1');
          }
        }}
        className="w-full flex items-center justify-start text-primary hover:bg-primary/10 text-xs font-mono uppercase tracking-wider h-8 gap-2 px-3 border border-primary/30 rounded-xs transition-colors"
        title="BIMMetraj Sistem Hızlı Turunu Başlat"
      >
        <Compass size={14} className="text-primary shrink-0" />
        <span>Sistem Hızlı Turu</span>
      </button>

      <Button
        onClick={logout}
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-mono uppercase tracking-wider h-9 gap-2.5 px-3 border border-transparent hover:border-destructive/30"
      >
        <LogOut size={14} /> Çıkış Yap
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-24 bg-primary px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-primary-foreground transition-transform focus:translate-y-0"
      >
        İçeriğe geç
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col h-screen sticky top-0 z-40">
        {brandBlock}
        <NavList items={filteredNavItems} pathname={location.pathname} />
        {accountBlock}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-card border-border p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Gezinme Menüsü</SheetTitle>
          </SheetHeader>
          {brandBlock}
          <NavList items={filteredNavItems} pathname={location.pathname} onNavigate={() => setMobileNavOpen(false)} />
          {accountBlock}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0 outline-none bg-background">
        {user?.impersonatedBy && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-primary bg-primary/10 px-6 py-2 text-xs text-foreground">
            <div className="flex items-center gap-2 font-medium">
              <span className="status-dot" />
              <span>
                Şu anda <strong>{company?.name || 'Müşteri'}</strong> adına impersonate modundasınız
                {user?.readOnly && <span className="ml-2 bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/40">SALT-OKUNUR</span>}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exitImpersonation}
              className="border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground text-xs font-mono uppercase tracking-wider h-7 px-2.5"
            >
              Çıkış Yap / Admin Paneline Dön
            </Button>
          </div>
        )}
        {isLearner && user && !user.emailVerified && (
          <div className="flex flex-col gap-3 border-b border-border bg-card px-6 py-2.5 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>E-posta adresinizi doğrulayın. Dersleri kullanabilirsiniz; sertifika işlemleri doğrulama tamamlanana kadar kilitlidir.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={verificationSent}
              onClick={async () => {
                const response = await fetch('/api/auth/resend-verification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: user.email })
                });
                if (response.ok) setVerificationSent(true);
              }}
              className="border-border bg-background text-foreground hover:border-primary hover:text-primary text-xs h-7"
            >
              {verificationSent ? 'Bağlantı Gönderildi' : 'Doğrulama Bağlantısı Gönder'}
            </Button>
          </div>
        )}
        {isDemoMode && (
          <div className="border-b border-border bg-card px-6 py-1.5 text-center text-[11px] font-mono uppercase tracking-wider text-primary">
            Demo modu — geliştirme ortamında otomatik erişim aktif
          </div>
        )}

        {/* Header (Pafta Antet Şeridi) */}
        <header className="h-16 border-b border-border bg-background px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              onClick={() => setMobileNavOpen(true)}
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground hover:text-foreground"
              aria-label="Menüyü aç"
            >
              <Menu size={20} />
            </Button>
            <div className="hidden lg:flex items-center gap-3 pr-5 border-r border-border">
              <div className="w-8 h-8 bg-card border border-border flex items-center justify-center font-mono font-bold text-primary text-xs">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground leading-tight">{user?.fullName}</span>
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{role || 'Üye'}</span>
              </div>
            </div>
            <span className="hidden xl:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="status-dot" />
              TEKNİK OFİS PAFTASI · RG 33331 &amp; ÇŞB UYUMLU
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (location.pathname === '/app') {
                  window.dispatchEvent(new CustomEvent('bimmetraj:start-tour'));
                } else {
                  navigate('/app?tour=1');
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-primary/40 bg-card hover:bg-primary/10 text-primary text-xs font-mono font-medium rounded-xs transition-colors"
              title="BIMMetraj Sistem Hızlı Turunu Başlat"
            >
              <Compass size={14} className="text-primary shrink-0" />
              <span className="hidden sm:inline">Hızlı Tur</span>
            </button>
            <ThemeToggle />
            {!isLearner && (
              <Link to="/app/quotes/new" className="pafta-button !min-h-9 !py-2 !px-3.5">
                <Plus size={14} />
                <span>Yeni Teklif Hazırla</span>
              </Link>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="px-8 py-3 border-t border-border bg-card flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <span>© 2026 {isLearner ? 'BIMPlan Academy' : 'BIMMetraj'} · MİMARİ METRAJ VE İHALE PAFTASI</span>
          <span className="hidden sm:inline">IFC4 QTO · RG 33331 e-PYS · KANITLI MİNHA CETVELİ</span>
        </footer>
      </main>
    </div>
  );
}
