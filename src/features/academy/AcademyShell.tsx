import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/** Shared frame for the lean Academy pages: BIMMetraj header, one column, theme tokens only. */
export function AcademyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6" aria-label="Akademi">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="flex shrink-0 items-center gap-2 text-foreground">
              <span className="flex h-8 w-8 items-center justify-center border border-primary bg-primary text-xs font-mono font-bold text-primary-foreground">BM</span>
              <span className="font-display-serif text-xl leading-none tracking-tight">BIMMetraj</span>
            </Link>
            <span className="text-border" aria-hidden="true">/</span>
            <Link to="/academy" className="truncate text-sm font-medium text-muted-foreground hover:text-primary">Akademi</Link>
          </div>
          <ThemeToggle showLabel={false} />
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
