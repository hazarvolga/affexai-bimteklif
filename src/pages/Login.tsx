import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Currency } from '@/types';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedNext = searchParams.get('next');
  const nextPath = requestedNext?.startsWith('/app/') ? requestedNext : '/app';


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        login(data.token, data.user, data.company, data.role, data.accountType);
        const finalPath = data.user.isSuperAdmin ? '/admin' : (data.accountType === 'academy_learner' && nextPath === '/app' ? '/app/academy/allplan' : nextPath);
        navigate(finalPath);
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'E-posta veya şifre hatalı.');
      }
    } catch (e) {
      toast.error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 blur-[100px] -mr-48 -mt-48 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 blur-[100px] -ml-48 -mb-48 pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Zap className="text-orange-500" size={32} fill="currentColor" />
            <span className="text-2xl font-black text-white tracking-tighter">TEKLIFPRO <span className="text-orange-500">AI</span></span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Tekrar Merhaba</h1>
          <p className="text-zinc-400 mt-2 text-sm">Hesabınıza giriş yaparak projelerinizi yönetin</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
          <CardContent className="pt-8 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 ml-1">E-posta Adresi</label>
                <div className="relative group">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={16} />
                   <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-12 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                    placeholder="ornek@sirketiniz.com"
                    required
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 ml-1">Şifre</label>
                <div className="relative group">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={16} />
                   <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-12 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                    placeholder="••••••••"
                    required
                   />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-white font-bold tracking-wide text-sm gap-2 shadow-lg shadow-orange-600/20"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Giriş Yap <ArrowRight size={18} /></>}
              </Button>
            </form>
            
            <div className="pt-4 text-center">
              <Link to="/forgot-password" className="mb-3 block text-xs text-zinc-400 hover:text-orange-400">Şifrenizi mi unuttunuz?</Link>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Hesabınız yok mu? <Link to="/register" className="text-orange-500 hover:underline">Kaydolun</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
