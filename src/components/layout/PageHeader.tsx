import React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
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
  actions, 
  icon: Icon,
  className,
  backButton
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {backButton && (
            <button 
              onClick={backButton.onClick}
              className="p-2 mr-1 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title={backButton.label}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {Icon && (
            <div className="p-2 bg-orange-600/10 rounded-xl border border-orange-500/20 text-orange-500">
              <Icon size={24} />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-white font-heading">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-zinc-500 text-sm max-w-2xl leading-relaxed">
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
