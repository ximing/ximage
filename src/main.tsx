import { register, resolve } from '@rabjs/react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import App from './app';
import { ThemeService, type ThemeName } from './services/theme.service';
import './styles.css';

register(ThemeService);

const theme = resolve(ThemeService);
try {
  const saved = localStorage.getItem('ximage-theme');
  const initial: ThemeName =
    saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  theme.setTheme(initial);
} catch {
  theme.persist();
}

createRoot(document.getElementById('root')!).render(<App />);
