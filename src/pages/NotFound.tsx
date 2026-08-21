import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center mx-auto">
          <Compass className="text-orange-500" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-black text-white uppercase tracking-widest">Sayfa bulunamadı</h1>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">Aradığınız adres taşınmış veya hiç var olmamış olabilir.</p>
        </div>
        <Link to="/">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest h-11 px-6">
            Ana Sayfaya Dön
          </Button>
        </Link>
      </div>
    </div>
  );
}
