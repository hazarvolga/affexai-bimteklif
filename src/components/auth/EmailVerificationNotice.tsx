import React, { useState } from 'react';
import { toast } from 'sonner';

interface EmailVerificationNoticeProps {
  email: string;
  deliveryPending?: boolean;
}

export function EmailVerificationNotice({ email, deliveryPending = false }: EmailVerificationNoticeProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Doğrulama bağlantısı gönderilemedi.');
        return;
      }
      setSent(true);
    } catch {
      toast.error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" data-testid="email-verification-notice" className="space-y-3 border border-border bg-background p-4 text-sm text-foreground">
      <p className="font-semibold">E-posta adresinizi doğrulayın</p>
      <p className="text-xs text-muted-foreground">
        {deliveryPending
          ? <>Doğrulama e-postası <strong>{email}</strong> adresine gönderilemedi. Aşağıdan yeniden deneyin.</>
          : <>Giriş yapabilmek için <strong>{email}</strong> adresine gönderdiğimiz bağlantıya tıklayın. Bağlantı 24 saat geçerlidir; gelen kutunuzda yoksa istenmeyen e-postaları da kontrol edin.</>}
      </p>
      <button type="button" disabled={sending || sent} onClick={resend} className="text-xs font-semibold text-primary underline underline-offset-2 disabled:opacity-60">
        {sent ? 'Yeni bağlantı gönderildi' : sending ? 'Gönderiliyor…' : 'Doğrulama e-postasını yeniden gönder'}
      </button>
    </div>
  );
}
