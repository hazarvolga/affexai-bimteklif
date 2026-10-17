import React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  icon?: any;
  className?: string;
  backButton?: {
    label: string;
    onClick: () => void;
  };
}

export function PageHeader({
  title,
  description,
  eyebrow = "MİMARİ METRAJ & TEKNİK OFİS PAFTASI",
  actions,
  icon: Icon,
  className,
  backButton
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 mb-8 border-b border-border", className)}>
      <div className="space-y-2">
        <div className="eyebrow">
          <span className="status-dot" />
          <span>{eyebrow}</span>
        </div>
        <div className="flex items-center gap-3">
          {backButton && (
            <button
              onClick={backButton.onClick}
              className="p-2 mr-1 bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              title={backButton.label}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          {Icon && (
            <div className="p-2 bg-primary/10 border border-primary/30 text-primary">
              <Icon size={20} />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl text-foreground font-display-serif">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
