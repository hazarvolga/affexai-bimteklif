import React from "react";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function SectionWrapper({ 
  title, 
  description, 
  children, 
  className,
  actions 
}: SectionWrapperProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description || actions) && (
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="space-y-0.5">
            {title && (
              <h2 className="text-sm font-black text-zinc-200 uppercase tracking-widest">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-zinc-500 font-medium">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className="mt-2">
        {children}
      </div>
    </section>
  );
}
