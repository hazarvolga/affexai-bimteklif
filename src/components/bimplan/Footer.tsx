import { ViewType } from '../../types';

interface FooterProps {
  setView: (view: ViewType) => void;
}

export default function Footer({ setView }: FooterProps) {
  const handleNavClick = (view: ViewType) => {
    setView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 text-white pt-20 pb-12 border-t border-slate-800" id="footer">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div 
              onClick={() => handleNavClick('home')} 
              className="flex items-center gap-2 mb-6 cursor-pointer select-none group"
            >
              <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white font-black group-hover:bg-white group-hover:text-slate-900 transition-colors">
                B
              </div>
              <span className="text-lg font-black tracking-tighter">
                BIM<span className="text-orange-500">MASTER</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm mb-6">
              Sektörel dijitalleşme, ISO 19650 uyumlu bilgi yönetimi ve kamu mevzuatı entegrasyonu için Türkiye'nin en kapsamlı teknik referans portalı.
            </p>
          </div>

          <div>
            <h5 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2">
              Standartlar
            </h5>
            <ul className="text-xs space-y-3.5 text-slate-400 font-medium">
              <li>
                <button onClick={() => handleNavClick('standartlar')} className="hover:text-orange-500 transition-colors text-left">
                  ISO 19650-1 & 19650-2
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('standartlar')} className="hover:text-orange-500 transition-colors text-left">
                  IFC 4.3 Açık Veri Yapısı
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('standartlar')} className="hover:text-orange-500 transition-colors text-left">
                  BS 1192:2007 Protokolleri
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('standartlar')} className="hover:text-orange-500 transition-colors text-left">
                  COBie v2.4 Veri Teslimi
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2">
              Dokümanlar
            </h5>
            <ul className="text-xs space-y-3.5 text-slate-400 font-medium">
              <li>
                <button onClick={() => handleNavClick('dokumanlar')} className="hover:text-orange-500 transition-colors text-left">
                  EIR (Bilgi Teslim Şablonu)
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('dokumanlar')} className="hover:text-orange-500 transition-colors text-left">
                  BEP (BIM Uygulama Planı)
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('dokumanlar')} className="hover:text-orange-500 transition-colors text-left">
                  LOD (Gelişim Seviyeleri)
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('dokumanlar')} className="hover:text-orange-500 transition-colors text-left">
                  5D Metraj & Maliyet Rehberi
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('sozluk')} className="text-orange-500 font-bold hover:text-orange-400 transition-colors text-left flex items-center gap-1">
                  BIM Terimler Sözlüğü →
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('gap')} className="text-orange-500 font-bold hover:text-orange-400 transition-colors text-left flex items-center gap-1">
                  BIM Gap Analiz Raporu →
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('dashboard')} className="text-orange-500 font-bold hover:text-orange-400 transition-colors text-left flex items-center gap-1">
                  BIM Verimlilik & ROI Dashboard →
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2">
              Kurumsal & Mevzuat
            </h5>
            <ul className="text-xs space-y-3.5 text-slate-400 font-medium">
              <li>
                <button onClick={() => handleNavClick('mevzuat')} className="hover:text-orange-500 transition-colors text-left">
                  Çevre, Şehircilik Bakanlığı Mevzuatı
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('mevzuat')} className="hover:text-orange-500 transition-colors text-left">
                  e-PYS Entegrasyonu Prosedürleri
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('mevzuat')} className="hover:text-orange-500 transition-colors text-left">
                  Kamu İhale Kanunu (4734) BIM Normları
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('mevzuat')} className="hover:text-orange-500 transition-colors text-left">
                  Bakanlık Poz & Metraj Entegrasyonu
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-bold tracking-wider">
          <span>© 2026 BIM MASTER TEKNİK PORTAL - TÜM HAKLARI SAKLIDIR.</span>
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              ISO 19650 COMPLIANT
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              T.C. ÇŞIDB UYUMLU
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
