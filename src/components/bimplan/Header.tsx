import { useState } from 'react';
import { Layers, Menu, X, Award, FileText, ChevronRight, BookOpen, HelpCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import { ViewType } from '../../types';

interface HeaderProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
}

export default function Header({ currentView, setView }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems: { label: string; view: ViewType; icon: any }[] = [
    { label: 'Ana Sayfa', view: 'home', icon: Layers },
    { label: 'Standartlar Rehberi', view: 'standartlar', icon: Award },
    { label: 'Teknik Dokümanlar', view: 'dokumanlar', icon: FileText },
    { label: 'Kurumsal & Mevzuat', view: 'mevzuat', icon: BookOpen },
    { label: 'Terimler Sözlüğü', view: 'sozluk', icon: HelpCircle },
    { label: 'GAP Analizi', view: 'gap', icon: AlertTriangle },
    { label: 'Verimlilik & ROI', view: 'dashboard', icon: BarChart2 },
  ];

  const handleNavClick = (view: ViewType) => {
    setView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed w-full top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div 
          onClick={() => handleNavClick('home')} 
          className="flex items-center gap-3 cursor-pointer group select-none"
          id="nav-logo"
        >
          <div className="w-9 h-9 bg-card rounded-lg flex items-center justify-center text-foreground font-black group-hover:bg-orange-600 transition-colors duration-300 shadow-md shadow-slate-200">
            B
          </div>
          <span className="text-xl font-extrabold tracking-tighter text-foreground">
            BIM<span className="text-orange-600 font-black tracking-tight transition-colors duration-300 group-hover:text-foreground">MASTER</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-1">
          {navigationItems.map((item) => {
            const isActive = currentView === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  isActive 
                    ? 'text-orange-600 bg-orange-50/70 border border-orange-100' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
                }`}
                id={`nav-item-${item.view}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-600' : 'text-muted-foreground'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="hidden lg:block">
          <button 
            onClick={() => handleNavClick('dokumanlar')}
            className="bg-card hover:bg-orange-600 text-foreground px-5 py-2.5 rounded-lg text-[11px] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            id="nav-cta"
          >
            PORTAL GİRİŞİ
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-card transition-colors"
            aria-label="Menüyü Aç/Kapat"
            id="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-border shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="px-6 py-6 space-y-3">
            {navigationItems.map((item) => {
              const isActive = currentView === item.view;
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={`flex items-center justify-between w-full p-3.5 rounded-xl text-sm font-bold tracking-tight transition-all ${
                    isActive 
                      ? 'text-orange-600 bg-orange-50/70 border border-orange-100' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
                  }`}
                  id={`mobile-nav-item-${item.view}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-muted-foreground'}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 opacity-50 ${isActive ? 'text-orange-600' : 'text-muted-foreground'}`} />
                </button>
              );
            })}
            
            <div className="pt-4 border-t border-border">
              <button 
                onClick={() => handleNavClick('dokumanlar')}
                className="w-full bg-card text-foreground p-3.5 rounded-xl text-center text-xs font-bold tracking-widest uppercase hover:bg-orange-600 transition-colors duration-300"
              >
                PORTAL GİRİŞİ
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
