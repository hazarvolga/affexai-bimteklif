import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: "Aktif", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  pending: { label: "İncelemede", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  cancelled: { label: "İptal", className: "bg-destructive/10 text-destructive border-destructive/30" },
  completed: { label: "Tamamlandı", className: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  draft: { label: "Taslak", className: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Gönderildi", className: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  negotiation: { label: "Pazarlık", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  won: { label: "Kazanıldı", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold" },
  lost: { label: "Kaybedildi", className: "bg-destructive/10 text-destructive border-destructive/30" },
  archived: { label: "Arşivlendi", className: "bg-muted/40 text-muted-foreground border-border" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status.toLowerCase()] || { label: status, className: "bg-muted text-muted-foreground border-border" };
  
  return (
    <Badge className={cn(
      "px-2 py-0.5 text-xs font-mono font-medium rounded-xs border shadow-none",
      config.className,
      className
    )}>
      {config.label}
    </Badge>
  );
}
