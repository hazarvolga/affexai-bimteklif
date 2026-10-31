import React from "react";

export function resolveContactEmail(companyEmail: string | null | undefined, loginEmail: string | null | undefined): string {
  return companyEmail || loginEmail || "";
}

interface AccountSummaryProps {
  fullName: string;
  email: string;
}

export function AccountSummary({ fullName, email }: AccountSummaryProps) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
      <div className="space-y-2">
        <dt className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ad Soyad</dt>
        <dd className="font-bold text-foreground">{fullName}</dd>
      </div>
      <div className="space-y-2">
        <dt className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Giriş E-postası</dt>
        <dd className="font-bold text-foreground break-all">{email}</dd>
      </div>
    </dl>
  );
}
