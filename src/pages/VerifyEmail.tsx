import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

export function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("E-posta adresiniz doğrulanıyor...");

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify-email/${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "E-posta adresiniz başarıyla doğrulandı!");
          toast.success("E-posta doğrulandı!");
        } else {
          setStatus("error");
          setMessage(data.error || "Doğrulama başarısız oldu.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Bir ağ hatası oluştu.");
      }
    }
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-zinc-950 to-zinc-950">
      <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 border transition-all duration-500">
            {status === "loading" && (
              <div className="bg-orange-600/10 border-orange-500/20">
                <Loader2 className="text-orange-500 animate-spin" size={24} />
              </div>
            )}
            {status === "success" && (
              <div className="bg-emerald-600/10 border-emerald-500/20">
                <CheckCircle2 className="text-emerald-500" size={24} />
              </div>
            )}
            {status === "error" && (
              <div className="bg-red-600/10 border-red-500/20">
                <XCircle className="text-red-500" size={24} />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">E-Posta Doğrulama</CardTitle>
          <CardDescription className="text-zinc-500 mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === "success" && (
            <div className="space-y-6">
              <p className="text-sm text-zinc-400">
                Hesabınız doğrulandı. Academy derslerinize güvenle devam edebilirsiniz.
              </p>
              <Button render={<Link to="/login" />} className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-900/30">Giriş Yap ve Başla</Button>
            </div>
          )}
          
          {status === "error" && (
            <div className="space-y-6">
              <p className="text-sm text-zinc-400">
                Bağlantı geçersiz veya süresi dolmuş olabilir. Lütfen yeni bir doğrulama bağlantısı talep edin.
              </p>
              <Button render={<Link to="/" />} variant="outline" className="w-full h-12 border-zinc-800 text-zinc-300 hover:bg-zinc-800">Ana Sayfaya Dön</Button>
            </div>
          )}

          {status === "loading" && (
            <div className="py-4">
              <p className="text-sm text-zinc-500 animate-pulse">Lütfen bekleyin...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
