import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFound() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Sayfa Bulunamadı (404) | BIMMetraj';
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const prevRobots = robotsMeta?.content;
    const created = !robotsMeta;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = 'noindex, nofollow';

    return () => {
      document.title = prevTitle;
      if (created && robotsMeta?.parentNode) {
        robotsMeta.parentNode.removeChild(robotsMeta);
      } else if (robotsMeta && prevRobots !== undefined) {
        robotsMeta.content = prevRobots;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5 pafta-card p-8 rounded-2xl">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto">
          <Compass className="text-primary" size={24} />
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-primary mb-1">HTTP 404</div>
          <h1 className="text-lg font-bold text-foreground uppercase tracking-widest">Sayfa bulunamadı</h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Aradığınız pafta veya adres taşınmış ya da hiç var olmamış olabilir.
          </p>
        </div>
        <Link to="/">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest h-11 px-6">
            Ana Sayfaya Dön
          </Button>
        </Link>
      </div>
    </div>
  );
}
