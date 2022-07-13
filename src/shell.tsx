import { observer, useService } from '@rabjs/react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconMoon, IconSun } from './components/icons';
import { useText } from './i18n/use-text';
import { LocaleService } from './services/locale.service';
import { ThemeService } from './services/theme.service';
import { tools } from './tools/registry';
import './shell.css';

export const Shell = observer(({ children }: { children: ReactNode }) => {
  const theme = useService(ThemeService);
  const locale = useService(LocaleService);
  const t = useText();
  const location = useLocation();
  const tool = tools.find((item) => item.path === location.pathname);

  return (
    <div className="app">
      <header className="top">
        <Link to="/" className="logo">
          <span className="logo-mark" aria-hidden="true" />
          Ximage
        </Link>
        {tool ? (
          <nav className="crumbs" aria-label={t('shell.allTools')}>
            <Link to="/">{t('shell.allTools')}</Link>
            <span className="sep">/</span>
            <span className="here">{t(`tools.${tool.id}.title`)}</span>
          </nav>
        ) : null}
        <div className="top-actions">
          <div className="lang-seg" role="group" aria-label={t('shell.language')}>
            <button
              type="button"
              data-testid="locale-zh"
              aria-pressed={locale.locale === 'zh'}
              onClick={() => locale.setLocale('zh')}
            >
              中文
            </button>
            <button
              type="button"
              data-testid="locale-en"
              aria-pressed={locale.locale === 'en'}
              onClick={() => locale.setLocale('en')}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            className="icon-btn"
            data-testid="theme-toggle"
            aria-pressed={theme.theme === 'dark'}
            aria-label={theme.theme === 'dark' ? t('shell.themeLight') : t('shell.themeDark')}
            onClick={() => theme.toggle()}
          >
            {theme.theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
});
