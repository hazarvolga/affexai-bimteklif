import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, UserPlus, Loader2 } from "lucide-react";

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (!res.ok) {
          throw new Error("Geçersiz davet bağlantısı.");
        }
        const data = await res.json();
        setInvite(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Davet doğrulanamadı.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });

      if (res.ok) {
        setIsSuccess(true);
        toast.success("Davet başarıyla kabul edildi!");
      } else {
        toast.error("Davet kabul edilemedi.");
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
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
              {invite?.email} adresine bir doğrulama bağlantısı gönderildi. Lütfen gelen kutunuzu (ve gereksiz kutusunu) kontrol edin.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
             <p className="text-sm text-zinc-400 mb-8">
               E-posta adresinizi doğruladıktan sonra panele giriş yapabileceksiniz.
             </p>
             <Button 
               className="w-full h-12 bg-zinc-100 text-zinc-950 hover:bg-white font-bold"
               onClick={() => navigate("/")}
             >
               Giriş Sayfasına Dön
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-zinc-950 to-zinc-950">
      <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-600/10 rounded-full flex items-center justify-center mb-4 border border-orange-500/20">
            <UserPlus className="text-orange-500" size={24} />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">TeklifPro AI'ya Katılın</CardTitle>
          <CardDescription className="text-zinc-500">
            {invite?.email} adresi ile davet edildiniz. Lütfen kaydınızı tamamlayın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ad Soyad</Label>
              <Input 
                required
                placeholder="Örn: Ahmet Yılmaz" 
                className="bg-zinc-950 border-zinc-800 text-zinc-200 h-12 focus:border-orange-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              disabled={submitting} 
              className="w-full h-12 bg-orange-700 hover:bg-orange-800 text-white font-bold shadow-lg shadow-orange-900/30"
            >
              {submitting ? "Tamamlanıyor..." : "Daveti Kabul Et ve Başla"}
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
