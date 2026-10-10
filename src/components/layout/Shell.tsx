import { Outlet, Link, useLocation } from 'react-router-dom';
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
    <nav className="flex-1 px-4 space-y-5 overflow-y-auto custom-scrollbar">
      {groups.map(({ group, items: groupItems }) => (
        <div key={group} className="space-y-1.5">
          {groups.length > 1 && (
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-700">{group}</p>
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
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xl shadow-orange-900/20"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-900/50"
                )}
              >
                <item.icon size={18} className={cn(
                  "transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-white" : "text-zinc-600 group-hover:text-orange-500"
                )} />
                {item.label}
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
  const isLearner = accountType === 'academy_learner';
  const [verificationSent, setVerificationSent] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const superAdmins = ['admin@teklifpro.ai', 'hazarvolga@gmail.com'];
  const isSuperAdmin = Boolean(user?.email && superAdmins.includes(user.email));

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
    <div className="p-8 pb-10">
      <Link to={isLearner ? "/app/academy/allplan" : "/app"} className="flex items-center gap-3 group transition-all">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-orange-950/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
          {isLearner ? 'BP' : 'TP'}
        </div>
        <div className="flex flex-col">
          <span className="font-black text-lg tracking-tighter text-white leading-none">{isLearner ? 'BIMPlan Academy' : 'TeklifPro'}</span>
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1">{isLearner ? 'Öğrenci alanı' : 'Intelligence'}</span>
        </div>
      </Link>
    </div>
  );

  const accountBlock = (
    <div className="mt-auto p-6 space-y-4">
      <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-600/5 blur-2xl -mr-10 -mt-10 group-hover:bg-orange-600/10 transition-all"></div>
        <p className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.3em] mb-1">{isLearner ? 'ÖĞRENCİ HESABI' : 'WORKSPACE'}</p>
        <p className="text-xs font-black text-zinc-300 truncate">{company?.name || 'Yükleniyor...'}</p>
      </div>

      <Button
        onClick={logout}
        variant="ghost"
        className="w-full justify-start text-zinc-600 hover:text-red-400 hover:bg-red-500/5 text-[9px] font-black uppercase tracking-widest h-11 gap-3 px-4 rounded-xl transition-all"
      >
        <LogOut size={16} /> ÇIKIŞ YAP
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-orange-600/30">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-transform focus:translate-y-0"
      >
        İçeriğe geç
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-zinc-900 bg-[#0c0c0e]/80 backdrop-blur-xl flex-col h-screen sticky top-0 z-40">
        {brandBlock}
        <NavList items={filteredNavItems} pathname={location.pathname} />
        {accountBlock}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-[#0c0c0e] border-zinc-900 p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Gezinme menüsü</SheetTitle>
          </SheetHeader>
          {brandBlock}
          <NavList items={filteredNavItems} pathname={location.pathname} onNavigate={() => setMobileNavOpen(false)} />
          {accountBlock}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {(user?.impersonatedBy || Boolean(localStorage.getItem('admin_session_backup'))) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-500/40 bg-amber-500/15 px-6 py-2.5 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                Şu anda <strong>{company?.name || 'Müşteri'}</strong> adına impersonate modundasınız
                {user?.readOnly && <span className="ml-2 rounded bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-600/50">SALT-OKUNUR</span>}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exitImpersonation}
              className="border-amber-400/50 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 text-[10px] font-black uppercase tracking-wider h-8 px-3"
            >
              Çıkış Yap / Admin Paneline Dön
            </Button>
          </div>
        )}
        {isLearner && user && !user.emailVerified && <div className="flex flex-col gap-3 border-b border-amber-500/25 bg-amber-500/[0.07] px-6 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between"><p>E-posta adresinizi doğrulayın. Dersleri kullanabilirsiniz; sertifika işlemleri doğrulama tamamlanana kadar kilitlidir.</p><Button type="button" variant="outline" disabled={verificationSent} onClick={async () => { const response = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) }); if (response.ok) setVerificationSent(true); }} className="border-amber-500/30 bg-transparent text-amber-100 hover:bg-amber-500/10">{verificationSent ? 'Bağlantı gönderildi' : 'Doğrulama bağlantısı gönder'}</Button></div>}
        {isDemoMode && <div className="border-b border-orange-500/25 bg-orange-500/[0.06] px-6 py-2 text-center text-[10px] font-black uppercase tracking-widest text-orange-300">Demo modu — geliştirme ortamında otomatik erişim aktif</div>}
        {/* Header */}
        <header className="h-20 border-b border-zinc-900 bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-6">
            <Button
              onClick={() => setMobileNavOpen(true)}
              variant="ghost"
              size="icon"
              className="lg:hidden text-zinc-400 hover:text-white"
              aria-label="Menüyü aç"
            >
              <Menu size={22} />
            </Button>
            <div className="hidden lg:flex items-center gap-6 pr-6 border-r border-zinc-900">
               <div className="flex flex-col items-end">
                 <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">AKTİF KULLANICI</span>
                 <span className="text-xs font-black text-white uppercase tracking-tight">{user?.fullName}</span>
               </div>
               <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-orange-500 text-sm shadow-inner">
                 {user?.fullName?.charAt(0)}
               </div>
            </div>
          </div>

          {!isLearner && <Link to="/app/quotes/new">
            <Button className="bg-white hover:bg-primary text-black hover:text-white text-[10px] font-black uppercase tracking-widest h-11 px-4 sm:px-6 rounded-xl shadow-xl transition-all duration-300 transform active:scale-95">
              <Plus size={18} className="sm:mr-2" />
              <span className="hidden sm:inline">YENİ TEKLİF</span>
            </Button>
          </Link>}
        </header>

        {/* Content Area */}
        <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="px-10 py-5 border-t border-zinc-950 bg-[#0c0c0e] flex items-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">
          <span>© 2026 {isLearner ? 'BIMPlan Academy' : 'TeklifPro AI'}</span>
        </footer>
      </main>
    </div>
  );
}
