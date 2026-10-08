import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.error || 'Geçersiz davet bağlantısı.');
        }
        const data = await res.json();
        setInvite(data);
      } catch (error) {
        setInviteError(error instanceof Error ? error.message : 'Davet doğrulanamadı.');
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.requiresSignIn && !fullName) return;

    setSubmitting(true);
    try {
      let authToken: string | undefined;
      if (invite.requiresSignIn) {
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: invite.email, password }),
        });
        if (!loginResponse.ok) throw new Error('Giriş yapılamadı. Mevcut hesap parolanızı kontrol edin.');
        const session = await loginResponse.json();
        authToken = session.token;
      }
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify(invite.requiresSignIn ? {} : { fullName, password }),
      });

      if (res.ok) {
        const acceptedSession = await res.json();
        login(acceptedSession.token, acceptedSession.user, acceptedSession.company, acceptedSession.role, acceptedSession.accountType);
        setIsSuccess(true);
        toast.success("Davet başarıyla kabul edildi!");
      } else {
        const result = await res.json();
        if (result.code === 'INVITATION_SIGN_IN_REQUIRED') setInvite({ ...invite, requiresSignIn: true });
        throw new Error(result.error || 'Davet kabul edilemedi.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={40} />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-zinc-950 to-zinc-950">
        <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-600/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-500" size={24} />
            </div>
            <CardTitle className="text-2xl font-bold text-white tracking-tight">Kayıt Alındı!</CardTitle>
            <CardDescription className="text-zinc-500">
              {invite?.email} için davet kabul edildi. Ek bir e-posta gönderilmedi.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
             <p className="text-sm text-zinc-400 mb-8">
               Davet edildiğiniz şirket için oturumunuz hazır.
             </p>
             <Button 
               className="w-full h-12 bg-zinc-100 text-zinc-950 hover:bg-white font-bold"
               onClick={() => navigate("/app")}
             >
               Şirket paneline git
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteError) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle>Davet kullanılamıyor</CardTitle><CardDescription role="alert">{inviteError}</CardDescription></CardHeader>
        <CardContent><Button onClick={() => navigate('/login')}>Giriş sayfasına dön</Button></CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-zinc-950 to-zinc-950">
      <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-600/10 rounded-full flex items-center justify-center mb-4 border border-orange-500/20">
            <UserPlus className="text-orange-500" size={24} />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">TeklifPro AI'ya Katılın</CardTitle>
          <CardDescription className="text-zinc-500">
            {invite?.email} adresi ile davet edildiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!invite?.requiresSignIn && <div className="space-y-2">
              <Label htmlFor="invite-name" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ad Soyad</Label>
              <Input 
                id="invite-name"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                placeholder="Örn: Ahmet Yılmaz" 
                className="bg-zinc-950 border-zinc-800 text-zinc-200 h-12 focus:border-orange-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>}
            <div className="space-y-2">
              <Label htmlFor="invite-password">{invite?.requiresSignIn ? 'Mevcut hesap parolası' : 'Yeni hesap parolası'}</Label>
              <Input id="invite-password" type="password" required minLength={invite?.requiresSignIn ? undefined : 8} maxLength={128}
                autoComplete={invite?.requiresSignIn ? 'current-password' : 'new-password'} value={password}
                onChange={event => setPassword(event.target.value)} className="bg-zinc-950 border-zinc-800 text-zinc-200 h-12" />
            </div>

            <Button 
              type="submit" 
              disabled={submitting} 
              className="w-full h-12 bg-orange-700 hover:bg-orange-800 text-white font-bold shadow-lg shadow-orange-900/30"
            >
              {submitting ? "Tamamlanıyor..." : invite?.requiresSignIn ? 'Giriş Yap ve Daveti Kabul Et' : 'Daveti Kabul Et ve Başla'}
            </Button>
          </form>
          
          <p className="mt-8 text-center text-xs text-zinc-600">
            Daveti kabul ederek Kullanım Koşullarını ve Gizlilik Politikasını onaylamış olursunuz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
