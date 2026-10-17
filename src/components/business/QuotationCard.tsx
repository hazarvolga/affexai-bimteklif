import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, MoreVertical, Calendar, User, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { ProfitabilityBadge } from "./ProfitabilityBadge";
import { cn } from "@/lib/utils";

interface QuotationCardProps {
  quote: {
    id: string;
    title: string;
    clientName: string;
    totalAmount: number;
    status: string;
    profitMargin: number;
    createdAt: string;
  };
  onClick?: () => void;
  className?: string;
}

export function QuotationCard({ quote, onClick, className }: QuotationCardProps) {
  return (
    <Card 
      className={cn("bg-card border-border hover:bg-zinc-900/50 transition-all cursor-pointer group shadow-none", className)}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center border border-orange-500/20 text-orange-500">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground group-hover:text-orange-500 transition-colors uppercase tracking-tight">
                {quote.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                <User size={10} /> {quote.clientName}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreVertical size={16} />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
           <div className="space-y-1">
             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Toplam Tutar</p>
             <div className="flex items-center gap-1">
               <span className="text-lg font-black text-foreground font-mono">
                 {quote.totalAmount.toLocaleString()}
               </span>
               <span className="text-[10px] text-muted-foreground font-black">TRY</span>
             </div>
           </div>
           <ProfitabilityBadge margin={quote.profitMargin} />
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
           <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
             <Calendar size={12} />
             {new Date(quote.createdAt).toLocaleDateString('tr-TR')}
           </div>
           <StatusBadge status={quote.status} />
        </div>
      </CardContent>
    </Card>
  );
}
