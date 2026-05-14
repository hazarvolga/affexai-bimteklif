import React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: any;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon: Icon = Search, 
  title, 
  description, 
  actionText, 
  onAction 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 text-center animate-in fade-in zoom-in duration-300">
      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 text-zinc-500">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm max-w-sm mb-8 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button 
          onClick={onAction}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-6"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}
