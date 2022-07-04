import { Service } from '@rabjs/react';

export type ThemeName = 'light' | 'dark';

export class ThemeService extends Service {
  theme: ThemeName = 'light';

  setTheme(theme: ThemeName) {
    this.theme = theme;
    this.persist();
  }

  toggle() {
    this.setTheme(this.theme === 'light' ? 'dark' : 'light');
  }

  persist() {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = this.theme;
    }
    try {
      localStorage.setItem('ximage-theme', this.theme);
    } catch {
      // Storage is unavailable in private mode and in node tests.
    }
  }
}
