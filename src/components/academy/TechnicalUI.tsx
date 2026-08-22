import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TechnicalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const TechnicalButton: React.FC<TechnicalButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const baseStyles = "tech-label flex items-center justify-center gap-2 transition-all active:inset-shadow disabled:opacity-50 disabled:cursor-not-allowed border-radius-[2px]";
  
  const variants = {
    primary: "bg-tech-blue text-white hover:bg-tech-blue/90 border-none",
    secondary: "bg-graphite-700 text-graphite-200 border border-graphite-500 hover:bg-graphite-600",
    danger: "bg-signal-red text-white hover:bg-signal-red/90 border-none",
    ghost: "bg-transparent text-graphite-400 hover:text-graphite-50 border-none",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[9px]",
    md: "px-4 py-2 text-[10px]",
    lg: "px-6 py-3 text-[11px]",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={14} strokeWidth={2.5} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={14} strokeWidth={2.5} />}
    </button>
  );
};

interface TechnicalBadgeProps {
  status: string;
  label?: string;
  children?: React.ReactNode;
}

export const TechnicalBadge: React.FC<TechnicalBadgeProps> = ({ status, label, children }) => {
  const configs: Record<string, { color: string; bg: string; border: string; dot: string; text: string }> = {
    completed: { color: 'text-signal-green', bg: 'bg-signal-green/10', border: 'border-signal-green/30', dot: 'bg-signal-green', text: 'COMPLETED' },
    complete: { color: 'text-signal-green', bg: 'bg-signal-green/10', border: 'border-signal-green/30', dot: 'bg-signal-green', text: 'COMPLETED' },
    'in-progress': { color: 'text-tech-blue', bg: 'bg-tech-blue/10', border: 'border-tech-blue/30', dot: 'bg-tech-blue', text: 'IN PROGRESS' },
    locked: { color: 'text-graphite-400', bg: 'bg-graphite-400/10', border: 'border-graphite-400/30', dot: 'bg-graphite-400', text: 'LOCKED' },
    beginner: { color: 'text-graphite-200', bg: 'bg-graphite-200/10', border: 'border-graphite-200/30', dot: 'bg-graphite-200', text: 'BEGINNER' },
    professional: { color: 'text-signal-orange', bg: 'bg-signal-orange/10', border: 'border-signal-orange/30', dot: 'bg-signal-orange', text: 'PROFESSIONAL' },
    specialist: { color: 'text-tech-blue', bg: 'bg-tech-blue/10', border: 'border-tech-blue/30', dot: 'bg-tech-blue', text: 'SPECIALIST' },
    warning: { color: 'text-signal-yellow', bg: 'bg-signal-yellow/10', border: 'border-signal-yellow/30', dot: 'bg-signal-yellow', text: 'WARNING' },
    error: { color: 'text-signal-red', bg: 'bg-signal-red/10', border: 'border-signal-red/30', dot: 'bg-signal-red', text: 'ERROR' },
  };

  const config = configs[status] || configs['completed'];

  return (
    <div className={`tech-label inline-flex items-center gap-1.5 px-2 py-0.5 border ${config.border} ${config.bg} ${config.color} rounded-[1px]`}>
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {children || label || config.text}
    </div>
  );
};

interface TechnicalProgressBarProps {
  progress: number; // 0 to 100
  status?: 'default' | 'complete' | 'warning';
  height?: number;
}

export const TechnicalProgressBar: React.FC<TechnicalProgressBarProps> = ({ progress, status = 'default', height = 4 }) => {
  const colors = {
    default: "bg-tech-blue",
    complete: "bg-signal-green",
    warning: "bg-signal-orange",
  };

  return (
    <div className="w-full bg-graphite-800 border border-graphite-600/30 rounded-[1px] overflow-hidden" style={{ height }}>
      <div 
        className={`h-full transition-all duration-500 ${colors[status]}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export const TechnicalPanel: React.FC<{
  children: React.ReactNode;
  id?: string;
  title?: string;
  header?: string;
  headerRight?: React.ReactNode;
  accentColor?: string;
  className?: string;
}> = ({ children, id, title, header, headerRight, accentColor, className = '' }) => {
  const displayTitle = title || header;
  return (
    <div id={id} className={`bg-graphite-900 border border-graphite-800 shadow-lg relative rounded-[1px] ${className}`}>
      {accentColor && <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: accentColor }} />}
      {displayTitle && (
        <div className="bg-graphite-850 px-4 py-2 border-b border-graphite-800 flex items-center justify-between">
          <h3 className="tech-label text-graphite-100 font-bold uppercase tracking-wider text-[11px]">{displayTitle}</h3>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div>
        {children}
      </div>
    </div>
  );
};
