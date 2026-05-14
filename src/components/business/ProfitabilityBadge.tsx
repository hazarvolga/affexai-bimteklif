import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

interface ProfitabilityBadgeProps {
  margin: number;
  className?: string;
}

export function ProfitabilityBadge({ margin, className }: ProfitabilityBadgeProps) {
  const isHealthy = margin >= 20;
  const isCritical = margin < 10;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-black tracking-tight",
      isHealthy ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
      isCritical ? "bg-red-500/10 text-red-500 border-red-500/20" :
      "bg-amber-500/10 text-amber-500 border-amber-500/20",
      className
    )}>
      <Target size={14} />
      <span>%{margin} MARJ</span>
      {isHealthy ? <TrendingUp size={12} /> : isCritical ? <TrendingDown size={12} /> : null}
    </div>
  );
}
