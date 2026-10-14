import { Outlet, Link, useLocation } from 'react-router-dom';
import { ACADEMY_ENABLED } from '@/config/features';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus,
  LogOut,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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
    <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
      {groups.map(({ group, items: groupItems }) => (
        <div key={group} className="space-y-1">
          {groups.length > 1 && (
            <p className="px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group}
            </p>
          )}
          {groupItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors group",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
              >
                <item.icon size={16} className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Shell() {
  const location = useLocation();
  const { user, company, role, accountType, isDemoMode, logout, exitImpersonation } = useAuth();
  // While Academy is out of scope, learner accounts get the normal workspace shell.
  const isLearner = ACADEMY_ENABLED && accountType === 'academy_learner';
  const [verificationSent, setVerificationSent] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isSuperAdmin = Boolean(user?.isSuperAdmin);

  const filteredNavItems = navigationConfig.filter(item => {
    // If the user is a super admin, they should ONLY see system management and settings tools
    if (isSuperAdmin) {
      return item.roles.includes("super_admin") || item.path === '/app/settings';
    }
    // Normal tenants should NOT see super admin tools
    if (item.roles.includes("super_admin")) return false;
    
    // Normal role checks for tenants
    return (!role || item.roles.includes(role)) && (!isLearner || item.path === '/app/academy');
  });

  const brandBlock = (
    <div className="p-5 pb-6 border-b border-border mb-3">
      <Link to={isLearner ? "/app/academy/allplan" : "/app"} className="flex items-center gap-3 group transition-all">
        <div className="w-8 h-8 bg-primary rounded-xs flex items-center justify-center font-mono font-black text-white text-xs shadow-xs">
          {isLearner ? 'BP' : 'BM'}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-tight text-foreground leading-none">
            {isLearner ? 'BIMPlan Academy' : 'BIMMetraj'}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            {isLearner ? 'Öğrenci Alanı' : 'openBIM & 5D İhale'}
          </span>
        </div>
      </Link>
    </div>
  );

  const accountBlock = (
    <div className="mt-auto p-4 border-t border-border space-y-3 bg-muted/20">
      <div className="rounded-sm p-2.5 border border-border bg-card">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
          {isLearner ? 'ÖĞRENCİ HESABI' : 'ÇALIŞMA ALANI'}
        </p>
        <p className="text-xs font-semibold text-foreground truncate">{company?.name || 'Yükleniyor...'}</p>
      </div>

      <Button
        onClick={logout}
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-medium h-9 gap-2.5 px-3 rounded-sm"
      >
        <LogOut size={15} /> Çıkış Yap
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-sm bg-primary px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-white transition-transform focus:translate-y-0"
      >
        İçeriğe geç
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 border-r border-border bg-card flex-col h-screen sticky top-0 z-40">
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
      <main className="flex-1 flex flex-col min-w-0">
        {(user?.impersonatedBy || Boolean(localStorage.getItem('admin_session_backup'))) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-500/40 bg-amber-500/15 px-6 py-2 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                Şu anda <strong>{company?.name || 'Müşteri'}</strong> adına impersonate modundasınız
                {user?.readOnly && <span className="ml-2 rounded-xs bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-600/50">SALT-OKUNUR</span>}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exitImpersonation}
              className="border-amber-400/50 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 text-xs font-mono uppercase tracking-wider h-7 px-2.5"
            >
              Çıkış Yap / Admin Paneline Dön
            </Button>
          </div>
        )}
        {isLearner && user && !user.emailVerified && (
          <div className="flex flex-col gap-3 border-b border-amber-500/25 bg-amber-500/[0.07] px-6 py-2.5 text-xs text-amber-100 sm:flex-row sm:items-center sm:justify-between">
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
              className="border-amber-500/30 bg-transparent text-amber-100 hover:bg-amber-500/10 text-xs h-7"
            >
              {verificationSent ? 'Bağlantı Gönderildi' : 'Doğrulama Bağlantısı Gönder'}
            </Button>
          </div>
        )}
        {isDemoMode && (
          <div className="border-b border-primary/20 bg-primary/10 px-6 py-1.5 text-center text-xs font-mono font-semibold text-primary">
            Demo modu — geliştirme ortamında otomatik erişim aktif
          </div>
        )}
        
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
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
            <div className="hidden lg:flex items-center gap-3 pr-4 border-r border-border">
               <div className="w-8 h-8 rounded-xs bg-muted border border-border flex items-center justify-center font-mono font-bold text-primary text-xs">
                 {user?.fullName?.charAt(0) || 'U'}
               </div>
               <div className="flex flex-col">
                 <span className="text-xs font-semibold text-foreground leading-tight">{user?.fullName}</span>
                 <span className="font-mono text-[10px] text-muted-foreground uppercase">{role || 'Üye'}</span>
               </div>
            </div>
          </div>

          {!isLearner && (
            <Link to="/app/quotes/new">
              <Button className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold h-9 px-3 sm:px-4 rounded-sm shadow-xs gap-1.5">
                <Plus size={15} />
                <span>Yeni Teklif Hazırla</span>
              </Button>
            </Link>
          )}
        </header>

        {/* Content Area */}
        <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="px-8 py-3 border-t border-border bg-card/40 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>© 2026 {isLearner ? 'BIMPlan Academy' : 'BIMMetraj'} · openBIM & 5D İhale Masası</span>
          <span className="hidden sm:inline">openBIM QTO · RG 33331 e-PYS & Kanıtlı Metraj</span>
        </footer>
      </main>
    </div>
  );
}
