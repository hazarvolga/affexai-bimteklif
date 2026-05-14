import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
  icon: any;
  description?: string;
  className?: string;
  color?: "orange" | "emerald" | "blue" | "zinc";
}

const colorMap = {
  orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  zinc: "text-zinc-400 bg-zinc-800 border-zinc-700",
};

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  trend, 
  isPositive, 
  icon: Icon, 
  description,
  className,
  color = "orange"
}) => {
  return (
    <Card className={cn("bg-zinc-900/30 border-zinc-800 shadow-none hover:bg-zinc-900/50 transition-colors group", className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-xl border transition-transform group-hover:scale-110 duration-300", colorMap[color])}>
            <Icon size={22} />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-black tracking-widest uppercase",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {trend}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-white font-mono tracking-tight">{value}</h3>
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{title}</p>
        </div>
        {description && (
          <p className="text-[10px] text-zinc-600 mt-2 italic">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
