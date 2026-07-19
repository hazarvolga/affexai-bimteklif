import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock, Loader2, User, Building2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPilot = searchParams.get('intent') === 'pilot';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, companyName })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user, data.company, 'owner');
        navigate('/app');
      } else {
        toast.error(data.error || "Kayıt başarısız.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 blur-[100px] -mr-48 -mt-48 pointer-events-none"></div>
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="flex h-9 w-9 items-center justify-center rounded bg-orange-600 text-sm font-bold text-white">BP</span>
            <span className="text-2xl font-semibold tracking-tight text-white">BIMPlan Academy</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{isPilot ? 'Pilot hesabınızı oluşturun' : 'Yeni hesap oluşturun'}</h1>
          <p className="mt-2 text-sm text-zinc-500">{isPilot ? 'TeklifPro pilot akışına kontrollü bir başlangıç yapın.' : 'TeklifPro çalışma alanınızı oluşturun.'}</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
          <CardContent className="pt-8 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tam Adınız</label>
                <div className="relative group">
                   <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={16} />
                   <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-12 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                    placeholder="Ad Soyad"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Şİrket Adı</label>
                <div className="relative group">
                   <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={16} />
                   <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-12 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                    placeholder="Şirketiniz"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Adresİ</label>
                <div className="relative group">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={16} />
                   <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-12 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                    placeholder="email@teklifpro.ai"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Şİfre</label>
                <div className="relative group">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={16} />
                   <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-12 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                    placeholder="••••••••"
                   />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-white font-black uppercase tracking-widest text-xs gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>{isPilot ? 'PİLOT HESABI OLUŞTUR' : 'KAYDOL'} <ArrowRight size={18} /></>}
              </Button>
            </form>
            
            <div className="pt-4 text-center">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Zaten hesabınız var mı? <Link to="/login" className="text-orange-500 hover:underline">Oturum Açın</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
