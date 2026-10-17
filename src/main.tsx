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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
