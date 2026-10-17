import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaftaTheme = 'light' | 'dark';

const THEME_EVENT = 'bimmetraj:theme-change';

export function getActiveTheme(): PaftaTheme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyPaftaTheme(next: PaftaTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = next;
  document.documentElement.classList.toggle('dark', next === 'dark');
  try {
    localStorage.setItem('theme', next);
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
}

export function ThemeToggle({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [theme, setTheme] = useState<PaftaTheme>(() => getActiveTheme());

  useEffect(() => {
    setTheme(getActiveTheme());
    const handler = () => setTheme(getActiveTheme());
    window.addEventListener(THEME_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(THEME_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => applyPaftaTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Açık Pafta Moduna Geç (#f3f1e9)' : 'Gece Paftası Moduna Geç (#1e2623)'}
      aria-label={isDark ? 'Açık Pafta Moduna Geç' : 'Gece Paftası Moduna Geç'}
      className={cn(
        'inline-flex items-center gap-2 border border-border bg-background px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary',
        className,
      )}
    >
      {isDark ? <Sun className="h-3.5 w-3.5 text-primary" /> : <Moon className="h-3.5 w-3.5 text-primary" />}
      {showLabel && <span>{isDark ? 'AÇIK PAFTA' : 'GECE PAFTASI'}</span>}
    </button>
  );
}
