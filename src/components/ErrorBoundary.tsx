import { Component, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="text-orange-500" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-foreground uppercase tracking-widest">Bir sorun oluştu</h1>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Sayfa yüklenemedi. Bu genellikle yeni bir sürüm yayınlandığında olur — sayfayı yenilemek sorunu çözer.</p>
            </div>
            <Button onClick={() => window.location.reload()} className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-11 px-6 gap-2">
              <RefreshCw size={14} /> Sayfayı Yenile
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
