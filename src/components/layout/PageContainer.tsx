import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

const maxWidthMap = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1400px]",
  full: "max-w-full",
};

export function PageContainer({ 
  children, 
  className, 
  maxWidth = "xl" 
}: PageContainerProps) {
  return (
    <div className={cn(
      "w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500",
      maxWidthMap[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}
