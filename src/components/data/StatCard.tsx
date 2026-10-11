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
  orange: "text-primary bg-primary/10 border-primary/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  blue: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  zinc: "text-muted-foreground bg-muted border-border",
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
    <Card className={cn("border border-border bg-card shadow-xs rounded-sm hover:border-border/80 transition-colors group", className)}>
      <CardContent className="p-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2 rounded-xs border", colorMap[color])}>
            <Icon size={18} />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-mono font-semibold tracking-wide",
              isPositive ? "text-emerald-400" : "text-destructive"
            )}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {trend}
            </div>
          )}
        </div>
        <div className="space-y-0.5">
          <h3 className="text-2xl font-bold text-foreground font-mono tracking-tight tabular-nums">{value}</h3>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{title}</p>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground/80 mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
