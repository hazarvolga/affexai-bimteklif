import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  LayoutDashboard, 
  Plus,
  Bell,
  Search,
  BookOpen,
  Target,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

import { navigationConfig } from '@/constants/navigation';

export function Shell() {
  const location = useLocation();
  const { user, company, role, logout } = useAuth();

  const filteredNavItems = navigationConfig.filter(item => 
    !role || item.roles.includes(role)
  );

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-orange-600/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-[#0c0c0e]/80 backdrop-blur-xl flex flex-col h-screen sticky top-0 z-40">
        <div className="p-8 pb-10">
          <Link to="/app" className="flex items-center gap-3 group transition-all">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-orange-950/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              TP
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter text-white leading-none">TeklifPro</span>
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1">Intelligence</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 group",
                  isActive
                    ? "bg-orange-600 text-white shadow-xl shadow-orange-900/20"
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
        </nav>

        <div className="mt-auto p-6 space-y-4">
          <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-600/5 blur-2xl -mr-10 -mt-10 group-hover:bg-orange-600/10 transition-all"></div>
            <p className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.3em] mb-1">WORKSPACE</p>
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-zinc-900 bg-[#09090b]/80 backdrop-blur-md px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">SİSTEM DURUMU</span>
              <div className="flex items-center gap-4 text-[11px] font-black text-white mt-1">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                  USD: 32.42 ₺
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                  EUR: 35.15 ₺
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-6 pr-6 border-r border-zinc-900">
               <div className="flex flex-col items-end">
                 <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">AKTİF KULLANICI</span>
                 <span className="text-xs font-black text-white uppercase tracking-tight">{user?.fullName}</span>
               </div>
               <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-orange-500 text-sm shadow-inner">
                 {user?.fullName?.charAt(0)}
               </div>
            </div>
            
            <Link to="/app/quotes/new">
              <Button className="bg-white hover:bg-orange-600 text-black hover:text-white text-[10px] font-black uppercase tracking-widest h-11 px-6 rounded-xl shadow-xl transition-all duration-300 transform active:scale-95">
                <Plus size={18} className="mr-2" />
                YENİ TEKLİF
              </Button>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
        
        {/* Footer */}
        <footer className="px-10 py-5 border-t border-zinc-950 bg-[#0c0c0e] flex justify-between items-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">
          <div className="flex items-center gap-8">
            <span>© 2024 TeklifPro AI</span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-orange-600"></span>
              SaaS Layer v1.0.4
            </span>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-emerald-500/50">GÜVENLİ BAĞLANTI AKTİF</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
