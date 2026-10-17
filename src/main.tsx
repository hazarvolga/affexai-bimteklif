import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  const savedTheme = localStorage.getItem('theme');
  const resolvedTheme = savedTheme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
} catch {
  // Ignore storage access errors in restricted frames
}

if (typeof document !== 'undefined' && !document.getElementById('pafta-google-fonts')) {
  const link = document.createElement('link');
  link.id = 'pafta-google-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
