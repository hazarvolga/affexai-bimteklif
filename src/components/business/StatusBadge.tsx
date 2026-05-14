import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: "AKTİF", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  pending: { label: "BEKLEMEDE", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  cancelled: { label: "İPTAL", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  completed: { label: "TAMAMLANDI", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  draft: { label: "TASLAK", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  sent: { label: "GÖNDERİLDİ", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  negotiation: { label: "PAZARLIK", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  won: { label: "KAZANILDI", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  lost: { label: "KAYBEDİLDİ", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  archived: { label: "ARŞİVLENDİ", className: "bg-zinc-900 text-zinc-600 border-zinc-800" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status.toLowerCase()] || { label: status.toUpperCase(), className: "bg-zinc-800 text-zinc-400" };
  
  return (
    <Badge className={cn(
      "px-2 py-0.5 text-[10px] font-black tracking-widest border shadow-none",
      config.className,
      className
    )}>
      {config.label}
    </Badge>
  );
}
