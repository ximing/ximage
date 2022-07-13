import { register, resolve } from '@rabjs/react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import './i18n';
import App from './app';
import { LocaleService, type LocaleName } from './services/locale.service';
import { ThemeService, type ThemeName } from './services/theme.service';
import './styles/tokens.css';
import './styles/file-notice.css';

register(ThemeService);
register(LocaleService);

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

const locale = resolve(LocaleService);
try {
  const saved = localStorage.getItem('ximage-locale');
  const initial: LocaleName = saved === 'en' || saved === 'zh' ? saved : 'zh';
  locale.setLocale(initial);
} catch {
  locale.persist();
}

createRoot(document.getElementById('root')!).render(<App />);
